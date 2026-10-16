package com.invoiceops.purchaseorder;

import com.invoiceops.identity.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/purchase-orders")
@Tag(name = "Purchase Orders", description = "Purchase order registry for matching")
public class PurchaseOrderController {

    private final PurchaseOrderService purchaseOrderService;

    public PurchaseOrderController(PurchaseOrderService purchaseOrderService) {
        this.purchaseOrderService = purchaseOrderService;
    }

    @GetMapping
    @Operation(summary = "List purchase orders", description = "Returns all purchase orders in the user's organisation")
    public ResponseEntity<List<PurchaseOrderDto>> list() {
        UUID orgId = SecurityUtils.getCurrentOrganisationId();
        return ResponseEntity.ok(purchaseOrderService.listPurchaseOrders(orgId));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get purchase order by ID", description = "Returns a single purchase order with line items")
    public ResponseEntity<PurchaseOrderDto> getById(@PathVariable UUID id) {
        UUID orgId = SecurityUtils.getCurrentOrganisationId();
        return ResponseEntity.ok(purchaseOrderService.getPurchaseOrder(id, orgId));
    }

    @PostMapping
    @Operation(summary = "Create purchase order", description = "Registers a new purchase order with line items")
    public ResponseEntity<PurchaseOrderDto> create(@Valid @RequestBody CreatePurchaseOrderRequest request) {
        UUID orgId = SecurityUtils.getCurrentOrganisationId();
        PurchaseOrderDto created = purchaseOrderService.createPurchaseOrder(request, orgId);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
}
