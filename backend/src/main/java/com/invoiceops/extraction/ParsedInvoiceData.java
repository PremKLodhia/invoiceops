package com.invoiceops.extraction;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record ParsedInvoiceData(
        String supplierName,
        ConfidenceLevel supplierConfidence,
        String invoiceNumber,
        ConfidenceLevel invoiceNumberConfidence,
        LocalDate invoiceDate,
        ConfidenceLevel invoiceDateConfidence,
        LocalDate dueDate,
        ConfidenceLevel dueDateConfidence,
        String currency,
        ConfidenceLevel currencyConfidence,
        BigDecimal netAmount,
        ConfidenceLevel netAmountConfidence,
        BigDecimal taxAmount,
        ConfidenceLevel taxAmountConfidence,
        BigDecimal taxRate,
        BigDecimal grossAmount,
        ConfidenceLevel grossAmountConfidence,
        String poReference,
        ConfidenceLevel poReferenceConfidence,
        List<ParsedLineItem> lineItems
) {
    public record ParsedLineItem(
            String description,
            BigDecimal quantity,
            BigDecimal unitPrice,
            BigDecimal lineTotal,
            int sortOrder
    ) {}
}
