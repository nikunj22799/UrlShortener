package com.example.urlshortener.entity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Arrays;
import java.util.Objects;

@Entity
@Table(name = "idempotency_record")
public class IdempotencyRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "key_hash", nullable = false, length = 32, unique = true, columnDefinition = "binary(32)")
    private byte[] keyHash;

    @Column(name = "request_hash", nullable = false, length = 32, columnDefinition = "binary(32)")
    private byte[] requestHash;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "shortened_url_id", nullable = false)
    private ShortenedUrl shortenedUrl;

    @Column(name = "created_at", nullable = false, columnDefinition = "datetime(6)")
    private Instant createdAt;

    @Column(name = "expires_at", nullable = false, columnDefinition = "datetime(6)")
    private Instant expiresAt;

    protected IdempotencyRecord() {
    }

    public IdempotencyRecord(
            byte[] keyHash,
            byte[] requestHash,
            ShortenedUrl shortenedUrl,
            Instant createdAt,
            Instant expiresAt) {
        this.keyHash = Arrays.copyOf(Objects.requireNonNull(keyHash), keyHash.length);
        this.requestHash = Arrays.copyOf(Objects.requireNonNull(requestHash), requestHash.length);
        this.shortenedUrl = Objects.requireNonNull(shortenedUrl);
        this.createdAt = Objects.requireNonNull(createdAt);
        this.expiresAt = Objects.requireNonNull(expiresAt);
    }

    public boolean hasRequestHash(byte[] candidate) {
        return Arrays.equals(requestHash, candidate);
    }

    public boolean isExpiredAt(Instant now) {
        return !expiresAt.isAfter(now);
    }

    public ShortenedUrl getShortenedUrl() {
        return shortenedUrl;
    }
}
