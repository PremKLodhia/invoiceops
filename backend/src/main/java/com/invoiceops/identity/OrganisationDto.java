package com.invoiceops.identity;

import java.time.Instant;
import java.util.UUID;

public record OrganisationDto(
        UUID id,
        String name,
        Instant createdAt
) {
    public static OrganisationDto fromEntity(Organisation org) {
        return new OrganisationDto(
                org.getId(),
                org.getName(),
                org.getCreatedAt()
        );
    }
}
