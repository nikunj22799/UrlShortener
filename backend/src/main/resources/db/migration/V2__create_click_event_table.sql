CREATE TABLE click_event (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    shortened_url_id BIGINT UNSIGNED NOT NULL,
    occurred_at DATETIME(6) NOT NULL,
    referrer_host VARCHAR(253) CHARACTER SET ascii COLLATE ascii_bin NULL,
    browser_family VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
    operating_system_family VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
    device_type VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NULL,
    correlation_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
    CONSTRAINT pk_click_event PRIMARY KEY (id),
    CONSTRAINT fk_click_event_shortened_url
        FOREIGN KEY (shortened_url_id) REFERENCES shortened_url (id) ON DELETE RESTRICT,
    CONSTRAINT chk_click_event_device_type CHECK (
        device_type IS NULL OR device_type IN ('DESKTOP', 'MOBILE', 'TABLET', 'BOT', 'OTHER', 'UNKNOWN')
    )
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

CREATE INDEX idx_click_link_time
    ON click_event (shortened_url_id, occurred_at, id);

CREATE INDEX idx_click_retention
    ON click_event (occurred_at, id);
