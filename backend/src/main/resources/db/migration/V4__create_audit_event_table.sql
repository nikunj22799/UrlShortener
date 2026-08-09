CREATE TABLE audit_event (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    event_type VARCHAR(40) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    entity_type VARCHAR(40) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    entity_public_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    correlation_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
    metadata_json JSON NULL,
    created_at DATETIME(6) NOT NULL,
    CONSTRAINT pk_audit_event PRIMARY KEY (id),
    CONSTRAINT chk_audit_event_type CHECK (event_type IN (
        'URL_CREATED',
        'URL_ENABLED',
        'URL_DISABLED',
        'URL_EXPIRATION_CHANGED',
        'URL_DELETED'
    )),
    CONSTRAINT chk_audit_entity_type CHECK (entity_type IN ('SHORTENED_URL'))
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

CREATE INDEX idx_audit_entity_time
    ON audit_event (entity_public_id, created_at, id);

CREATE INDEX idx_audit_created
    ON audit_event (created_at, id);
