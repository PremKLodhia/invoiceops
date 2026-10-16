package com.invoiceops.reporting;

import com.invoiceops.audit.AuditEventDto;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public record DashboardMetricsDto(
        long totalInvoices,
        long needsReviewCount,
        long pendingApprovalCount,
        long approvedCount,
        long rejectedCount,
        long failedCount,
        long duplicateWarningsCount,
        long poMismatchesCount,
        Map<String, BigDecimal> totalGrossByCurrency,
        List<CurrencyTotalDto> currencyBreakdown,
        List<AuditEventDto> recentActivity
) {
}
