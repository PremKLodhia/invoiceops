package com.invoiceops;

import com.invoiceops.reporting.ReportingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CsvFormulaInjectionTest {

    private ReportingService reportingService;

    @BeforeEach
    void setUp() {
        reportingService = new ReportingService(null, null);
    }

    @Test
    @DisplayName("Formula injection payload starting with '=' is sanitized with leading single quote")
    void testEqualsFormulaSanitization() {
        String payload = "=cmd|'/C calc'!A0";
        String sanitized = reportingService.sanitizeForCsv(payload);
        assertTrue(sanitized.startsWith("'="), "Formula starting with '=' must be prefixed with a single quote");
    }

    @Test
    @DisplayName("Formula injection payload starting with '-' is sanitized with leading single quote")
    void testMinusFormulaSanitization() {
        String payload = "-5+2";
        String sanitized = reportingService.sanitizeForCsv(payload);
        assertTrue(sanitized.startsWith("'-"), "Formula starting with '-' must be prefixed with a single quote");
    }

    @Test
    @DisplayName("Formula injection payload starting with '+' is sanitized with leading single quote")
    void testPlusFormulaSanitization() {
        String payload = "+cmd";
        String sanitized = reportingService.sanitizeForCsv(payload);
        assertTrue(sanitized.startsWith("'+"), "Formula starting with '+' must be prefixed with a single quote");
    }

    @Test
    @DisplayName("Formula injection payload starting with '@' is sanitized with leading single quote")
    void testAtSignFormulaSanitization() {
        String payload = "@SUM(1+1)";
        String sanitized = reportingService.sanitizeForCsv(payload);
        assertTrue(sanitized.startsWith("'@"), "Formula starting with '@' must be prefixed with a single quote");
    }

    @Test
    @DisplayName("Values containing commas or double quotes are wrapped and properly escaped")
    void testCommasAndQuotesEscaping() {
        String value = "Apex Cloud Technologies, \"UK\" Branch";
        String sanitized = reportingService.sanitizeForCsv(value);
        assertEquals("\"Apex Cloud Technologies, \"\"UK\"\" Branch\"", sanitized);
    }

    @Test
    @DisplayName("Formula injection payload starting with tab or carriage return is sanitized")
    void testTabAndCarriageReturnSanitization() {
        String payloadTab = "\t=1+1";
        String sanitizedTab = reportingService.sanitizeForCsv(payloadTab);
        assertTrue(sanitizedTab.startsWith("'\t"), "Payload starting with tab must be prefixed with single quote");

        String payloadCr = "\r+cmd";
        String sanitizedCr = reportingService.sanitizeForCsv(payloadCr);
        assertTrue(sanitizedCr.contains("'\r"), "Payload starting with CR must be prefixed with single quote");
    }

    @Test
    @DisplayName("Values containing newlines are wrapped in quotes and escaped")
    void testNewlinesEscaping() {
        String multilineValue = "Line 1\nLine 2\r\nLine 3";
        String sanitized = reportingService.sanitizeForCsv(multilineValue);
        assertTrue(sanitized.startsWith("\"") && sanitized.endsWith("\""), "Multiline field must be wrapped in quotes");
        assertTrue(sanitized.contains("Line 1\nLine 2"));
    }

    @Test
    @DisplayName("Normal safe alphanumeric values remain untouched")
    void testSafeAlphanumeric() {
        String value = "INV-2026-001";
        String sanitized = reportingService.sanitizeForCsv(value);
        assertEquals("INV-2026-001", sanitized);
    }
}
