package com.invoiceops.invoice;

import com.invoiceops.extraction.FieldSource;
import java.math.BigDecimal;
import java.util.UUID;

public record InvoiceLineItemDto(
        UUID id,
        String description,
        BigDecimal quantity,
        BigDecimal unitPrice,
        BigDecimal lineTotal,
        int sortOrder,
        FieldSource source
) {
    public static InvoiceLineItemDto fromEntity(InvoiceLineItem item) {
        return new InvoiceLineItemDto(
                item.getId(),
                item.getDescription(),
                item.getQuantity(),
                item.getUnitPrice(),
                item.getLineTotal(),
                item.getSortOrder(),
                item.getSource()
        );
    }
}
