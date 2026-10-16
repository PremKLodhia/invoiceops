package com.invoiceops.audit;

import com.invoiceops.identity.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/audit-events")
@Tag(name = "Audit Events", description = "Organisation audit and compliance log")
public class AuditController {

    private final AuditService auditService;

    public AuditController(AuditService auditService) {
        this.auditService = auditService;
    }

    @GetMapping
    @Operation(summary = "List audit events", description = "Returns recent compliance audit events for the authenticated organisation")
    public ResponseEntity<List<AuditEventDto>> list(@RequestParam(defaultValue = "50") int limit) {
        UUID orgId = SecurityUtils.getCurrentOrganisationId();
        return ResponseEntity.ok(auditService.getEvents(orgId, limit));
    }
}
