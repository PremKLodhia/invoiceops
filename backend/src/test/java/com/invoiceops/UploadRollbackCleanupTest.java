package com.invoiceops;

import com.invoiceops.config.AppProperties;
import com.invoiceops.config.DataSeeder;
import com.invoiceops.identity.User;
import com.invoiceops.identity.UserRepository;
import com.invoiceops.invoice.InvoiceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
@ActiveProfiles("test")
class UploadRollbackCleanupTest {

    @Autowired
    private InvoiceService invoiceService;

    @Autowired
    private DataSeeder dataSeeder;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AppProperties appProperties;

    @Autowired
    private PlatformTransactionManager transactionManager;

    private User reviewer;

    @BeforeEach
    void setUp() {
        dataSeeder.seedDemoData();
        reviewer = userRepository.findByEmail("reviewer@invoiceops.local").orElseThrow();
    }

    private Set<String> storedFiles() throws IOException {
        Path dir = Paths.get(appProperties.getUploadDir()).toAbsolutePath().normalize();
        try (Stream<Path> files = Files.list(dir)) {
            return files.map(p -> p.getFileName().toString()).collect(Collectors.toCollection(HashSet::new));
        }
    }

    private MockMultipartFile pdf() {
        return new MockMultipartFile("file", "rollback-test.pdf", "application/pdf",
                "%PDF-1.4\nnot a real invoice\n%%EOF".getBytes(StandardCharsets.US_ASCII));
    }

    @Test
    @DisplayName("A rolled-back upload leaves no file behind")
    void rolledBackUploadDeletesFile() throws IOException {
        Set<String> before = storedFiles();

        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            invoiceService.uploadInvoice(pdf(), reviewer.getOrganisation().getId(), reviewer.getId());
            status.setRollbackOnly();
        });

        assertEquals(before, storedFiles(), "the stored document should be removed after rollback");
    }

    @Test
    @DisplayName("A committed upload keeps its file")
    void committedUploadKeepsFile() throws IOException {
        Set<String> before = storedFiles();

        invoiceService.uploadInvoice(pdf(), reviewer.getOrganisation().getId(), reviewer.getId());

        Set<String> added = storedFiles();
        added.removeAll(before);
        assertEquals(1, added.size(), "exactly one new stored document is expected");
    }
}
