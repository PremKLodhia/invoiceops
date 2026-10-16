package com.invoiceops.invoice;

public enum InvoiceStatus {
    UPLOADED,
    PROCESSING,
    EXTRACTION_FAILED,
    NEEDS_REVIEW,
    PENDING_APPROVAL,
    APPROVED,
    REJECTED
}
