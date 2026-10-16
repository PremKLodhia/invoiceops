package com.invoiceops.document;

import com.invoiceops.config.ResourceNotFoundException;
import com.invoiceops.identity.SecurityUtils;
import com.invoiceops.invoice.Invoice;
import com.invoiceops.invoice.InvoiceRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/invoices")
@Tag(name = "Documents", description = "Invoice document streaming and viewing")
public class DocumentController {

    private final InvoiceRepository invoiceRepository;
    private final DocumentStorageService documentStorageService;

    public DocumentController(InvoiceRepository invoiceRepository, DocumentStorageService documentStorageService) {
        this.invoiceRepository = invoiceRepository;
        this.documentStorageService = documentStorageService;
    }

    @GetMapping("/{id}/document")
    @Operation(summary = "Stream invoice document", description = "Streams the uploaded invoice document file with organization ownership checks")
    public ResponseEntity<Resource> getInvoiceDocument(@PathVariable UUID id) {
        UUID orgId = SecurityUtils.getCurrentOrganisationId();
        Invoice invoice = invoiceRepository.findByIdAndOrganisationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice", "id", id));

        Resource resource = documentStorageService.loadDocument(invoice.getStoredFilename());

        MediaType mediaType;
        try {
            mediaType = MediaType.parseMediaType(
                    invoice.getContentType() != null ? invoice.getContentType() : MediaType.APPLICATION_OCTET_STREAM_VALUE
            );
        } catch (Exception e) {
            mediaType = MediaType.APPLICATION_OCTET_STREAM;
        }

        String filename = invoice.getOriginalFilename() != null ? invoice.getOriginalFilename() : "invoice-document";

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .body(resource);
    }
}
