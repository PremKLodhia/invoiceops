package com.invoiceops.supplier;

import java.time.Instant;
import java.util.UUID;

public record SupplierDto(
        UUID id,
        UUID organisationId,
        String name,
        String contactEmail,
        String address,
        String taxId,
        String notes,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {
    public static SupplierDto fromEntity(Supplier supplier) {
        return new SupplierDto(
                supplier.getId(),
                supplier.getOrganisationId(),
                supplier.getName(),
                supplier.getContactEmail(),
                supplier.getAddress(),
                supplier.getTaxId(),
                supplier.getNotes(),
                supplier.isActive(),
                supplier.getCreatedAt(),
                supplier.getUpdatedAt()
        );
    }
}
