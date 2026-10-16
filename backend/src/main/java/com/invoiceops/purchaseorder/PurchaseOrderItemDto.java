package com.invoiceops.purchaseorder;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PurchaseOrderItemDto(
        UUID id,
        String description,
        BigDecimal quantity,
        BigDecimal unitPrice,
        BigDecimal totalPrice,
        Instant createdAt
) {
    public static PurchaseOrderItemDto fromEntity(PurchaseOrderItem item) {
        return new PurchaseOrderItemDto(
                item.getId(),
                item.getDescription(),
                item.getQuantity(),
                item.getUnitPrice(),
                item.getTotalPrice(),
                item.getCreatedAt()
        );
    }
}
