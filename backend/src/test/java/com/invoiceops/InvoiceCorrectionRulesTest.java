package com.invoiceops;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.invoiceops.config.DataSeeder;
import com.invoiceops.identity.InvoiceOpsUserDetails;
import com.invoiceops.identity.Organisation;
import com.invoiceops.identity.User;
import com.invoiceops.identity.UserRepository;
import com.invoiceops.identity.UserRole;
import com.invoiceops.invoice.Invoice;
import com.invoiceops.invoice.InvoiceNotEditableException;
import com.invoiceops.invoice.InvoiceRepository;
import com.invoiceops.invoice.InvoiceStatus;
import com.invoiceops.invoice.InvoiceWorkflowService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class InvoiceCorrectionRulesTest {

    private final InvoiceWorkflowService workflow = new InvoiceWorkflowService();
    private final User reviewerStub = new User(new Organisation(UUID.randomUUID(), "Org"), "r@test.local", "hash", "R", UserRole.REVIEWER);

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private DataSeeder dataSeeder;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private InvoiceRepository invoiceRepository;

    private User reviewer;

    @BeforeEach
    void setUp() {
        dataSeeder.seedDemoData();
        reviewer = userRepository.findByEmail("reviewer@invoiceops.local").orElseThrow();
    }

    private static Invoice withStatus(InvoiceStatus status) {
        Invoice invoice = new Invoice();
        invoice.setStatus(status);
        return invoice;
    }

    @ParameterizedTest
    @EnumSource(value = InvoiceStatus.class, names = {"NEEDS_REVIEW", "REJECTED", "EXTRACTION_FAILED"})
    @DisplayName("Corrections are allowed while an invoice is under review")
    void correctableStatuses(InvoiceStatus status) {
        assertDoesNotThrow(() -> workflow.assertCorrectable(withStatus(status)));
    }

    @ParameterizedTest
    @EnumSource(value = InvoiceStatus.class, names = {"UPLOADED", "PROCESSING", "PENDING_APPROVAL", "APPROVED"})
    @DisplayName("Corrections are blocked outside review")
    void blockedStatuses(InvoiceStatus status) {
        assertThrows(InvoiceNotEditableException.class, () -> workflow.assertCorrectable(withStatus(status)));
    }

    @ParameterizedTest
    @EnumSource(value = InvoiceStatus.class, names = {"NEEDS_REVIEW", "REJECTED", "EXTRACTION_FAILED"})
    @DisplayName("A completed correction leaves the invoice in NEEDS_REVIEW")
    void correctionReturnsToReview(InvoiceStatus status) {
        Invoice invoice = withStatus(status);
        workflow.completeCorrection(invoice, reviewerStub);
        assertEquals(InvoiceStatus.NEEDS_REVIEW, invoice.getStatus());
    }

    private Invoice saveInvoice(InvoiceStatus status) {
        String name = "correction-" + UUID.randomUUID() + ".pdf";
        Invoice invoice = new Invoice(reviewer.getOrganisation().getId(), name, name,
                "hash-" + UUID.randomUUID(), 1000L, "application/pdf", reviewer);
        invoice.setInvoiceNumber("ORIGINAL");
        invoice.setStatus(status);
        return invoiceRepository.save(invoice);
    }

    private String body() throws Exception {
        return objectMapper.writeValueAsString(Map.of("invoiceNumber", "CORRECTED"));
    }

    @Test
    @DisplayName("PUT /fields on an APPROVED invoice returns 409 and changes nothing")
    void approvedInvoiceCannotBeCorrected() throws Exception {
        Invoice invoice = saveInvoice(InvoiceStatus.APPROVED);

        mockMvc.perform(put("/api/invoices/" + invoice.getId() + "/fields")
                        .with(user(new InvoiceOpsUserDetails(reviewer))).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(body()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));

        Invoice reloaded = invoiceRepository.findById(invoice.getId()).orElseThrow();
        assertEquals("ORIGINAL", reloaded.getInvoiceNumber());
        assertEquals(InvoiceStatus.APPROVED, reloaded.getStatus());
    }

    @Test
    @DisplayName("PUT /fields on a PENDING_APPROVAL invoice returns 409")
    void pendingInvoiceCannotBeCorrected() throws Exception {
        Invoice invoice = saveInvoice(InvoiceStatus.PENDING_APPROVAL);

        mockMvc.perform(put("/api/invoices/" + invoice.getId() + "/fields")
                        .with(user(new InvoiceOpsUserDetails(reviewer))).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(body()))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("Correcting an EXTRACTION_FAILED invoice moves it to NEEDS_REVIEW")
    void extractionFailedCorrectionMovesToReview() throws Exception {
        Invoice invoice = saveInvoice(InvoiceStatus.EXTRACTION_FAILED);

        mockMvc.perform(put("/api/invoices/" + invoice.getId() + "/fields")
                        .with(user(new InvoiceOpsUserDetails(reviewer))).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(body()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("NEEDS_REVIEW"));

        Invoice reloaded = invoiceRepository.findById(invoice.getId()).orElseThrow();
        assertEquals("CORRECTED", reloaded.getInvoiceNumber());
        assertEquals(InvoiceStatus.NEEDS_REVIEW, reloaded.getStatus());
    }
}
