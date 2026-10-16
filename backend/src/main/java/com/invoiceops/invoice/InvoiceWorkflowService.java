package com.invoiceops.invoice;

import com.invoiceops.identity.User;
import com.invoiceops.identity.UserRole;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class InvoiceWorkflowService {

    public void transitionToProcessing(Invoice invoice) {
        if (invoice.getStatus() != InvoiceStatus.UPLOADED) {
            throw new IllegalStateException("Cannot process invoice in status: " + invoice.getStatus());
        }
        invoice.setStatus(InvoiceStatus.PROCESSING);
    }

    public void transitionToNeedsReview(Invoice invoice) {
        if (invoice.getStatus() != InvoiceStatus.PROCESSING && invoice.getStatus() != InvoiceStatus.REJECTED) {
            throw new IllegalStateException("Cannot transition to NEEDS_REVIEW from status: " + invoice.getStatus());
        }
        invoice.setStatus(InvoiceStatus.NEEDS_REVIEW);
    }

    public void transitionToExtractionFailed(Invoice invoice) {
        if (invoice.getStatus() != InvoiceStatus.PROCESSING) {
            throw new IllegalStateException("Cannot mark EXTRACTION_FAILED from status: " + invoice.getStatus());
        }
        invoice.setStatus(InvoiceStatus.EXTRACTION_FAILED);
    }

    public void submitForApproval(Invoice invoice, User user) {
        if (invoice.getStatus() != InvoiceStatus.NEEDS_REVIEW) {
            throw new IllegalStateException("Invoice must be in NEEDS_REVIEW status to submit for approval. Current: " + invoice.getStatus());
        }

        if (user.getRole() != UserRole.REVIEWER && user.getRole() != UserRole.ADMIN) {
            throw new AccessDeniedException("Only REVIEWER or ADMIN roles can submit invoices for approval");
        }

        invoice.setStatus(InvoiceStatus.PENDING_APPROVAL);
        invoice.setSubmittedBy(user);
        invoice.setSubmittedAt(Instant.now());
    }

    public void approve(Invoice invoice, User user) {
        if (invoice.getStatus() != InvoiceStatus.PENDING_APPROVAL) {
            throw new IllegalStateException("Invoice must be in PENDING_APPROVAL status to approve. Current: " + invoice.getStatus());
        }

        if (user.getRole() != UserRole.APPROVER && user.getRole() != UserRole.ADMIN) {
            throw new AccessDeniedException("Only APPROVER or ADMIN roles can approve invoices");
        }

        invoice.setStatus(InvoiceStatus.APPROVED);
        invoice.setReviewedBy(user);
        invoice.setReviewedAt(Instant.now());
        invoice.setRejectionReason(null);
    }

    public void reject(Invoice invoice, String reason, User user) {
        if (invoice.getStatus() != InvoiceStatus.PENDING_APPROVAL) {
            throw new IllegalStateException("Invoice must be in PENDING_APPROVAL status to reject. Current: " + invoice.getStatus());
        }

        if (user.getRole() != UserRole.APPROVER && user.getRole() != UserRole.ADMIN) {
            throw new AccessDeniedException("Only APPROVER or ADMIN roles can reject invoices");
        }

        if (reason == null || reason.trim().isBlank()) {
            throw new IllegalArgumentException("A rejection reason is strictly required when rejecting an invoice");
        }

        invoice.setStatus(InvoiceStatus.REJECTED);
        invoice.setReviewedBy(user);
        invoice.setReviewedAt(Instant.now());
        invoice.setRejectionReason(reason.trim());
    }

    public void reopenForCorrection(Invoice invoice, User user) {
        if (invoice.getStatus() != InvoiceStatus.REJECTED) {
            throw new IllegalStateException("Only REJECTED invoices can be reopened for correction. Current: " + invoice.getStatus());
        }

        if (user.getRole() != UserRole.REVIEWER && user.getRole() != UserRole.ADMIN) {
            throw new AccessDeniedException("Only REVIEWER or ADMIN roles can reopen invoices for correction");
        }

        invoice.setStatus(InvoiceStatus.NEEDS_REVIEW);
    }
}
