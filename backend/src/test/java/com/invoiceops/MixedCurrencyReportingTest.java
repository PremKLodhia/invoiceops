package com.invoiceops;

import com.invoiceops.identity.Organisation;
import com.invoiceops.identity.OrganisationRepository;
import com.invoiceops.invoice.Invoice;
import com.invoiceops.invoice.InvoiceRepository;
import com.invoiceops.invoice.InvoiceStatus;
import com.invoiceops.reporting.CurrencyTotalDto;
import com.invoiceops.reporting.DashboardMetricsDto;
import com.invoiceops.reporting.ReportingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class MixedCurrencyReportingTest {

    @Autowired
    private ReportingService reportingService;

    @Autowired
    private OrganisationRepository organisationRepository;

    @Autowired
    private InvoiceRepository invoiceRepository;

    private Organisation testOrg;

    @BeforeEach
    void setUp() {
        testOrg = organisationRepository.save(new Organisation("Global Multi-Currency Trading Ltd"));
    }

    @Test
    @DisplayName("Reporting never combines mixed currencies; separates totals strictly by ISO currency code")
    void testMixedCurrencyReportingIsolation() {
        // 2 GBP invoices: £1,200.50 and £800.25 (Total: £2,000.75)
        createInvoice(testOrg.getId(), "INV-GBP-1", "GBP", new BigDecimal("1200.50"));
        createInvoice(testOrg.getId(), "INV-GBP-2", "GBP", new BigDecimal("800.25"));

        // 1 USD invoice: $5,400.00
        createInvoice(testOrg.getId(), "INV-USD-1", "USD", new BigDecimal("5400.00"));

        // 2 EUR invoices: €3,100.00 and €900.00 (Total: €4,000.00)
        createInvoice(testOrg.getId(), "INV-EUR-1", "EUR", new BigDecimal("3100.00"));
        createInvoice(testOrg.getId(), "INV-EUR-2", "EUR", new BigDecimal("900.00"));

        DashboardMetricsDto metrics = reportingService.getDashboardMetrics(testOrg.getId());

        assertEquals(5, metrics.totalInvoices());
        assertNotNull(metrics.totalGrossByCurrency());

        // Assert strictly separate currency totals
        assertEquals(new BigDecimal("2000.75"), metrics.totalGrossByCurrency().get("GBP"));
        assertEquals(new BigDecimal("5400.00"), metrics.totalGrossByCurrency().get("USD"));
        assertEquals(new BigDecimal("4000.00"), metrics.totalGrossByCurrency().get("EUR"));

        // Verify currency breakdown entries
        assertNotNull(metrics.currencyBreakdown());
        assertEquals(3, metrics.currencyBreakdown().size());

        CurrencyTotalDto gbpTotal = metrics.currencyBreakdown().stream()
                .filter(c -> "GBP".equals(c.currency())).findFirst().orElseThrow();
        assertEquals(2, gbpTotal.count());
        assertEquals(new BigDecimal("2000.75"), gbpTotal.totalAmount());

        CurrencyTotalDto usdTotal = metrics.currencyBreakdown().stream()
                .filter(c -> "USD".equals(c.currency())).findFirst().orElseThrow();
        assertEquals(1, usdTotal.count());
        assertEquals(new BigDecimal("5400.00"), usdTotal.totalAmount());

        CurrencyTotalDto eurTotal = metrics.currencyBreakdown().stream()
                .filter(c -> "EUR".equals(c.currency())).findFirst().orElseThrow();
        assertEquals(2, eurTotal.count());
        assertEquals(new BigDecimal("4000.00"), eurTotal.totalAmount());
    }

    private void createInvoice(UUID orgId, String number, String currency, BigDecimal gross) {
        Invoice inv = new Invoice();
        inv.setOrganisationId(orgId);
        inv.setInvoiceNumber(number);
        inv.setCurrency(currency);
        inv.setGrossAmount(gross);
        inv.setNetAmount(gross.multiply(new BigDecimal("0.8")).setScale(2, java.math.RoundingMode.HALF_UP));
        inv.setTaxAmount(gross.subtract(inv.getNetAmount()));
        inv.setStatus(InvoiceStatus.APPROVED);
        invoiceRepository.save(inv);
    }
}
