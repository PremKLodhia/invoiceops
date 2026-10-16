package com.invoiceops.audit;

import java.time.Instant;
import java.util.UUID;

public record AuditEventDto(
        UUID id,
        UUID organisationId,
        UUID actorId,
        String actorEmail,
        String action,
        String entityType,
        UUID entityId,
        String metadata,
        Instant createdAt
) {
    public static AuditEventDto fromEntity(AuditEvent event) {
        return new AuditEventDto(
                event.getId(),
                event.getOrganisationId(),
                event.getActorId(),
                event.getActorEmail(),
                event.getAction(),
                event.getEntityType(),
                event.getEntityId(),
                event.getMetadata(),
                event.getCreatedAt()
        );
    }
}
