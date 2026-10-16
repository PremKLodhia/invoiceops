package com.invoiceops.invoice;

import jakarta.validation.constraints.NotBlank;

public record RejectRequest(
        @NotBlank(message = "Rejection reason is required")
        String reason
) {
}
