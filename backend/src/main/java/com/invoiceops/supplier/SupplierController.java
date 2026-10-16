package com.invoiceops.supplier;

import com.invoiceops.identity.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/suppliers")
@Tag(name = "Suppliers", description = "Supplier directory management")
public class SupplierController {

    private final SupplierService supplierService;

    public SupplierController(SupplierService supplierService) {
        this.supplierService = supplierService;
    }

    @GetMapping
    @Operation(summary = "List suppliers", description = "Retrieves suppliers for the authenticated user's organisation")
    public ResponseEntity<List<SupplierDto>> listSuppliers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false, defaultValue = "false") Boolean activeOnly) {
        UUID orgId = SecurityUtils.getCurrentOrganisationId();
        return ResponseEntity.ok(supplierService.getSuppliers(orgId, search, activeOnly));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get supplier by ID", description = "Returns a single supplier record within the organisation")
    public ResponseEntity<SupplierDto> getSupplier(@PathVariable UUID id) {
        UUID orgId = SecurityUtils.getCurrentOrganisationId();
        return ResponseEntity.ok(supplierService.getSupplierById(id, orgId));
    }

    @PostMapping
    @Operation(summary = "Create supplier", description = "Registers a new supplier in the current organisation")
    public ResponseEntity<SupplierDto> createSupplier(@Valid @RequestBody CreateSupplierRequest request) {
        UUID orgId = SecurityUtils.getCurrentOrganisationId();
        SupplierDto created = supplierService.createSupplier(request, orgId);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update supplier", description = "Updates supplier details within the current organisation")
    public ResponseEntity<SupplierDto> updateSupplier(
            @PathVariable UUID id,
            @Valid @RequestBody CreateSupplierRequest request) {
        UUID orgId = SecurityUtils.getCurrentOrganisationId();
        return ResponseEntity.ok(supplierService.updateSupplier(id, request, orgId));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Deactivate supplier", description = "Marks a supplier as inactive within the organisation")
    public ResponseEntity<Map<String, String>> deleteSupplier(@PathVariable UUID id) {
        UUID orgId = SecurityUtils.getCurrentOrganisationId();
        supplierService.deleteSupplier(id, orgId);
        return ResponseEntity.ok(Map.of("status", "SUCCESS", "message", "Supplier deactivated successfully"));
    }
}
