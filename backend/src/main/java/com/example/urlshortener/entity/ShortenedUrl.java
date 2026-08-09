package com.example.urlshortener.entity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "shortened_url")
public class ShortenedUrl {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "public_id", nullable = false, length = 36, unique = true, columnDefinition = "char(36)")
    private String publicId;

    @Column(name = "short_code", nullable = false, length = 48, unique = true)
    private String shortCode;

    @Column(name = "original_url", nullable = false, length = 2048)
    private String originalUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "code_type", nullable = false, length = 16)
    private CodeType codeType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 16)
    private UrlStatus status;

    @Column(name = "expires_at", columnDefinition = "datetime(6)")
    private Instant expiresAt;

    @Column(name = "created_at", nullable = false, columnDefinition = "datetime(6)")
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false, columnDefinition = "datetime(6)")
    private Instant updatedAt;

    @Column(name = "deleted_at", columnDefinition = "datetime(6)")
    private Instant deletedAt;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    protected ShortenedUrl() {
    }

    private ShortenedUrl(
            UUID publicId,
            String shortCode,
            String originalUrl,
            CodeType codeType,
            Instant expiresAt,
            Instant createdAt) {
        this.publicId = Objects.requireNonNull(publicId).toString();
        this.shortCode = Objects.requireNonNull(shortCode);
        this.originalUrl = Objects.requireNonNull(originalUrl);
        this.codeType = Objects.requireNonNull(codeType);
        this.status = UrlStatus.ACTIVE;
        this.expiresAt = expiresAt;
        this.createdAt = Objects.requireNonNull(createdAt);
        this.updatedAt = createdAt;
    }

    public static ShortenedUrl create(
            UUID publicId,
            String shortCode,
            String originalUrl,
            CodeType codeType,
            Instant expiresAt,
            Instant createdAt) {
        return new ShortenedUrl(publicId, shortCode, originalUrl, codeType, expiresAt, createdAt);
    }

    public boolean isExpiredAt(Instant currentTime) {
        return expiresAt != null && !expiresAt.isAfter(currentTime);
    }

    public boolean isDeleted() {
        return deletedAt != null;
    }

    public boolean disable(Instant changedAt) {
        if (status != UrlStatus.DISABLED) {
            status = UrlStatus.DISABLED;
            updatedAt = Objects.requireNonNull(changedAt);
            return true;
        }
        return false;
    }

    public boolean enable(Instant changedAt) {
        if (status != UrlStatus.ACTIVE) {
            status = UrlStatus.ACTIVE;
            updatedAt = Objects.requireNonNull(changedAt);
            return true;
        }
        return false;
    }

    public boolean updateExpiration(Instant newExpiration, Instant changedAt) {
        if (!Objects.equals(expiresAt, newExpiration)) {
            expiresAt = newExpiration;
            updatedAt = Objects.requireNonNull(changedAt);
            return true;
        }
        return false;
    }

    public boolean markDeleted(Instant changedAt) {
        if (deletedAt == null) {
            deletedAt = Objects.requireNonNull(changedAt);
            updatedAt = changedAt;
            return true;
        }
        return false;
    }

    public Long getId() {
        return id;
    }

    public UUID getPublicId() {
        return UUID.fromString(publicId);
    }

    public String getPublicIdValue() {
        return publicId;
    }

    public String getShortCode() {
        return shortCode;
    }

    public String getOriginalUrl() {
        return originalUrl;
    }

    public CodeType getCodeType() {
        return codeType;
    }

    public UrlStatus getStatus() {
        return status;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public Instant getDeletedAt() {
        return deletedAt;
    }

    public long getVersion() {
        return version;
    }
}
