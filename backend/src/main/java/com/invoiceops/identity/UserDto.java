package com.invoiceops.identity;

import java.time.Instant;
import java.util.UUID;

public record UserDto(
        UUID id,
        UUID organisationId,
        String organisationName,
        String email,
        String fullName,
        UserRole role,
        boolean active,
        Instant createdAt,
        boolean demoMode
) {
    public static UserDto fromEntity(User user) {
        return fromEntity(user, false);
    }

    public static UserDto fromEntity(User user, boolean demoMode) {
        return new UserDto(
                user.getId(),
                user.getOrganisation() != null ? user.getOrganisation().getId() : null,
                user.getOrganisation() != null ? user.getOrganisation().getName() : null,
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                user.isActive(),
                user.getCreatedAt(),
                demoMode
        );
    }
}
