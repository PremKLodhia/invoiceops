package com.invoiceops;

import com.invoiceops.config.DataSeeder;
import com.invoiceops.config.DemoController;
import com.invoiceops.identity.InvoiceOpsUserDetails;
import com.invoiceops.identity.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** The test profile runs with app.demo-mode=false, so the demo endpoint must not exist. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DemoModeDisabledTest {

    @Autowired
    private ApplicationContext context;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private DataSeeder dataSeeder;

    @Autowired
    private UserRepository userRepository;

    @Test
    @DisplayName("DemoController is not registered when demo mode is off")
    void controllerAbsentWhenDemoModeOff() throws Exception {
        assertTrue(context.getBeansOfType(DemoController.class).isEmpty());

        dataSeeder.seedDemoData();
        InvoiceOpsUserDetails admin = new InvoiceOpsUserDetails(userRepository.findByEmail("admin@invoiceops.local").orElseThrow());
        mockMvc.perform(post("/api/demo/reset").with(user(admin)).with(csrf()))
                .andExpect(status().isNotFound());
    }
}
