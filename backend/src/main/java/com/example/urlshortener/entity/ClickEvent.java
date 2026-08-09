package com.example.urlshortener.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;

@Entity
@Table(name = "click_event")
public class ClickEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "shortened_url_id", nullable = false)
    private Long shortenedUrlId;

    @Column(name = "occurred_at", nullable = false, columnDefinition = "datetime(6)")
    private Instant occurredAt;

    @Column(name = "referrer_host", length = 253)
    private String referrerHost;

    @Column(name = "browser_family", length = 64)
    private String browserFamily;

    @Column(name = "operating_system_family", length = 64)
    private String operatingSystemFamily;

    @Column(name = "device_type", length = 16)
    private String deviceType;

    @Column(name = "correlation_id", length = 64)
    private String correlationId;

    protected ClickEvent() {
    }

    public ClickEvent(
            Long shortenedUrlId,
            Instant occurredAt,
            String referrerHost,
            String browserFamily,
            String operatingSystemFamily,
            String deviceType,
            String correlationId) {
        this.shortenedUrlId = Objects.requireNonNull(shortenedUrlId);
        this.occurredAt = Objects.requireNonNull(occurredAt);
        this.referrerHost = referrerHost;
        this.browserFamily = browserFamily;
        this.operatingSystemFamily = operatingSystemFamily;
        this.deviceType = deviceType;
        this.correlationId = correlationId;
    }

    public String getReferrerHost() {
        return referrerHost;
    }

    public String getBrowserFamily() {
        return browserFamily;
    }

    public String getOperatingSystemFamily() {
        return operatingSystemFamily;
    }

    public String getDeviceType() {
        return deviceType;
    }

    public String getCorrelationId() {
        return correlationId;
    }
}
