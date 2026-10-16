package com.invoiceops.invoice;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record InvoiceSummaryDto(
        UUID id,
        UUID organisationId,
        UUID supplierId,
        String supplierName,
        String invoiceNumber,
        LocalDate invoiceDate,
        LocalDate dueDate,
        String currency,
        BigDecimal netAmount,
        BigDecimal taxAmount,
        BigDecimal grossAmount,
        InvoiceStatus status,
        boolean hasValidationErrors,
        boolean hasDuplicateWarning,
        boolean hasPoMismatch,
        String poNumber,
        String originalFilename,
        Instant createdAt
) {
    public static InvoiceSummaryDto fromEntity(Invoice invoice) {
        String supplierName = invoice.getSupplier() != null
                ? invoice.getSupplier().getName()
                : invoice.getSupplierNameExtracted();

        String poNumber = invoice.getPurchaseOrder() != null
                ? invoice.getPurchaseOrder().getPoNumber()
                : invoice.getPoReferenceExtracted();

        return new InvoiceSummaryDto(
                invoice.getId(),
                invoice.getOrganisationId(),
                invoice.getSupplier() != null ? invoice.getSupplier().getId() : null,
                supplierName,
                invoice.getInvoiceNumber(),
                invoice.getInvoiceDate(),
                invoice.getDueDate(),
                invoice.getCurrency(),
                invoice.getNetAmount(),
                invoice.getTaxAmount(),
                invoice.getGrossAmount(),
                invoice.getStatus(),
                invoice.isHasValidationErrors(),
                invoice.isHasDuplicateWarning(),
                invoice.isHasPoMismatch(),
                poNumber,
                invoice.getOriginalFilename(),
                invoice.getCreatedAt()
        );
    }
}
