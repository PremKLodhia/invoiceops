package com.invoiceops;

import com.invoiceops.config.ApiErrorResponse;
import com.invoiceops.config.DataSeeder;
import com.invoiceops.config.GlobalExceptionHandler;
import com.invoiceops.identity.User;
import com.invoiceops.identity.UserRepository;
import com.invoiceops.invoice.Invoice;
import com.invoiceops.invoice.InvoiceRepository;
import com.invoiceops.invoice.InvoiceStatus;
import com.invoiceops.invoice.InvoiceWorkflowService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.test.context.ActiveProfiles;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

@SpringBootTest
@ActiveProfiles("test")
class InvoiceOptimisticLockingTest {

    @Autowired
    private DataSeeder dataSeeder;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private InvoiceRepository invoiceRepository;

    @Autowired
    private InvoiceWorkflowService workflowService;

    @Autowired
    private GlobalExceptionHandler exceptionHandler;

    @Test
    @DisplayName("Two approvers racing on the same invoice: the stale approval is rejected")
    void staleApprovalIsRejected() {
        dataSeeder.seedDemoData();
        User reviewer = userRepository.findByEmail("reviewer@invoiceops.local").orElseThrow();
        User approver = userRepository.findByEmail("approver@invoiceops.local").orElseThrow();
        User admin = userRepository.findByEmail("admin@invoiceops.local").orElseThrow();

        String name = "race-" + UUID.randomUUID() + ".pdf";
        Invoice invoice = new Invoice(reviewer.getOrganisation().getId(), name, name,
                "hash-" + UUID.randomUUID(), 1000L, "application/pdf", reviewer);
        invoice.setStatus(InvoiceStatus.PENDING_APPROVAL);
        UUID id = invoiceRepository.save(invoice).getId();

        // Both approvers load the invoice at the same version.
        Invoice first = invoiceRepository.findById(id).orElseThrow();
        Invoice second = invoiceRepository.findById(id).orElseThrow();
        assertEquals(first.getVersion(), second.getVersion());

        workflowService.approve(first, approver);
        invoiceRepository.save(first);

        workflowService.approve(second, admin);
        assertThrows(ObjectOptimisticLockingFailureException.class, () -> invoiceRepository.save(second));

        Invoice stored = invoiceRepository.findById(id).orElseThrow();
        assertEquals(InvoiceStatus.APPROVED, stored.getStatus());
        assertEquals(approver.getId(), stored.getReviewedBy().getId(), "the first approval must win");
    }

    @Test
    @DisplayName("Optimistic lock failures are reported as 409 Conflict")
    void optimisticLockFailureMapsToConflict() {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/invoices/x/approve");
        ResponseEntity<ApiErrorResponse> response = exceptionHandler.handleOptimisticLock(
                new ObjectOptimisticLockingFailureException(Invoice.class, UUID.randomUUID()), request);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertEquals(409, response.getBody().status());
    }
}
