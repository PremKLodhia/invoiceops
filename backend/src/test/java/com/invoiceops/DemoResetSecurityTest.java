package com.invoiceops;

import com.invoiceops.audit.AuditEvent;
import com.invoiceops.audit.AuditEventRepository;
import com.invoiceops.identity.InvoiceOpsUserDetails;
import com.invoiceops.identity.User;
import com.invoiceops.identity.UserRepository;
import com.invoiceops.invoice.InvoiceRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * /api/demo/reset with demo mode on. Uses its own in-memory database so the reset cannot
 * disturb the shared test database.
 */
@SpringBootTest(properties = {
        "app.demo-mode=true",
        "spring.datasource.url=jdbc:h2:mem:invoiceops_demo_test;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DemoResetSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private InvoiceRepository invoiceRepository;

    @Autowired
    private AuditEventRepository auditEventRepository;

    private InvoiceOpsUserDetails as(String email) {
        User u = userRepository.findByEmail(email).orElseThrow();
        return new InvoiceOpsUserDetails(u);
    }

    @Test
    @DisplayName("Unauthenticated reset is rejected with 401")
    void unauthenticatedResetIsUnauthorized() throws Exception {
        mockMvc.perform(post("/api/demo/reset").with(csrf()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Non-admin reset is rejected with 403")
    void nonAdminResetIsForbidden() throws Exception {
        mockMvc.perform(post("/api/demo/reset").with(user(as("reviewer@invoiceops.local"))).with(csrf()))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/demo/reset").with(user(as("approver@invoiceops.local"))).with(csrf()))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Reset is no longer CSRF-exempt")
    void resetWithoutCsrfTokenIsForbidden() throws Exception {
        mockMvc.perform(post("/api/demo/reset").with(user(as("admin@invoiceops.local"))))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Admin reset reseeds invoices, keeps prior audit events and records DEMO_RESET")
    void adminResetKeepsAuditHistory() throws Exception {
        List<AuditEvent> before = auditEventRepository.findAll();
        assertTrue(before.size() > 0, "seeding should have written audit events");

        mockMvc.perform(post("/api/demo/reset").with(user(as("admin@invoiceops.local"))).with(csrf()))
                .andExpect(status().isOk());

        List<AuditEvent> after = auditEventRepository.findAll();
        List<java.util.UUID> afterIds = after.stream().map(AuditEvent::getId).toList();
        before.forEach(e -> assertTrue(afterIds.contains(e.getId()), "audit event " + e.getAction() + " was deleted"));
        assertTrue(after.stream().anyMatch(e -> "DEMO_RESET".equals(e.getAction())), "DEMO_RESET event missing");
        assertEquals(6, invoiceRepository.count(), "demo invoices should be reseeded");
    }
}
