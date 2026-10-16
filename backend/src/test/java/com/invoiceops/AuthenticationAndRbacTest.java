package com.invoiceops;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.invoiceops.config.DataSeeder;
import com.invoiceops.identity.InvoiceOpsUserDetails;
import com.invoiceops.identity.User;
import com.invoiceops.identity.UserRepository;
import com.invoiceops.invoice.Invoice;
import com.invoiceops.invoice.InvoiceRepository;
import com.invoiceops.invoice.InvoiceStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthenticationAndRbacTest {

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

    @BeforeEach
    void setUp() {
        dataSeeder.seedDemoData();
    }

    @Test
    @DisplayName("Valid login establishes session and returns 200 with user profile")
    void validLoginReturnsOkAndSession() throws Exception {
        Map<String, String> credentials = Map.of(
                "email", "admin@invoiceops.local",
                "password", "DemoAdmin2026!"
        );

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(credentials)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.user.email").value("admin@invoiceops.local"))
                .andExpect(jsonPath("$.user.role").value("ADMIN"))
                .andReturn();

        MockHttpSession session = (MockHttpSession) result.getRequest().getSession(false);
        assertNotNull(session, "HTTP Session should be created on successful login");

        // Verify that /api/auth/me succeeds with the established session
        mockMvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("admin@invoiceops.local"));
    }

    @Test
    @DisplayName("Invalid login returns 401 Unauthorized")
    void invalidLoginReturnsUnauthorized() throws Exception {
        Map<String, String> credentials = Map.of(
                "email", "admin@invoiceops.local",
                "password", "WrongPassword!"
        );

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(credentials)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Unauthenticated access to protected endpoint returns 401")
    void unauthenticatedAccessReturnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/invoices"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("REVIEWER cannot approve invoice (returns 403 Forbidden)")
    void reviewerCannotApproveInvoice() throws Exception {
        User reviewer = userRepository.findByEmail("reviewer@invoiceops.local").orElseThrow();
        Invoice invoice = invoiceRepository.findByOrganisationIdAndInvoiceNumber(reviewer.getOrganisation().getId(), "INV-2026-001")
                .get(0);

        // Put invoice in PENDING_APPROVAL status for testing
        invoice.setStatus(InvoiceStatus.PENDING_APPROVAL);
        invoiceRepository.save(invoice);

        mockMvc.perform(post("/api/invoices/" + invoice.getId() + "/approve")
                        .with(user(new InvoiceOpsUserDetails(reviewer)))
                        .with(csrf()))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("APPROVER can approve invoice in PENDING_APPROVAL")
    void approverCanApproveInvoice() throws Exception {
        User approver = userRepository.findByEmail("approver@invoiceops.local").orElseThrow();
        Invoice invoice = invoiceRepository.findByOrganisationIdAndInvoiceNumber(approver.getOrganisation().getId(), "INV-2026-001")
                .get(0);

        invoice.setStatus(InvoiceStatus.PENDING_APPROVAL);
        invoiceRepository.save(invoice);

        mockMvc.perform(post("/api/invoices/" + invoice.getId() + "/approve")
                        .with(user(new InvoiceOpsUserDetails(approver)))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));
    }

    @Test
    @DisplayName("ADMIN can access organisation dashboard metrics")
    void adminCanAccessDashboard() throws Exception {
        User admin = userRepository.findByEmail("admin@invoiceops.local").orElseThrow();

        mockMvc.perform(get("/api/dashboard")
                        .with(user(new InvoiceOpsUserDetails(admin))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalInvoices").isNumber());
    }
}
