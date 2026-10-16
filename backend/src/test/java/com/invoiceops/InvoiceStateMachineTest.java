package com.invoiceops;

import com.invoiceops.identity.Organisation;
import com.invoiceops.identity.User;
import com.invoiceops.identity.UserRole;
import com.invoiceops.invoice.Invoice;
import com.invoiceops.invoice.InvoiceStatus;
import com.invoiceops.invoice.InvoiceWorkflowService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class InvoiceStateMachineTest {

    private InvoiceWorkflowService workflowService;
    private User reviewer;
    private User approver;
    private Invoice invoice;

    @BeforeEach
    void setUp() {
        workflowService = new InvoiceWorkflowService();
        Organisation org = new Organisation(UUID.randomUUID(), "Test Org");

        reviewer = new User(org, "rev@test.local", "hash", "Bob Reviewer", UserRole.REVIEWER);
        approver = new User(org, "app@test.local", "hash", "Carol Approver", UserRole.APPROVER);

        invoice = new Invoice();
        invoice.setOrganisationId(org.getId());
        invoice.setStatus(InvoiceStatus.NEEDS_REVIEW);
    }

    @Test
    @DisplayName("Legal workflow: NEEDS_REVIEW -> PENDING_APPROVAL -> APPROVED")
    void testLegalHappyPathTransition() {
        workflowService.submitForApproval(invoice, reviewer);
        assertEquals(InvoiceStatus.PENDING_APPROVAL, invoice.getStatus());
        assertNotNull(invoice.getSubmittedBy());
        assertNotNull(invoice.getSubmittedAt());

        workflowService.approve(invoice, approver);
        assertEquals(InvoiceStatus.APPROVED, invoice.getStatus());
        assertNotNull(invoice.getReviewedBy());
        assertNotNull(invoice.getReviewedAt());
    }

    @Test
    @DisplayName("Illegal transition directly from NEEDS_REVIEW to APPROVED throws IllegalStateException")
    void testIllegalDirectApprovalThrowsException() {
        assertThrows(IllegalStateException.class, () -> workflowService.approve(invoice, approver));
        assertEquals(InvoiceStatus.NEEDS_REVIEW, invoice.getStatus());
    }

    @Test
    @DisplayName("Rejection requires non-empty reason")
    void testRejectionRequiresReason() {
        workflowService.submitForApproval(invoice, reviewer);

        assertThrows(IllegalArgumentException.class, () -> workflowService.reject(invoice, "", approver));
        assertThrows(IllegalArgumentException.class, () -> workflowService.reject(invoice, "   ", approver));
        assertThrows(IllegalArgumentException.class, () -> workflowService.reject(invoice, null, approver));

        workflowService.reject(invoice, "Price variance not justified", approver);
        assertEquals(InvoiceStatus.REJECTED, invoice.getStatus());
        assertEquals("Price variance not justified", invoice.getRejectionReason());
    }

    @Test
    @DisplayName("Reopening a rejected invoice transitions it back to NEEDS_REVIEW")
    void testReopeningRejectedInvoice() {
        workflowService.submitForApproval(invoice, reviewer);
        workflowService.reject(invoice, "Tax mismatch", approver);
        assertEquals(InvoiceStatus.REJECTED, invoice.getStatus());

        workflowService.reopenForCorrection(invoice, reviewer);
        assertEquals(InvoiceStatus.NEEDS_REVIEW, invoice.getStatus());
    }

    @Test
    @DisplayName("Role RBAC: APPROVER cannot submit, REVIEWER cannot approve")
    void testRoleConstraintsOnTransitions() {
        assertThrows(AccessDeniedException.class, () -> workflowService.submitForApproval(invoice, approver));

        workflowService.submitForApproval(invoice, reviewer);

        assertThrows(AccessDeniedException.class, () -> workflowService.approve(invoice, reviewer));
        assertThrows(AccessDeniedException.class, () -> workflowService.reject(invoice, "Reason", reviewer));
    }
}
