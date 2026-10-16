package com.invoiceops.purchaseorder;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record CreatePurchaseOrderRequest(
        UUID supplierId,

        @NotBlank(message = "PO number is required")
        String poNumber,

        String description,

        BigDecimal totalAmount,

        String currency,

        LocalDate issuedDate,

        @Valid
        List<CreatePurchaseOrderItemRequest> lineItems
) {
}
