package com.invoiceops.extraction;

import com.invoiceops.invoice.Invoice;
import com.invoiceops.invoice.InvoiceLineItem;
import com.invoiceops.invoice.InvoiceRepository;
import com.invoiceops.invoice.ValidationResult;
import com.invoiceops.invoice.ValidationSeverity;
import com.invoiceops.purchaseorder.PurchaseOrder;
import com.invoiceops.purchaseorder.PurchaseOrderRepository;
import com.invoiceops.supplier.Supplier;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
public class InvoiceValidationEngine {

    private final InvoiceRepository invoiceRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;

    public InvoiceValidationEngine(InvoiceRepository invoiceRepository, PurchaseOrderRepository purchaseOrderRepository) {
        this.invoiceRepository = invoiceRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
    }

    public void validate(Invoice invoice) {
        UUID orgId = invoice.getOrganisationId();
        boolean hasErrors = false;
        boolean hasDuplicates = false;
        boolean hasPoMismatch = false;

        // 1. Mandatory Fields Check
        if (invoice.getInvoiceNumber() == null || invoice.getInvoiceNumber().isBlank()) {
            invoice.addValidationResult(new ValidationResult(
                    "MISSING_INVOICE_NUMBER",
                    ValidationSeverity.ERROR,
                    "Invoice number could not be extracted and is required",
                    "invoiceNumber"
            ));
            hasErrors = true;
        }

        if (invoice.getInvoiceDate() == null) {
            invoice.addValidationResult(new ValidationResult(
                    "MISSING_INVOICE_DATE",
                    ValidationSeverity.WARNING,
                    "Invoice date is missing or could not be determined",
                    "invoiceDate"
            ));
        }

        if (invoice.getGrossAmount() == null) {
            invoice.addValidationResult(new ValidationResult(
                    "MISSING_GROSS_AMOUNT",
                    ValidationSeverity.ERROR,
                    "Total gross amount could not be extracted",
                    "grossAmount"
            ));
            hasErrors = true;
        }

        // 2. Mathematical Consistency Check (Net + Tax = Gross)
        if (invoice.getNetAmount() != null && invoice.getTaxAmount() != null && invoice.getGrossAmount() != null) {
            BigDecimal expectedGross = invoice.getNetAmount().add(invoice.getTaxAmount());
            BigDecimal diff = expectedGross.subtract(invoice.getGrossAmount()).abs();
            if (diff.compareTo(new BigDecimal("0.05")) > 0) {
                invoice.addValidationResult(new ValidationResult(
                        "MATH_CHECK",
                        ValidationSeverity.ERROR,
                        String.format("Math inconsistency: Net (%s) + Tax (%s) != Gross (%s), variance is %s",
                                invoice.getNetAmount(), invoice.getTaxAmount(), invoice.getGrossAmount(), diff),
                        "grossAmount"
                ));
                hasErrors = true;
            }
        }

        // 3. Line Items Sum Check
        if (invoice.getLineItems() != null && !invoice.getLineItems().isEmpty() && invoice.getNetAmount() != null) {
            BigDecimal sumItems = BigDecimal.ZERO;
            for (InvoiceLineItem item : invoice.getLineItems()) {
                if (item.getLineTotal() != null) {
                    sumItems = sumItems.add(item.getLineTotal());
                }
            }

            BigDecimal diff = sumItems.subtract(invoice.getNetAmount()).abs();
            if (diff.compareTo(new BigDecimal("0.05")) > 0) {
                invoice.addValidationResult(new ValidationResult(
                        "LINE_ITEMS_SUM",
                        ValidationSeverity.WARNING,
                        String.format("Sum of line items (%s) differs from subtotal (%s) by %s",
                                sumItems, invoice.getNetAmount(), diff),
                        "netAmount"
                ));
            }
        }

        // 4. Duplicate Invoices Check
        if (invoice.getInvoiceNumber() != null && !invoice.getInvoiceNumber().isBlank()) {
            Supplier supplier = invoice.getSupplier();
            if (supplier != null && supplier.getId() != null) {
                List<Invoice> existingSameNumberAndSupplier = invoiceRepository
                        .findByOrganisationIdAndSupplierIdAndInvoiceNumberIgnoreCase(
                                orgId, supplier.getId(), invoice.getInvoiceNumber().trim()
                        );

                boolean duplicateFound = existingSameNumberAndSupplier.stream()
                        .anyMatch(existing -> !existing.getId().equals(invoice.getId()));

                if (duplicateFound) {
                    invoice.addValidationResult(new ValidationResult(
                            "DUPLICATE_INVOICE_NUMBER",
                            ValidationSeverity.WARNING,
                            String.format("Duplicate invoice: An invoice with number '%s' already exists for supplier '%s'",
                                    invoice.getInvoiceNumber(), supplier.getName()),
                            "invoiceNumber"
                    ));
                    hasDuplicates = true;
                }
            }
        }

        // Duplicate File Hash Check
        if (invoice.getFileHash() != null && !invoice.getFileHash().isBlank()) {
            List<Invoice> existingSameHash = invoiceRepository.findByOrganisationIdAndFileHash(orgId, invoice.getFileHash());
            boolean hashDuplicate = existingSameHash.stream()
                    .anyMatch(existing -> !existing.getId().equals(invoice.getId()));

            if (hashDuplicate) {
                invoice.addValidationResult(new ValidationResult(
                        "DUPLICATE_FILE_HASH",
                        ValidationSeverity.WARNING,
                        "Suspected duplicate: An identical document file has already been uploaded to this organisation",
                        "fileHash"
                ));
                hasDuplicates = true;
            }
        }

        // 5. Purchase Order Matching
        String poRef = invoice.getPoReferenceExtracted();
        if (poRef != null && !poRef.isBlank()) {
            Optional<PurchaseOrder> matchingPo = purchaseOrderRepository
                    .findByOrganisationIdAndPoNumberIgnoreCase(orgId, poRef.trim());

            if (matchingPo.isEmpty()) {
                invoice.addValidationResult(new ValidationResult(
                        "PO_MATCH_NOT_FOUND",
                        ValidationSeverity.WARNING,
                        String.format("Referenced purchase order '%s' was not found in this organisation", poRef),
                        "poReference"
                ));
                hasPoMismatch = true;
            } else {
                PurchaseOrder po = matchingPo.get();
                invoice.setPurchaseOrder(po);

                // Supplier mismatch check
                if (po.getSupplier() != null && invoice.getSupplier() != null) {
                    if (!po.getSupplier().getId().equals(invoice.getSupplier().getId())) {
                        invoice.addValidationResult(new ValidationResult(
                                "PO_SUPPLIER_MISMATCH",
                                ValidationSeverity.WARNING,
                                String.format("Invoice supplier (%s) does not match PO supplier (%s)",
                                        invoice.getSupplier().getName(), po.getSupplier().getName()),
                                "supplier"
                        ));
                        hasPoMismatch = true;
                    }
                }

                // Amount variance check
                if (po.getTotalAmount() != null && invoice.getGrossAmount() != null) {
                    BigDecimal poVariance = po.getTotalAmount().subtract(invoice.getGrossAmount()).abs();
                    if (poVariance.compareTo(new BigDecimal("0.05")) > 0) {
                        invoice.addValidationResult(new ValidationResult(
                                "PO_AMOUNT_VARIANCE",
                                ValidationSeverity.WARNING,
                                String.format("Invoice gross amount (%s) differs from purchase order amount (%s)",
                                        invoice.getGrossAmount(), po.getTotalAmount()),
                                "grossAmount"
                        ));
                        hasPoMismatch = true;
                    }
                }
            }
        }

        invoice.setHasValidationErrors(hasErrors);
        invoice.setHasDuplicateWarning(hasDuplicates);
        invoice.setHasPoMismatch(hasPoMismatch);
    }
}
