package com.invoiceops.extraction;

import com.invoiceops.supplier.Supplier;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class DeterministicInvoiceParser {

    private static final List<DateTimeFormatter> DATE_FORMATTERS = List.of(
            DateTimeFormatter.ofPattern("yyyy-MM-dd"),
            DateTimeFormatter.ofPattern("dd/MM/yyyy"),
            DateTimeFormatter.ofPattern("dd-MM-yyyy"),
            DateTimeFormatter.ofPattern("d/M/yyyy"),
            DateTimeFormatter.ofPattern("d-M-yyyy"),
            DateTimeFormatter.ofPattern("yyyy/MM/dd"),
            DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.ENGLISH),
            DateTimeFormatter.ofPattern("d MMM yyyy", Locale.ENGLISH)
    );

    private static final Pattern INVOICE_NUMBER_PATTERN = Pattern.compile(
            "(?i)(?:tax\\s+invoice\\s*[:.#]?|invoice\\s*(?:number|no|#|id)?|inv\\s*#?)\\s*[:.]?\\s*([A-Za-z0-9\\-_/]+)",
            Pattern.MULTILINE
    );

    private static final Pattern STANDALONE_INV_PATTERN = Pattern.compile(
            "\\b(INV-[A-Za-z0-9\\-_]+)\\b",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern PO_REF_PATTERN = Pattern.compile(
            "(?i)(?:purchase\\s*order(?:\\s*no|\\s*number)?|po\\s*(?:number|no|ref|reference|#)?)\\s*[:.]?\\s*([A-Za-z0-9\\-_/]+)",
            Pattern.MULTILINE
    );

    private static final Pattern STANDALONE_PO_PATTERN = Pattern.compile(
            "\\b(PO-[A-Za-z0-9\\-_]+)\\b",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern INVOICE_DATE_PATTERN = Pattern.compile(
            "(?i)(?:invoice\\s*date|date\\s*of\\s*issue|issue\\s*date|dated|date)\\s*[:.]?\\s*([0-9]{1,4}[-/\\.][0-9]{1,2}[-/\\.][0-9]{1,4}|[0-9]{1,2}\\s+[A-Za-z]{3,9}\\s+[0-9]{4})",
            Pattern.MULTILINE
    );

    private static final Pattern DUE_DATE_PATTERN = Pattern.compile(
            "(?i)(?:due\\s*date|payment\\s*due|due\\s*by|pay\\s*by|due)\\s*[:.]?\\s*([0-9]{1,4}[-/\\.][0-9]{1,2}[-/\\.][0-9]{1,4}|[0-9]{1,2}\\s+[A-Za-z]{3,9}\\s+[0-9]{4})",
            Pattern.MULTILINE
    );

    private static final Pattern NET_AMOUNT_PATTERN = Pattern.compile(
            "(?i)(?:subtotal|sub-total|net\\s*amount|net\\s*total|net)\\s*[:.]?\\s*[£$€]?\\s*([0-9,]+\\.[0-9]{2})",
            Pattern.MULTILINE
    );

    private static final Pattern TAX_WITH_RATE_PATTERN = Pattern.compile(
            "(?i)(?:vat|tax|gst)\\s*(?:\\(?\\s*(\\d+(?:\\.\\d+)?)\\s*%\\s*\\)?)?\\s*[:.]?\\s*[£$€]?\\s*([0-9,]+\\.[0-9]{2})",
            Pattern.MULTILINE
    );

    private static final Pattern GROSS_AMOUNT_PATTERN = Pattern.compile(
            "(?i)(?:total\\s*due|amount\\s*due|balance\\s*due|invoice\\s*total|gross\\s*amount|gross\\s*total|total)\\s*[:.]?\\s*[£$€]?\\s*([0-9,]+\\.[0-9]{2})",
            Pattern.MULTILINE
    );

    private static final Pattern LINE_ITEM_ROW_PATTERN = Pattern.compile(
            "^(.*?)\\s+(\\d+(?:\\.\\d+)?)\\s+[£$€]?\\s*([0-9,]+\\.[0-9]{2})\\s+[£$€]?\\s*([0-9,]+\\.[0-9]{2})$",
            Pattern.MULTILINE
    );

    public ParsedInvoiceData parse(String rawText, List<Supplier> knownSuppliers) {
        if (rawText == null || rawText.isBlank()) {
            return new ParsedInvoiceData(
                    null, ConfidenceLevel.UNVERIFIED,
                    null, ConfidenceLevel.UNVERIFIED,
                    null, ConfidenceLevel.UNVERIFIED,
                    null, ConfidenceLevel.UNVERIFIED,
                    "GBP", ConfidenceLevel.LOW,
                    null, ConfidenceLevel.UNVERIFIED,
                    null, ConfidenceLevel.UNVERIFIED,
                    null,
                    null, ConfidenceLevel.UNVERIFIED,
                    null, ConfidenceLevel.UNVERIFIED,
                    List.of()
            );
        }

        // 1. Supplier Name
        String supplierName = null;
        ConfidenceLevel supplierConfidence = ConfidenceLevel.UNVERIFIED;

        if (knownSuppliers != null && !knownSuppliers.isEmpty()) {
            for (Supplier supplier : knownSuppliers) {
                if (containsIgnoreCase(rawText, supplier.getName())) {
                    supplierName = supplier.getName();
                    supplierConfidence = ConfidenceLevel.HIGH;
                    break;
                }
            }
        }

        if (supplierName == null) {
            supplierName = extractFallbackSupplier(rawText);
            if (supplierName != null) {
                supplierConfidence = ConfidenceLevel.LOW;
            }
        }

        // 2. Invoice Number
        String invoiceNumber = null;
        ConfidenceLevel invoiceNumberConfidence = ConfidenceLevel.UNVERIFIED;

        Matcher invMatcher = INVOICE_NUMBER_PATTERN.matcher(rawText);
        if (invMatcher.find()) {
            String candidate = invMatcher.group(1).trim();
            if (isValidInvoiceNumber(candidate)) {
                invoiceNumber = candidate;
                invoiceNumberConfidence = ConfidenceLevel.HIGH;
            }
        }

        if (invoiceNumber == null) {
            Matcher standaloneInv = STANDALONE_INV_PATTERN.matcher(rawText);
            if (standaloneInv.find()) {
                invoiceNumber = standaloneInv.group(1).trim();
                invoiceNumberConfidence = ConfidenceLevel.HIGH;
            }
        }

        // 3. Purchase Order Reference
        String poRef = null;
        ConfidenceLevel poRefConfidence = ConfidenceLevel.UNVERIFIED;

        Matcher poMatcher = PO_REF_PATTERN.matcher(rawText);
        if (poMatcher.find()) {
            String candidate = poMatcher.group(1).trim();
            if (isValidPoNumber(candidate)) {
                poRef = candidate;
                poRefConfidence = ConfidenceLevel.HIGH;
            }
        }

        if (poRef == null) {
            Matcher standalonePo = STANDALONE_PO_PATTERN.matcher(rawText);
            if (standalonePo.find()) {
                poRef = standalonePo.group(1).trim();
                poRefConfidence = ConfidenceLevel.HIGH;
            }
        }

        // 4. Dates
        LocalDate invoiceDate = null;
        ConfidenceLevel invoiceDateConfidence = ConfidenceLevel.UNVERIFIED;

        Matcher invDateMatcher = INVOICE_DATE_PATTERN.matcher(rawText);
        if (invDateMatcher.find()) {
            invoiceDate = parseDate(invDateMatcher.group(1).trim());
            if (invoiceDate != null) {
                invoiceDateConfidence = ConfidenceLevel.HIGH;
            }
        }

        LocalDate dueDate = null;
        ConfidenceLevel dueDateConfidence = ConfidenceLevel.UNVERIFIED;

        Matcher dueDateMatcher = DUE_DATE_PATTERN.matcher(rawText);
        if (dueDateMatcher.find()) {
            dueDate = parseDate(dueDateMatcher.group(1).trim());
            if (dueDate != null) {
                dueDateConfidence = ConfidenceLevel.HIGH;
            }
        }

        // 5. Currency
        String currency = "GBP";
        ConfidenceLevel currencyConfidence = ConfidenceLevel.LOW;
        if (rawText.contains("£") || rawText.toUpperCase().contains("GBP")) {
            currency = "GBP";
            currencyConfidence = ConfidenceLevel.HIGH;
        } else if (rawText.contains("$") || rawText.toUpperCase().contains("USD")) {
            currency = "USD";
            currencyConfidence = ConfidenceLevel.HIGH;
        } else if (rawText.contains("€") || rawText.toUpperCase().contains("EUR")) {
            currency = "EUR";
            currencyConfidence = ConfidenceLevel.HIGH;
        }

        // 6. Amounts
        BigDecimal netAmount = null;
        ConfidenceLevel netConfidence = ConfidenceLevel.UNVERIFIED;
        Matcher netMatcher = NET_AMOUNT_PATTERN.matcher(rawText);
        if (netMatcher.find()) {
            netAmount = parseAmount(netMatcher.group(1));
            if (netAmount != null) {
                netConfidence = ConfidenceLevel.HIGH;
            }
        }

        BigDecimal taxAmount = null;
        BigDecimal taxRate = null;
        ConfidenceLevel taxConfidence = ConfidenceLevel.UNVERIFIED;
        Matcher taxMatcher = TAX_WITH_RATE_PATTERN.matcher(rawText);
        if (taxMatcher.find()) {
            if (taxMatcher.group(1) != null) {
                try {
                    taxRate = new BigDecimal(taxMatcher.group(1));
                } catch (Exception ignored) {
                }
            }
            taxAmount = parseAmount(taxMatcher.group(2));
            if (taxAmount != null) {
                taxConfidence = ConfidenceLevel.HIGH;
            }
        }

        BigDecimal grossAmount = null;
        ConfidenceLevel grossConfidence = ConfidenceLevel.UNVERIFIED;
        Matcher grossMatcher = GROSS_AMOUNT_PATTERN.matcher(rawText);
        // Find the last or best match for total
        while (grossMatcher.find()) {
            BigDecimal candidate = parseAmount(grossMatcher.group(1));
            if (candidate != null) {
                grossAmount = candidate;
                grossConfidence = ConfidenceLevel.HIGH;
            }
        }

        // 7. Line Items
        List<ParsedInvoiceData.ParsedLineItem> lineItems = parseLineItems(rawText);

        // Cross-verify amounts if missing
        if (netAmount == null && lineItems != null && !lineItems.isEmpty()) {
            BigDecimal sumItems = BigDecimal.ZERO;
            for (ParsedInvoiceData.ParsedLineItem item : lineItems) {
                if (item.lineTotal() != null) {
                    sumItems = sumItems.add(item.lineTotal());
                }
            }
            if (sumItems.compareTo(BigDecimal.ZERO) > 0) {
                netAmount = sumItems;
                netConfidence = ConfidenceLevel.MEDIUM;
            }
        }

        if (netAmount != null && taxAmount != null && grossAmount == null) {
            grossAmount = netAmount.add(taxAmount);
            grossConfidence = ConfidenceLevel.MEDIUM;
        } else if (grossAmount != null && netAmount != null && taxAmount == null) {
            taxAmount = grossAmount.subtract(netAmount);
            taxConfidence = ConfidenceLevel.MEDIUM;
        }

        return new ParsedInvoiceData(
                supplierName, supplierConfidence,
                invoiceNumber, invoiceNumberConfidence,
                invoiceDate, invoiceDateConfidence,
                dueDate, dueDateConfidence,
                currency, currencyConfidence,
                netAmount, netConfidence,
                taxAmount, taxConfidence,
                taxRate,
                grossAmount, grossConfidence,
                poRef, poRefConfidence,
                lineItems
        );
    }

    private List<ParsedInvoiceData.ParsedLineItem> parseLineItems(String rawText) {
        List<ParsedInvoiceData.ParsedLineItem> items = new ArrayList<>();
        String[] lines = rawText.split("\\r?\\n");
        int order = 0;

        for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.isEmpty() || isHeaderOrFooterLine(trimmed)) {
                continue;
            }

            Matcher rowMatcher = LINE_ITEM_ROW_PATTERN.matcher(trimmed);
            if (rowMatcher.matches()) {
                String desc = rowMatcher.group(1).trim();
                BigDecimal qty = parseAmount(rowMatcher.group(2));
                BigDecimal unitPrice = parseAmount(rowMatcher.group(3));
                BigDecimal total = parseAmount(rowMatcher.group(4));

                if (!desc.isEmpty() && qty != null && unitPrice != null && total != null) {
                    items.add(new ParsedInvoiceData.ParsedLineItem(desc, qty, unitPrice, total, order++));
                }
            }
        }

        return items;
    }

    private boolean isHeaderOrFooterLine(String line) {
        String lower = line.toLowerCase();
        return lower.contains("description") && (lower.contains("qty") || lower.contains("quantity"))
                || lower.startsWith("subtotal") || lower.startsWith("total") || lower.startsWith("vat")
                || lower.startsWith("invoice") || lower.startsWith("page ");
    }

    private String extractFallbackSupplier(String rawText) {
        String[] lines = rawText.split("\\r?\\n");
        for (String line : lines) {
            String trimmed = line.trim();
            if (!trimmed.isEmpty() && !trimmed.toLowerCase().contains("invoice") &&
                    !trimmed.toLowerCase().contains("page") && trimmed.length() > 2 && trimmed.length() < 100) {
                return trimmed;
            }
        }
        return null;
    }

    private LocalDate parseDate(String rawDate) {
        if (rawDate == null || rawDate.isBlank()) {
            return null;
        }
        String cleaned = rawDate.replaceAll("(?i)(?:st|nd|rd|th)", "").trim();
        for (DateTimeFormatter formatter : DATE_FORMATTERS) {
            try {
                return LocalDate.parse(cleaned, formatter);
            } catch (DateTimeParseException ignored) {
            }
        }
        return null;
    }

    private BigDecimal parseAmount(String rawAmount) {
        if (rawAmount == null) return null;
        try {
            String cleaned = rawAmount.replaceAll("[^0-9.]", "");
            if (cleaned.isEmpty()) return null;
            return new BigDecimal(cleaned).setScale(2, RoundingMode.HALF_UP);
        } catch (Exception e) {
            return null;
        }
    }

    private boolean isValidInvoiceNumber(String str) {
        if (str == null || str.isBlank()) return false;
        String lower = str.toLowerCase();
        return !lower.equals("date") && !lower.equals("to") && !lower.equals("from") && str.length() >= 2;
    }

    private boolean isValidPoNumber(String str) {
        if (str == null || str.isBlank()) return false;
        String lower = str.toLowerCase();
        return !lower.equals("date") && !lower.equals("to") && !lower.equals("from") && str.length() >= 2;
    }

    private boolean containsIgnoreCase(String text, String term) {
        if (text == null || term == null || term.isBlank()) return false;
        return Pattern.compile(Pattern.quote(term), Pattern.CASE_INSENSITIVE).matcher(text).find();
    }
}
