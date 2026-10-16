package com.invoiceops.invoice;

import com.fasterxml.jackson.annotation.JsonAlias;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record FieldCorrectionRequest(
        UUID supplierId,
        String supplierName,
        String invoiceNumber,
        LocalDate invoiceDate,
        LocalDate dueDate,
        String currency,
        BigDecimal netAmount,
        BigDecimal taxAmount,
        BigDecimal taxRate,
        BigDecimal grossAmount,
        @JsonAlias({"poReference", "poNumber"})
        String poNumber,
        List<LineItemCorrection> lineItems
) {
    public record LineItemCorrection(
            String description,
            BigDecimal quantity,
            BigDecimal unitPrice,
            BigDecimal lineTotal,
            Integer sortOrder
    ) {
        public int getEffectiveSortOrder(int defaultOrder) {
            return sortOrder != null ? sortOrder : defaultOrder;
        }
    }
}
