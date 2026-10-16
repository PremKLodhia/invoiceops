package com.invoiceops.invoice;

import com.invoiceops.extraction.ExtractionMethod;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record InvoiceDetailDto(
        UUID id,
        UUID organisationId,
        UUID supplierId,
        String supplierName,
        UUID purchaseOrderId,
        String poNumber,
        String originalFilename,
        String storedFilename,
        String fileHash,
        Long fileSize,
        String contentType,
        String invoiceNumber,
        LocalDate invoiceDate,
        LocalDate dueDate,
        String currency,
        BigDecimal netAmount,
        BigDecimal taxAmount,
        BigDecimal taxRate,
        BigDecimal grossAmount,
        String supplierNameExtracted,
        String poReferenceExtracted,
        InvoiceStatus status,
        ExtractionMethod extractionMethod,
        Instant extractionCompletedAt,
        String submittedByEmail,
        Instant submittedAt,
        String reviewedByEmail,
        Instant reviewedAt,
        String rejectionReason,
        boolean hasValidationErrors,
        boolean hasDuplicateWarning,
        boolean hasPoMismatch,
        String uploadedByEmail,
        Instant createdAt,
        Instant updatedAt,
        List<InvoiceLineItemDto> lineItems,
        List<ExtractionFieldDto> extractionFields,
        List<ValidationResultDto> validationResults
) {
    public static InvoiceDetailDto fromEntity(Invoice invoice) {
        String supplierName = invoice.getSupplier() != null
                ? invoice.getSupplier().getName()
                : invoice.getSupplierNameExtracted();

        String poNum = invoice.getPurchaseOrder() != null
                ? invoice.getPurchaseOrder().getPoNumber()
                : invoice.getPoReferenceExtracted();

        List<InvoiceLineItemDto> items = invoice.getLineItems() != null
                ? invoice.getLineItems().stream().map(InvoiceLineItemDto::fromEntity).toList()
                : List.of();

        List<ExtractionFieldDto> fields = invoice.getExtractionFields() != null
                ? invoice.getExtractionFields().stream().map(ExtractionFieldDto::fromEntity).toList()
                : List.of();

        List<ValidationResultDto> validations = invoice.getValidationResults() != null
                ? invoice.getValidationResults().stream().map(ValidationResultDto::fromEntity).toList()
                : List.of();

        return new InvoiceDetailDto(
                invoice.getId(),
                invoice.getOrganisationId(),
                invoice.getSupplier() != null ? invoice.getSupplier().getId() : null,
                supplierName,
                invoice.getPurchaseOrder() != null ? invoice.getPurchaseOrder().getId() : null,
                poNum,
                invoice.getOriginalFilename(),
                invoice.getStoredFilename(),
                invoice.getFileHash(),
                invoice.getFileSize(),
                invoice.getContentType(),
                invoice.getInvoiceNumber(),
                invoice.getInvoiceDate(),
                invoice.getDueDate(),
                invoice.getCurrency(),
                invoice.getNetAmount(),
                invoice.getTaxAmount(),
                invoice.getTaxRate(),
                invoice.getGrossAmount(),
                invoice.getSupplierNameExtracted(),
                invoice.getPoReferenceExtracted(),
                invoice.getStatus(),
                invoice.getExtractionMethod(),
                invoice.getExtractionCompletedAt(),
                invoice.getSubmittedBy() != null ? invoice.getSubmittedBy().getEmail() : null,
                invoice.getSubmittedAt(),
                invoice.getReviewedBy() != null ? invoice.getReviewedBy().getEmail() : null,
                invoice.getReviewedAt(),
                invoice.getRejectionReason(),
                invoice.isHasValidationErrors(),
                invoice.isHasDuplicateWarning(),
                invoice.isHasPoMismatch(),
                invoice.getUploadedBy() != null ? invoice.getUploadedBy().getEmail() : null,
                invoice.getCreatedAt(),
                invoice.getUpdatedAt(),
                items,
                fields,
                validations
        );
    }
}
