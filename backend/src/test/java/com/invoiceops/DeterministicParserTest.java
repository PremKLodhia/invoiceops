package com.invoiceops;

import com.invoiceops.extraction.ConfidenceLevel;
import com.invoiceops.extraction.DeterministicInvoiceParser;
import com.invoiceops.extraction.ParsedInvoiceData;
import com.invoiceops.supplier.Supplier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class DeterministicParserTest {

    private DeterministicInvoiceParser parser;
    private List<Supplier> suppliers;

    @BeforeEach
    void setUp() {
        parser = new DeterministicInvoiceParser();
        Supplier s1 = new Supplier(UUID.randomUUID(), "Apex Cloud Technologies Ltd", "billing@apexcloud.co.uk", null, "GB123456789", null);
        Supplier s2 = new Supplier(UUID.randomUUID(), "Northwind Facilities Group", "accounts@northwind.co.uk", null, "GB987654321", null);
        suppliers = List.of(s1, s2);
    }

    @Test
    @DisplayName("Parses standard corporate UK invoice cleanly")
    void testStandardUkInvoice() {
        String invoiceText = """
                Apex Cloud Technologies Ltd
                100 Innovation Way, London, EC2A 4NE
                VAT Reg: GB123456789
                
                TAX INVOICE: INV-2026-8874
                Purchase Order: PO-2026-001
                Invoice Date: 15/01/2026
                Payment Due: 15/02/2026
                
                Description Quantity Unit Price Total
                Cloud Compute Enterprise 2 500.00 1000.00
                Database Dedicated Node 1 200.00 200.00
                
                Subtotal: £1,200.00
                VAT (20%): £240.00
                Total Due: £1,440.00
                """;

        ParsedInvoiceData result = parser.parse(invoiceText, suppliers);

        assertEquals("Apex Cloud Technologies Ltd", result.supplierName());
        assertEquals(ConfidenceLevel.HIGH, result.supplierConfidence());

        assertEquals("INV-2026-8874", result.invoiceNumber());
        assertEquals(ConfidenceLevel.HIGH, result.invoiceNumberConfidence());

        assertEquals("PO-2026-001", result.poReference());
        assertEquals(ConfidenceLevel.HIGH, result.poReferenceConfidence());

        assertEquals(LocalDate.of(2026, 1, 15), result.invoiceDate());
        assertEquals(LocalDate.of(2026, 2, 15), result.dueDate());
        assertEquals("GBP", result.currency());

        assertEquals(new BigDecimal("1200.00"), result.netAmount());
        assertEquals(new BigDecimal("240.00"), result.taxAmount());
        assertEquals(new BigDecimal("1440.00"), result.grossAmount());

        assertNotNull(result.lineItems());
        assertEquals(2, result.lineItems().size());
        assertEquals("Cloud Compute Enterprise", result.lineItems().get(0).description());
        assertEquals(0, new BigDecimal("2").compareTo(result.lineItems().get(0).quantity()));
        assertEquals(new BigDecimal("500.00"), result.lineItems().get(0).unitPrice());
        assertEquals(new BigDecimal("1000.00"), result.lineItems().get(0).lineTotal());
    }

    @Test
    @DisplayName("Parses ISO dates and USD currency")
    void testIsoDateAndUsdCurrency() {
        String invoiceText = """
                Northwind Facilities Group
                Invoice #: INV-US-9912
                Date: 2026-03-01
                Due: 2026-03-31
                
                Net Amount: $800.00
                Tax: $80.00
                Total: $880.00
                """;

        ParsedInvoiceData result = parser.parse(invoiceText, suppliers);

        assertEquals("Northwind Facilities Group", result.supplierName());
        assertEquals("INV-US-9912", result.invoiceNumber());
        assertEquals(LocalDate.of(2026, 3, 1), result.invoiceDate());
        assertEquals(LocalDate.of(2026, 3, 31), result.dueDate());
        assertEquals("USD", result.currency());
        assertEquals(new BigDecimal("800.00"), result.netAmount());
        assertEquals(new BigDecimal("80.00"), result.taxAmount());
        assertEquals(new BigDecimal("880.00"), result.grossAmount());
    }

    @Test
    @DisplayName("Handles empty or unreadable invoice text gracefully")
    void testEmptyText() {
        ParsedInvoiceData result = parser.parse("", suppliers);
        assertNull(result.invoiceNumber());
        assertNull(result.grossAmount());
        assertTrue(result.lineItems().isEmpty());
    }
}
