package com.invoiceops.invoice;

import com.invoiceops.identity.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/api/invoices")
@Tag(name = "Invoices", description = "Invoice processing, review, and approval operations")
public class InvoiceController {

    private final InvoiceService invoiceService;

    public InvoiceController(InvoiceService invoiceService) {
        this.invoiceService = invoiceService;
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload invoice document", description = "Uploads a PDF or image invoice and initiates the extraction pipeline")
    public ResponseEntity<InvoiceSummaryDto> upload(@RequestParam("file") MultipartFile file) {
        UUID orgId = SecurityUtils.getCurrentOrganisationId();
        UUID userId = SecurityUtils.getCurrentUserId();
        InvoiceSummaryDto response = invoiceService.uploadInvoice(file, orgId, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @Operation(summary = "List invoices", description = "Returns a paginated list of invoices for the organisation")
    public ResponseEntity<Page<InvoiceSummaryDto>> list(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        UUID orgId = SecurityUtils.getCurrentOrganisationId();
        return ResponseEntity.ok(invoiceService.listInvoices(orgId, status, search, pageable));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get invoice details", description = "Retrieves full invoice details including extracted fields, line items, and validation flags")
    public ResponseEntity<InvoiceDetailDto> getById(@PathVariable UUID id) {
        UUID orgId = SecurityUtils.getCurrentOrganisationId();
        return ResponseEntity.ok(invoiceService.getInvoice(id, orgId));
    }

    @PutMapping("/{id}/fields")
    @Operation(summary = "Correct invoice fields", description = "Updates invoice fields during human-in-the-loop review and re-runs validations")
    public ResponseEntity<InvoiceDetailDto> correctFields(
            @PathVariable UUID id,
            @Valid @RequestBody FieldCorrectionRequest request) {
        UUID orgId = SecurityUtils.getCurrentOrganisationId();
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(invoiceService.correctFields(id, request, orgId, userId));
    }

    @PostMapping("/{id}/submit")
    @Operation(summary = "Submit invoice for approval", description = "Transitions invoice from review to pending approval")
    public ResponseEntity<InvoiceDetailDto> submit(@PathVariable UUID id) {
        UUID orgId = SecurityUtils.getCurrentOrganisationId();
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(invoiceService.submitForApproval(id, orgId, userId));
    }

    @PostMapping("/{id}/approve")
    @Operation(summary = "Approve invoice", description = "Finalizes invoice approval (requires APPROVER or ADMIN role)")
    public ResponseEntity<InvoiceDetailDto> approve(@PathVariable UUID id) {
        UUID orgId = SecurityUtils.getCurrentOrganisationId();
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(invoiceService.approveInvoice(id, orgId, userId));
    }

    @PostMapping("/{id}/reject")
    @Operation(summary = "Reject invoice", description = "Rejects invoice with a mandatory rationale (requires APPROVER or ADMIN role)")
    public ResponseEntity<InvoiceDetailDto> reject(
            @PathVariable UUID id,
            @Valid @RequestBody RejectRequest request) {
        UUID orgId = SecurityUtils.getCurrentOrganisationId();
        UUID userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(invoiceService.rejectInvoice(id, request.reason(), orgId, userId));
    }
}
