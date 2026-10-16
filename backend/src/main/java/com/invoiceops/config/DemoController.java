package com.invoiceops.config;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/demo")
@Tag(name = "Demo Operations", description = "Endpoints for resetting and managing demo dataset")
public class DemoController {

    private final DataSeeder dataSeeder;

    public DemoController(DataSeeder dataSeeder) {
        this.dataSeeder = dataSeeder;
    }

    @PostMapping("/reset")
    @Operation(summary = "Reset demo dataset", description = "Purges and reseeds demo organisations, users, suppliers, POs, and invoices")
    public ResponseEntity<Map<String, String>> reset() {
        dataSeeder.resetDemoData();
        return ResponseEntity.ok(Map.of("status", "SUCCESS", "message", "Demo data reset successfully"));
    }
}
