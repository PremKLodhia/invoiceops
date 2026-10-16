package com.invoiceops;

import com.invoiceops.config.DataSeeder;
import com.invoiceops.document.DocumentStorageService;
import com.invoiceops.document.StoredDocument;
import com.invoiceops.identity.InvoiceOpsUserDetails;
import com.invoiceops.identity.Organisation;
import com.invoiceops.identity.OrganisationRepository;
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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OrganisationIsolationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private DataSeeder dataSeeder;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private OrganisationRepository organisationRepository;

    @Autowired
    private InvoiceRepository invoiceRepository;

    @Autowired
    private DocumentStorageService documentStorageService;

    private User acmeUser;
    private User zenithUser;
    private Invoice zenithInvoice;

    @BeforeEach
    void setUp() {
        dataSeeder.seedDemoData();

        acmeUser = userRepository.findByEmail("reviewer@invoiceops.local").orElseThrow();
        zenithUser = userRepository.findByEmail("zenith_user@zenith.local").orElseThrow();
        Organisation zenithOrg = organisationRepository.findByNameIgnoreCase("Zenith Global Logistics").orElseThrow();

        // Create a document and invoice specifically for Zenith
        byte[] pdfContent = "%PDF-1.4 sample zenith invoice".getBytes();
        MockMultipartFile file = new MockMultipartFile("file", "zenith-invoice.pdf", "application/pdf", pdfContent);
        StoredDocument stored = documentStorageService.storeDocument(file);

        zenithInvoice = new Invoice(
                zenithOrg.getId(),
                "zenith-invoice.pdf",
                stored.storedFilename(),
                stored.fileHash(),
                stored.fileSize(),
                stored.contentType(),
                zenithUser
        );
        zenithInvoice.setInvoiceNumber("ZENITH-INV-999");
        zenithInvoice.setStatus(InvoiceStatus.NEEDS_REVIEW);
        zenithInvoice = invoiceRepository.save(zenithInvoice);
    }

    @Test
    @DisplayName("Acme user cannot access Zenith invoice by ID (returns 404)")
    void acmeUserCannotAccessZenithInvoice() throws Exception {
        mockMvc.perform(get("/api/invoices/" + zenithInvoice.getId())
                        .with(user(new InvoiceOpsUserDetails(acmeUser))))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Acme user listing invoices never sees Zenith invoices")
    void acmeUserListDoesNotContainZenithInvoices() throws Exception {
        mockMvc.perform(get("/api/invoices")
                        .with(user(new InvoiceOpsUserDetails(acmeUser))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].invoiceNumber", not(hasItem("ZENITH-INV-999"))));
    }

    @Test
    @DisplayName("Acme user cannot download Zenith document (returns 404)")
    void acmeUserCannotDownloadZenithDocument() throws Exception {
        mockMvc.perform(get("/api/invoices/" + zenithInvoice.getId() + "/document")
                        .with(user(new InvoiceOpsUserDetails(acmeUser))))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Zenith user can access their own invoice")
    void zenithUserCanAccessOwnInvoice() throws Exception {
        mockMvc.perform(get("/api/invoices/" + zenithInvoice.getId())
                        .with(user(new InvoiceOpsUserDetails(zenithUser))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.invoiceNumber").value("ZENITH-INV-999"));
    }

    @Test
    @DisplayName("Cross-org random UUID lookup returns 404 Not Found")
    void nonExistentInvoiceReturnsNotFound() throws Exception {
        UUID randomId = UUID.randomUUID();
        mockMvc.perform(get("/api/invoices/" + randomId)
                        .with(user(new InvoiceOpsUserDetails(acmeUser))))
                .andExpect(status().isNotFound());
    }
}
