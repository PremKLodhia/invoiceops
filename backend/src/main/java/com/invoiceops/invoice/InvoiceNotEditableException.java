package com.invoiceops.invoice;

/**
 * Thrown when a field correction is attempted on an invoice whose status does not allow edits
 * (for example an APPROVED or PENDING_APPROVAL invoice). Mapped to HTTP 409 Conflict.
 */
public class InvoiceNotEditableException extends RuntimeException {

    private final InvoiceStatus status;

    public InvoiceNotEditableException(InvoiceStatus status) {
        super("Invoice fields cannot be corrected in status " + status
                + ". Corrections are allowed only in NEEDS_REVIEW, REJECTED or EXTRACTION_FAILED.");
        this.status = status;
    }

    public InvoiceStatus getStatus() {
        return status;
    }
}
