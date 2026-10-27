package com.invoiceops.config;

import com.invoiceops.identity.InvoiceOpsUserDetails;
import com.invoiceops.identity.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Demo-only operations. Registered only when app.demo-mode=true, and restricted to ADMIN.
 */
@RestController
@RequestMapping("/api/demo")
@ConditionalOnProperty(prefix = "app", name = "demo-mode", havingValue = "true")
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Demo Operations", description = "Endpoints for resetting and managing demo dataset")
public class DemoController {

    private final DataSeeder dataSeeder;

    public DemoController(DataSeeder dataSeeder) {
        this.dataSeeder = dataSeeder;
    }

    @PostMapping("/reset")
    @Operation(summary = "Reset demo dataset",
            description = "Purges and reseeds demo suppliers, POs and invoices. Organisations, users and the audit trail are kept.")
    public ResponseEntity<Map<String, String>> reset() {
        InvoiceOpsUserDetails actor = SecurityUtils.getRequiredCurrentUser();
        dataSeeder.resetDemoData(actor.getOrganisationId(), actor.getUserId(), actor.getUsername());
        return ResponseEntity.ok(Map.of("status", "SUCCESS", "message", "Demo data reset successfully"));
    }
}
