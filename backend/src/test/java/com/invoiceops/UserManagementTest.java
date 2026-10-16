package com.invoiceops;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.invoiceops.config.DataSeeder;
import com.invoiceops.identity.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class UserManagementTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private OrganisationRepository organisationRepository;

    @Autowired
    private DataSeeder dataSeeder;

    @Autowired
    private ObjectMapper objectMapper;

    private User admin;
    private User reviewer;
    private User zenithUser;

    @BeforeEach
    void setUp() {
        dataSeeder.seedDemoData();
        admin = userRepository.findByEmail("admin@invoiceops.local").orElseThrow();
        reviewer = userRepository.findByEmail("reviewer@invoiceops.local").orElseThrow();
        zenithUser = userRepository.findByEmail("zenith_user@zenith.local").orElseThrow();
    }

    @Test
    @DisplayName("ADMIN can list organisation users")
    void adminCanListUsers() throws Exception {
        mockMvc.perform(get("/api/users")
                        .with(user(new InvoiceOpsUserDetails(admin))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(3))))
                .andExpect(jsonPath("$[*].email", hasItem("admin@invoiceops.local")))
                .andExpect(jsonPath("$[*].email", not(hasItem("zenith_user@zenith.local"))));
    }

    @Test
    @DisplayName("REVIEWER cannot access user management (returns 403 Forbidden)")
    void reviewerCannotAccessUsers() throws Exception {
        mockMvc.perform(get("/api/users")
                        .with(user(new InvoiceOpsUserDetails(reviewer))))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("ADMIN can create a new reviewer in organisation")
    void adminCanCreateUser() throws Exception {
        CreateUserRequest request = new CreateUserRequest(
                "new_operator@invoiceops.local",
                "New Finance Operator",
                UserRole.REVIEWER,
                "StrongPass2026!"
        );

        mockMvc.perform(post("/api/users")
                        .with(csrf())
                        .with(user(new InvoiceOpsUserDetails(admin)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("new_operator@invoiceops.local"))
                .andExpect(jsonPath("$.fullName").value("New Finance Operator"))
                .andExpect(jsonPath("$.role").value("REVIEWER"))
                .andExpect(jsonPath("$.active").value(true));
    }

    @Test
    @DisplayName("ADMIN cannot deactivate own account")
    void adminCannotDeactivateSelf() throws Exception {
        mockMvc.perform(put("/api/users/" + admin.getId() + "/status")
                        .with(csrf())
                        .with(user(new InvoiceOpsUserDetails(admin)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("active", false))))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("ADMIN cannot modify users of another organisation")
    void adminCannotModifyUserOfOtherOrg() throws Exception {
        mockMvc.perform(put("/api/users/" + zenithUser.getId() + "/status")
                        .with(csrf())
                        .with(user(new InvoiceOpsUserDetails(admin)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("active", false))))
                .andExpect(status().isNotFound());
    }
}
