package com.example.urlshortener.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "audit_event")
public class AuditEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 40)
    private AuditEventType eventType;

    @Column(name = "entity_type", nullable = false, length = 40)
    private String entityType;

    @Column(name = "entity_public_id", nullable = false, length = 36, columnDefinition = "char(36)")
    private String entityPublicId;

    @Column(name = "correlation_id", length = 64)
    private String correlationId;

    @Column(name = "metadata_json", columnDefinition = "json")
    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> metadataJson;

    @Column(name = "created_at", nullable = false, columnDefinition = "datetime(6)")
    private Instant createdAt;

    protected AuditEvent() {
    }

    public AuditEvent(
            AuditEventType eventType,
            UUID entityPublicId,
            String correlationId,
            Map<String, Object> metadataJson,
            Instant createdAt) {
        this.eventType = Objects.requireNonNull(eventType);
        this.entityType = "SHORTENED_URL";
        this.entityPublicId = Objects.requireNonNull(entityPublicId).toString();
        this.correlationId = correlationId;
        this.metadataJson = metadataJson;
        this.createdAt = Objects.requireNonNull(createdAt);
    }

    public AuditEventType getEventType() {
        return eventType;
    }

    public String getEntityPublicId() {
        return entityPublicId;
    }

    public Map<String, Object> getMetadataJson() {
        return metadataJson;
    }
}
