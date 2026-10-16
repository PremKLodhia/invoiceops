package com.invoiceops.extraction;

import com.invoiceops.document.DocumentStorageService;
import com.invoiceops.invoice.ExtractionField;
import com.invoiceops.invoice.Invoice;
import com.invoiceops.invoice.InvoiceLineItem;
import com.invoiceops.invoice.InvoiceStatus;
import com.invoiceops.supplier.Supplier;
import com.invoiceops.supplier.SupplierRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
public class ExtractionPipeline {

    private static final Logger log = LoggerFactory.getLogger(ExtractionPipeline.class);

    private final DocumentStorageService documentStorageService;
    private final PdfBoxTextExtractor pdfBoxTextExtractor;
    private final TesseractOcrExtractor tesseractOcrExtractor;
    private final DeterministicInvoiceParser deterministicInvoiceParser;
    private final InvoiceValidationEngine validationEngine;
    private final SupplierRepository supplierRepository;
    private final OllamaExtractionAdapter ollamaAdapter;

    public ExtractionPipeline(
            DocumentStorageService documentStorageService,
            PdfBoxTextExtractor pdfBoxTextExtractor,
            TesseractOcrExtractor tesseractOcrExtractor,
            DeterministicInvoiceParser deterministicInvoiceParser,
            InvoiceValidationEngine validationEngine,
            SupplierRepository supplierRepository,
            OllamaExtractionAdapter ollamaAdapter) {
        this.documentStorageService = documentStorageService;
        this.pdfBoxTextExtractor = pdfBoxTextExtractor;
        this.tesseractOcrExtractor = tesseractOcrExtractor;
        this.deterministicInvoiceParser = deterministicInvoiceParser;
        this.validationEngine = validationEngine;
        this.supplierRepository = supplierRepository;
        this.ollamaAdapter = ollamaAdapter;
    }

    public void processInvoice(Invoice invoice) {
        invoice.setStatus(InvoiceStatus.PROCESSING);

        try {
            byte[] fileBytes = documentStorageService.loadDocumentBytes(invoice.getStoredFilename());
            String rawText = "";
            ExtractionMethod methodUsed = ExtractionMethod.PDFBOX;

            if ("application/pdf".equalsIgnoreCase(invoice.getContentType())) {
                rawText = pdfBoxTextExtractor.extractText(fileBytes);
                methodUsed = ExtractionMethod.PDFBOX;
            } else if (invoice.getContentType() != null && invoice.getContentType().startsWith("image/")) {
                rawText = tesseractOcrExtractor.extractTextFromImage(fileBytes);
                methodUsed = ExtractionMethod.TESSERACT_OCR;
            }

            List<Supplier> orgSuppliers = supplierRepository.findByOrganisationId(invoice.getOrganisationId());

            ParsedInvoiceData parsedData = null;
            if (ollamaAdapter.isAvailable()) {
                parsedData = ollamaAdapter.extractWithAi(rawText);
                if (parsedData != null) {
                    methodUsed = ExtractionMethod.OLLAMA_AI;
                }
            }

            if (parsedData == null) {
                parsedData = deterministicInvoiceParser.parse(rawText, orgSuppliers);
            }

            applyParsedDataToInvoice(invoice, parsedData, orgSuppliers, methodUsed);

            // Execute automated financial and matching validations
            validationEngine.validate(invoice);

            // Transition status
            if (invoice.getInvoiceNumber() == null && invoice.getGrossAmount() == null && rawText.isBlank()) {
                invoice.setStatus(InvoiceStatus.EXTRACTION_FAILED);
            } else {
                invoice.setStatus(InvoiceStatus.NEEDS_REVIEW);
            }

            invoice.setExtractionCompletedAt(Instant.now());
            invoice.setExtractionMethod(methodUsed);

        } catch (Exception e) {
            log.error("Extraction failed for invoice id={}", invoice.getId(), e);
            invoice.setStatus(InvoiceStatus.EXTRACTION_FAILED);
            invoice.setExtractionCompletedAt(Instant.now());
        }
    }

    private void applyParsedDataToInvoice(Invoice invoice, ParsedInvoiceData data,
                                         List<Supplier> orgSuppliers, ExtractionMethod method) {
        FieldSource source = switch (method) {
            case TESSERACT_OCR -> FieldSource.OCR;
            case OLLAMA_AI -> FieldSource.AI;
            default -> FieldSource.EXTRACTED;
        };

        // Supplier
        if (data.supplierName() != null) {
            invoice.setSupplierNameExtracted(data.supplierName());
            Optional<Supplier> matchedSupplier = orgSuppliers.stream()
                    .filter(s -> s.getName().equalsIgnoreCase(data.supplierName()))
                    .findFirst();
            matchedSupplier.ifPresent(invoice::setSupplier);

            invoice.addExtractionField(new ExtractionField(
                    "supplierName", data.supplierName(), data.supplierConfidence(), source));
        }

        // Invoice Number
        if (data.invoiceNumber() != null) {
            invoice.setInvoiceNumber(data.invoiceNumber());
            invoice.addExtractionField(new ExtractionField(
                    "invoiceNumber", data.invoiceNumber(), data.invoiceNumberConfidence(), source));
        }

        // Dates
        if (data.invoiceDate() != null) {
            invoice.setInvoiceDate(data.invoiceDate());
            invoice.addExtractionField(new ExtractionField(
                    "invoiceDate", data.invoiceDate().toString(), data.invoiceDateConfidence(), source));
        }

        if (data.dueDate() != null) {
            invoice.setDueDate(data.dueDate());
            invoice.addExtractionField(new ExtractionField(
                    "dueDate", data.dueDate().toString(), data.dueDateConfidence(), source));
        }

        // Currency
        if (data.currency() != null) {
            invoice.setCurrency(data.currency());
            invoice.addExtractionField(new ExtractionField(
                    "currency", data.currency(), data.currencyConfidence(), source));
        }

        // Amounts
        if (data.netAmount() != null) {
            invoice.setNetAmount(data.netAmount());
            invoice.addExtractionField(new ExtractionField(
                    "netAmount", data.netAmount().toPlainString(), data.netAmountConfidence(), source));
        }

        if (data.taxAmount() != null) {
            invoice.setTaxAmount(data.taxAmount());
            invoice.addExtractionField(new ExtractionField(
                    "taxAmount", data.taxAmount().toPlainString(), data.taxAmountConfidence(), source));
        }

        if (data.taxRate() != null) {
            invoice.setTaxRate(data.taxRate());
            invoice.addExtractionField(new ExtractionField(
                    "taxRate", data.taxRate().toPlainString(), ConfidenceLevel.HIGH, source));
        }

        if (data.grossAmount() != null) {
            invoice.setGrossAmount(data.grossAmount());
            invoice.addExtractionField(new ExtractionField(
                    "grossAmount", data.grossAmount().toPlainString(), data.grossAmountConfidence(), source));
        }

        // PO Reference
        if (data.poReference() != null) {
            invoice.setPoReferenceExtracted(data.poReference());
            invoice.addExtractionField(new ExtractionField(
                    "poReference", data.poReference(), data.poReferenceConfidence(), source));
        }

        // Line Items
        if (data.lineItems() != null) {
            for (ParsedInvoiceData.ParsedLineItem item : data.lineItems()) {
                invoice.addLineItem(new InvoiceLineItem(
                        item.description(),
                        item.quantity(),
                        item.unitPrice(),
                        item.lineTotal(),
                        item.sortOrder(),
                        source
                ));
            }
        }
    }
}
