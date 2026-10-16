package com.invoiceops.purchaseorder;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record PurchaseOrderDto(
        UUID id,
        UUID organisationId,
        UUID supplierId,
        String supplierName,
        String poNumber,
        String description,
        BigDecimal totalAmount,
        String currency,
        PurchaseOrderStatus status,
        LocalDate issuedDate,
        List<PurchaseOrderItemDto> lineItems,
        Instant createdAt,
        Instant updatedAt
) {
    public static PurchaseOrderDto fromEntity(PurchaseOrder po) {
        List<PurchaseOrderItemDto> items = po.getLineItems() != null
                ? po.getLineItems().stream().map(PurchaseOrderItemDto::fromEntity).toList()
                : List.of();

        return new PurchaseOrderDto(
                po.getId(),
                po.getOrganisationId(),
                po.getSupplier() != null ? po.getSupplier().getId() : null,
                po.getSupplier() != null ? po.getSupplier().getName() : null,
                po.getPoNumber(),
                po.getDescription(),
                po.getTotalAmount(),
                po.getCurrency(),
                po.getStatus(),
                po.getIssuedDate(),
                items,
                po.getCreatedAt(),
                po.getUpdatedAt()
        );
    }
}
