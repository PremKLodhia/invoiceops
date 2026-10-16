package com.invoiceops.supplier;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateSupplierRequest(
        @NotBlank(message = "Supplier name is required")
        @Size(max = 255, message = "Supplier name must not exceed 255 characters")
        String name,

        @Email(message = "Contact email must be valid")
        String contactEmail,

        String address,

        @Size(max = 100, message = "Tax ID must not exceed 100 characters")
        String taxId,

        String notes
) {
}
