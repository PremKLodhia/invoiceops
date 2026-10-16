package com.invoiceops.invoice;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record FieldCorrectionRequest(
        UUID supplierId,
        String invoiceNumber,
        LocalDate invoiceDate,
        LocalDate dueDate,
        String currency,
        BigDecimal netAmount,
        BigDecimal taxAmount,
        BigDecimal taxRate,
        BigDecimal grossAmount,
        String poNumber,
        List<LineItemCorrection> lineItems
) {
    public record LineItemCorrection(
            String description,
            BigDecimal quantity,
            BigDecimal unitPrice,
            BigDecimal lineTotal,
            int sortOrder
    ) {}
}
