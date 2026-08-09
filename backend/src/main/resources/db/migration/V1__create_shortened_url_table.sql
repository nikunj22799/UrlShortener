CREATE TABLE shortened_url (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    short_code VARCHAR(48) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    original_url VARCHAR(2048) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    code_type VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    status VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'ACTIVE',
    expires_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    deleted_at DATETIME(6) NULL,
    version BIGINT UNSIGNED NOT NULL DEFAULT 0,
    CONSTRAINT pk_shortened_url PRIMARY KEY (id),
    CONSTRAINT uk_shortened_url_public_id UNIQUE (public_id),
    CONSTRAINT uk_shortened_url_short_code UNIQUE (short_code),
    CONSTRAINT chk_shortened_url_code_type CHECK (code_type IN ('GENERATED', 'CUSTOM_ALIAS')),
    CONSTRAINT chk_shortened_url_status CHECK (status IN ('ACTIVE', 'DISABLED')),
    CONSTRAINT chk_shortened_url_deleted_time CHECK (deleted_at IS NULL OR deleted_at >= created_at)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

CREATE INDEX idx_url_default_list
    ON shortened_url (deleted_at, created_at, id);

CREATE INDEX idx_url_status_list
    ON shortened_url (deleted_at, status, created_at, id);

CREATE INDEX idx_url_expiration
    ON shortened_url (deleted_at, expires_at, id);
