CREATE TABLE idempotency_record (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    key_hash BINARY(32) NOT NULL,
    request_hash BINARY(32) NOT NULL,
    shortened_url_id BIGINT UNSIGNED NOT NULL,
    created_at DATETIME(6) NOT NULL,
    expires_at DATETIME(6) NOT NULL,
    CONSTRAINT pk_idempotency_record PRIMARY KEY (id),
    CONSTRAINT uk_idempotency_record_key_hash UNIQUE (key_hash),
    CONSTRAINT fk_idempotency_record_shortened_url
        FOREIGN KEY (shortened_url_id) REFERENCES shortened_url (id) ON DELETE RESTRICT,
    CONSTRAINT chk_idempotency_record_expiry CHECK (expires_at > created_at)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

CREATE INDEX idx_idempotency_expiry
    ON idempotency_record (expires_at, id);
