package com.invoiceops.audit;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class AuditService {

    private static final Logger log = LoggerFactory.getLogger(AuditService.class);

    private final AuditEventRepository auditEventRepository;
    private final ObjectMapper objectMapper;

    public AuditService(AuditEventRepository auditEventRepository, ObjectMapper objectMapper) {
        this.auditEventRepository = auditEventRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public void logEvent(UUID orgId, UUID actorId, String actorEmail, String action,
                         String entityType, UUID entityId, Map<String, Object> metadata) {
        String metadataJson = null;
        if (metadata != null && !metadata.isEmpty()) {
            try {
                metadataJson = objectMapper.writeValueAsString(metadata);
            } catch (JsonProcessingException e) {
                log.warn("Failed to serialize audit event metadata to JSON", e);
                metadataJson = "{}";
            }
        }

        AuditEvent event = new AuditEvent(orgId, actorId, actorEmail, action, entityType, entityId, metadataJson);
        auditEventRepository.save(event);
        log.info("Audit: org={} actor={} action={} entityType={} entityId={}",
                orgId, actorEmail, action, entityType, entityId);
    }

    @Transactional(readOnly = true)
    public List<AuditEventDto> getEvents(UUID orgId, int limit) {
        int safeLimit = Math.min(Math.max(limit, 1), 100);
        return auditEventRepository.findByOrganisationIdOrderByCreatedAtDesc(orgId, PageRequest.of(0, safeLimit))
                .stream()
                .map(AuditEventDto::fromEntity)
                .toList();
    }
}
