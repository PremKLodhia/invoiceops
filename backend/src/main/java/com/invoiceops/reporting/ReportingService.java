package com.invoiceops.reporting;

import com.invoiceops.audit.AuditEvent;
import com.invoiceops.audit.AuditEventDto;
import com.invoiceops.audit.AuditEventRepository;
import com.invoiceops.invoice.Invoice;
import com.invoiceops.invoice.InvoiceRepository;
import com.invoiceops.invoice.InvoiceStatus;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.PrintWriter;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ReportingService {

    private final InvoiceRepository invoiceRepository;
    private final AuditEventRepository auditEventRepository;

    public ReportingService(InvoiceRepository invoiceRepository, AuditEventRepository auditEventRepository) {
        this.invoiceRepository = invoiceRepository;
        this.auditEventRepository = auditEventRepository;
    }

    @Transactional(readOnly = true)
    public DashboardMetricsDto getDashboardMetrics(UUID orgId) {
        long totalInvoices = invoiceRepository.countByOrganisationId(orgId);
        long needsReview = invoiceRepository.countByOrganisationIdAndStatus(orgId, InvoiceStatus.NEEDS_REVIEW);
        long pendingApproval = invoiceRepository.countByOrganisationIdAndStatus(orgId, InvoiceStatus.PENDING_APPROVAL);
        long approved = invoiceRepository.countByOrganisationIdAndStatus(orgId, InvoiceStatus.APPROVED);
        long rejected = invoiceRepository.countByOrganisationIdAndStatus(orgId, InvoiceStatus.REJECTED);
        long failed = invoiceRepository.countByOrganisationIdAndStatus(orgId, InvoiceStatus.EXTRACTION_FAILED);

        long duplicateWarnings = invoiceRepository.countByOrganisationIdAndHasDuplicateWarningTrue(orgId);
        long poMismatches = invoiceRepository.countByOrganisationIdAndHasPoMismatchTrue(orgId);

        // Calculate totals separated strictly by currency code
        Map<String, BigDecimal> totalGrossByCurrency = new HashMap<>();
        List<Object[]> currencyTotals = invoiceRepository.sumGrossAmountByCurrency(orgId);
        for (Object[] row : currencyTotals) {
            String currency = (String) row[0];
            BigDecimal sum = (BigDecimal) row[1];
            if (currency != null && sum != null) {
                totalGrossByCurrency.put(currency, sum);
            }
        }

        // Recent 10 audit activity records
        List<AuditEventDto> recentActivity = auditEventRepository
                .findByOrganisationIdOrderByCreatedAtDesc(orgId, PageRequest.of(0, 10))
                .stream()
                .map(AuditEventDto::fromEntity)
                .toList();

        return new DashboardMetricsDto(
                totalInvoices,
                needsReview,
                pendingApproval,
                approved,
                rejected,
                failed,
                duplicateWarnings,
                poMismatches,
                totalGrossByCurrency,
                recentActivity
        );
    }

    @Transactional(readOnly = true)
    public void exportInvoicesCsv(UUID orgId, HttpServletResponse response) throws IOException {
        response.setContentType("text/csv; charset=UTF-8");
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setHeader("Content-Disposition", "attachment; filename=\"invoices-export.csv\"");

        List<Invoice> invoices = invoiceRepository.findByOrganisationIdOrderByCreatedAtDesc(orgId);

        try (PrintWriter writer = response.getWriter()) {
            // Write CSV Header
            writer.println("Invoice Number,Supplier,Issue Date,Due Date,Currency,Net,Tax,Gross,Status,PO Reference");

            for (Invoice inv : invoices) {
                String supplierName = inv.getSupplier() != null
                        ? inv.getSupplier().getName()
                        : inv.getSupplierNameExtracted();

                String poRef = inv.getPurchaseOrder() != null
                        ? inv.getPurchaseOrder().getPoNumber()
                        : inv.getPoReferenceExtracted();

                StringBuilder sb = new StringBuilder();
                sb.append(sanitizeForCsv(inv.getInvoiceNumber())).append(",");
                sb.append(sanitizeForCsv(supplierName)).append(",");
                sb.append(sanitizeForCsv(inv.getInvoiceDate() != null ? inv.getInvoiceDate().toString() : "")).append(",");
                sb.append(sanitizeForCsv(inv.getDueDate() != null ? inv.getDueDate().toString() : "")).append(",");
                sb.append(sanitizeForCsv(inv.getCurrency())).append(",");
                sb.append(sanitizeForCsv(inv.getNetAmount() != null ? inv.getNetAmount().toPlainString() : "")).append(",");
                sb.append(sanitizeForCsv(inv.getTaxAmount() != null ? inv.getTaxAmount().toPlainString() : "")).append(",");
                sb.append(sanitizeForCsv(inv.getGrossAmount() != null ? inv.getGrossAmount().toPlainString() : "")).append(",");
                sb.append(sanitizeForCsv(inv.getStatus() != null ? inv.getStatus().name() : "")).append(",");
                sb.append(sanitizeForCsv(poRef));

                writer.println(sb);
            }
            writer.flush();
        }
    }

    public String sanitizeForCsv(String value) {
        if (value == null) {
            return "";
        }
        String trimmed = value.trim();
        if (!trimmed.isEmpty()) {
            char firstChar = trimmed.charAt(0);
            if (firstChar == '=' || firstChar == '+' || firstChar == '-' || firstChar == '@' ||
                    firstChar == '\t' || firstChar == '\r') {
                trimmed = "'" + trimmed;
            }
        }
        if (trimmed.contains(",") || trimmed.contains("\"") || trimmed.contains("\n") || trimmed.contains("\r")) {
            trimmed = "\"" + trimmed.replace("\"", "\"\"") + "\"";
        }
        return trimmed;
    }
}
