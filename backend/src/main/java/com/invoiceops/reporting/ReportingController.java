package com.invoiceops.reporting;

import com.invoiceops.identity.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@Tag(name = "Reporting & Analytics", description = "Operational metrics, KPIs, and CSV exports")
public class ReportingController {

    private final ReportingService reportingService;

    public ReportingController(ReportingService reportingService) {
        this.reportingService = reportingService;
    }

    @GetMapping("/dashboard")
    @Operation(summary = "Get dashboard metrics", description = "Returns aggregated financial counts, flags, and currency breakdowns for the user's organisation")
    public ResponseEntity<DashboardMetricsDto> getDashboardMetrics() {
        UUID orgId = SecurityUtils.getCurrentOrganisationId();
        return ResponseEntity.ok(reportingService.getDashboardMetrics(orgId));
    }

    @GetMapping("/export/invoices/csv")
    @Operation(summary = "Export invoices to CSV", description = "Generates and streams a CSV export of all invoices with formula injection sanitization")
    public void exportInvoicesCsv(HttpServletResponse response) throws IOException {
        UUID orgId = SecurityUtils.getCurrentOrganisationId();
        reportingService.exportInvoicesCsv(orgId, response);
    }
}
