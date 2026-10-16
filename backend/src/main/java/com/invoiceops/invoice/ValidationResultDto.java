package com.invoiceops.invoice;

import java.time.Instant;
import java.util.UUID;

public record ValidationResultDto(
        UUID id,
        String ruleName,
        ValidationSeverity severity,
        String message,
        String fieldName,
        boolean resolved,
        String resolvedByEmail,
        Instant resolvedAt
) {
    public static ValidationResultDto fromEntity(ValidationResult vr) {
        return new ValidationResultDto(
                vr.getId(),
                vr.getRuleName(),
                vr.getSeverity(),
                vr.getMessage(),
                vr.getFieldName(),
                vr.isResolved(),
                vr.getResolvedBy() != null ? vr.getResolvedBy().getEmail() : null,
                vr.getResolvedAt()
        );
    }
}
