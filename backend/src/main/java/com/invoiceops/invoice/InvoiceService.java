package com.invoiceops.invoice;

import com.invoiceops.audit.AuditService;
import com.invoiceops.config.ResourceNotFoundException;
import com.invoiceops.document.DocumentStorageService;
import com.invoiceops.document.StoredDocument;
import com.invoiceops.extraction.ConfidenceLevel;
import com.invoiceops.extraction.ExtractionPipeline;
import com.invoiceops.extraction.FieldSource;
import com.invoiceops.extraction.InvoiceValidationEngine;
import com.invoiceops.identity.User;
import com.invoiceops.identity.UserRepository;
import com.invoiceops.purchaseorder.PurchaseOrder;
import com.invoiceops.purchaseorder.PurchaseOrderRepository;
import com.invoiceops.supplier.Supplier;
import com.invoiceops.supplier.SupplierRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final UserRepository userRepository;
    private final SupplierRepository supplierRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final DocumentStorageService documentStorageService;
    private final ExtractionPipeline extractionPipeline;
    private final InvoiceWorkflowService workflowService;
    private final InvoiceValidationEngine validationEngine;
    private final AuditService auditService;

    public InvoiceService(
            InvoiceRepository invoiceRepository,
            UserRepository userRepository,
            SupplierRepository supplierRepository,
            PurchaseOrderRepository purchaseOrderRepository,
            DocumentStorageService documentStorageService,
            ExtractionPipeline extractionPipeline,
            InvoiceWorkflowService workflowService,
            InvoiceValidationEngine validationEngine,
            AuditService auditService) {
        this.invoiceRepository = invoiceRepository;
        this.userRepository = userRepository;
        this.supplierRepository = supplierRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.documentStorageService = documentStorageService;
        this.extractionPipeline = extractionPipeline;
        this.workflowService = workflowService;
        this.validationEngine = validationEngine;
        this.auditService = auditService;
    }

    @Transactional
    public InvoiceSummaryDto uploadInvoice(MultipartFile file, UUID orgId, UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        StoredDocument storedDoc = documentStorageService.storeDocument(file);

        Invoice invoice = new Invoice(
                orgId,
                storedDoc.originalFilename(),
                storedDoc.storedFilename(),
                storedDoc.fileHash(),
                storedDoc.fileSize(),
                storedDoc.contentType(),
                user
        );

        // Execute extraction & validation pipeline
        extractionPipeline.processInvoice(invoice);

        Invoice saved = invoiceRepository.save(invoice);

        auditService.logEvent(
                orgId,
                user.getId(),
                user.getEmail(),
                "INVOICE_UPLOADED",
                "INVOICE",
                saved.getId(),
                Map.of(
                        "filename", saved.getOriginalFilename(),
                        "fileSize", saved.getFileSize() != null ? saved.getFileSize() : 0,
                        "fileHash", saved.getFileHash() != null ? saved.getFileHash() : ""
                )
        );

        return InvoiceSummaryDto.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public InvoiceDetailDto getInvoice(UUID invoiceId, UUID orgId) {
        Invoice invoice = invoiceRepository.findByIdAndOrganisationId(invoiceId, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice", "id", invoiceId));
        return InvoiceDetailDto.fromEntity(invoice);
    }

    @Transactional(readOnly = true)
    public Page<InvoiceSummaryDto> listInvoices(UUID orgId, String statusStr, String search, Pageable pageable) {
        InvoiceStatus status = null;
        if (statusStr != null && !statusStr.isBlank() && !statusStr.equalsIgnoreCase("ALL")) {
            try {
                status = InvoiceStatus.valueOf(statusStr.trim().toUpperCase());
            } catch (IllegalArgumentException ignored) {
            }
        }

        String searchKeyword = (search != null && !search.isBlank()) ? search.trim() : null;

        return invoiceRepository.searchInvoices(orgId, status, searchKeyword, pageable)
                .map(InvoiceSummaryDto::fromEntity);
    }

    @Transactional
    public InvoiceDetailDto correctFields(UUID invoiceId, FieldCorrectionRequest request, UUID orgId, UUID userId) {
        Invoice invoice = invoiceRepository.findByIdAndOrganisationId(invoiceId, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice", "id", invoiceId));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        Instant now = Instant.now();

        // 1. Supplier correction
        if (request.supplierId() != null) {
            Supplier supplier = supplierRepository.findByIdAndOrganisationId(request.supplierId(), orgId)
                    .orElseThrow(() -> new ResourceNotFoundException("Supplier", "id", request.supplierId()));
            invoice.setSupplier(supplier);
            invoice.setSupplierNameExtracted(supplier.getName());
            recordFieldCorrection(invoice, "supplier", supplier.getName(), user, now);
        }

        // 2. Invoice Number
        if (request.invoiceNumber() != null) {
            invoice.setInvoiceNumber(request.invoiceNumber().trim());
            recordFieldCorrection(invoice, "invoiceNumber", request.invoiceNumber().trim(), user, now);
        }

        // 3. Dates
        if (request.invoiceDate() != null) {
            invoice.setInvoiceDate(request.invoiceDate());
            recordFieldCorrection(invoice, "invoiceDate", request.invoiceDate().toString(), user, now);
        }

        if (request.dueDate() != null) {
            invoice.setDueDate(request.dueDate());
            recordFieldCorrection(invoice, "dueDate", request.dueDate().toString(), user, now);
        }

        // 4. Currency
        if (request.currency() != null && !request.currency().isBlank()) {
            invoice.setCurrency(request.currency().trim().toUpperCase());
            recordFieldCorrection(invoice, "currency", request.currency().trim().toUpperCase(), user, now);
        }

        // 5. Financial Amounts
        if (request.netAmount() != null) {
            invoice.setNetAmount(request.netAmount());
            recordFieldCorrection(invoice, "netAmount", request.netAmount().toPlainString(), user, now);
        }

        if (request.taxAmount() != null) {
            invoice.setTaxAmount(request.taxAmount());
            recordFieldCorrection(invoice, "taxAmount", request.taxAmount().toPlainString(), user, now);
        }

        if (request.taxRate() != null) {
            invoice.setTaxRate(request.taxRate());
            recordFieldCorrection(invoice, "taxRate", request.taxRate().toPlainString(), user, now);
        }

        if (request.grossAmount() != null) {
            invoice.setGrossAmount(request.grossAmount());
            recordFieldCorrection(invoice, "grossAmount", request.grossAmount().toPlainString(), user, now);
        }

        // 6. PO Number
        if (request.poNumber() != null) {
            invoice.setPoReferenceExtracted(request.poNumber().trim());
            recordFieldCorrection(invoice, "poReference", request.poNumber().trim(), user, now);
            purchaseOrderRepository.findByOrganisationIdAndPoNumberIgnoreCase(orgId, request.poNumber().trim())
                    .ifPresent(invoice::setPurchaseOrder);
        }

        // 7. Line Items update if provided
        if (request.lineItems() != null) {
            invoice.clearLineItems();
            int order = 0;
            for (FieldCorrectionRequest.LineItemCorrection itemCorr : request.lineItems()) {
                invoice.addLineItem(new InvoiceLineItem(
                        itemCorr.description(),
                        itemCorr.quantity(),
                        itemCorr.unitPrice(),
                        itemCorr.lineTotal(),
                        order++,
                        FieldSource.MANUAL
                ));
            }
        }

        // Reopen if rejected
        if (invoice.getStatus() == InvoiceStatus.REJECTED) {
            workflowService.reopenForCorrection(invoice, user);
        }

        // Clear previous validation results and re-run validations
        invoice.clearValidationResults();
        validationEngine.validate(invoice);

        Invoice saved = invoiceRepository.save(invoice);

        auditService.logEvent(
                orgId,
                user.getId(),
                user.getEmail(),
                "INVOICE_FIELDS_CORRECTED",
                "INVOICE",
                saved.getId(),
                Map.of(
                        "invoiceNumber", saved.getInvoiceNumber() != null ? saved.getInvoiceNumber() : "",
                        "grossAmount", saved.getGrossAmount() != null ? saved.getGrossAmount().toPlainString() : ""
                )
        );

        return InvoiceDetailDto.fromEntity(saved);
    }

    @Transactional
    public InvoiceDetailDto submitForApproval(UUID invoiceId, UUID orgId, UUID userId) {
        Invoice invoice = invoiceRepository.findByIdAndOrganisationId(invoiceId, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice", "id", invoiceId));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        workflowService.submitForApproval(invoice, user);
        Invoice saved = invoiceRepository.save(invoice);

        auditService.logEvent(
                orgId,
                user.getId(),
                user.getEmail(),
                "SUBMITTED_FOR_APPROVAL",
                "INVOICE",
                saved.getId(),
                Map.of("submittedBy", user.getEmail())
        );

        return InvoiceDetailDto.fromEntity(saved);
    }

    @Transactional
    public InvoiceDetailDto approveInvoice(UUID invoiceId, UUID orgId, UUID userId) {
        Invoice invoice = invoiceRepository.findByIdAndOrganisationId(invoiceId, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice", "id", invoiceId));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        workflowService.approve(invoice, user);
        Invoice saved = invoiceRepository.save(invoice);

        auditService.logEvent(
                orgId,
                user.getId(),
                user.getEmail(),
                "INVOICE_APPROVED",
                "INVOICE",
                saved.getId(),
                Map.of("approvedBy", user.getEmail())
        );

        return InvoiceDetailDto.fromEntity(saved);
    }

    @Transactional
    public InvoiceDetailDto rejectInvoice(UUID invoiceId, String reason, UUID orgId, UUID userId) {
        Invoice invoice = invoiceRepository.findByIdAndOrganisationId(invoiceId, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice", "id", invoiceId));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        workflowService.reject(invoice, reason, user);
        Invoice saved = invoiceRepository.save(invoice);

        auditService.logEvent(
                orgId,
                user.getId(),
                user.getEmail(),
                "INVOICE_REJECTED",
                "INVOICE",
                saved.getId(),
                Map.of("reason", reason, "rejectedBy", user.getEmail())
        );

        return InvoiceDetailDto.fromEntity(saved);
    }

    private void recordFieldCorrection(Invoice invoice, String fieldName, String newValue, User user, Instant now) {
        ExtractionField existingField = invoice.getExtractionFields().stream()
                .filter(f -> f.getFieldName().equalsIgnoreCase(fieldName))
                .findFirst()
                .orElse(null);

        if (existingField != null) {
            existingField.setCorrectedValue(newValue);
            existingField.setConfidence(ConfidenceLevel.MANUAL);
            existingField.setSource(FieldSource.MANUAL);
            existingField.setCorrectedBy(user);
            existingField.setCorrectedAt(now);
        } else {
            ExtractionField newField = new ExtractionField(fieldName, null, ConfidenceLevel.MANUAL, FieldSource.MANUAL);
            newField.setCorrectedValue(newValue);
            newField.setCorrectedBy(user);
            newField.setCorrectedAt(now);
            invoice.addExtractionField(newField);
        }
    }
}
