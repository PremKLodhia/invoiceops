package com.invoiceops.audit;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AuditEventRepository extends JpaRepository<AuditEvent, UUID> {

    List<AuditEvent> findByOrganisationIdOrderByCreatedAtDesc(UUID organisationId, Pageable pageable);

    List<AuditEvent> findByOrganisationIdOrderByCreatedAtDesc(UUID organisationId);

    List<AuditEvent> findByOrganisationIdAndEntityTypeAndEntityIdOrderByCreatedAtDesc(
            UUID organisationId, String entityType, UUID entityId);
}
