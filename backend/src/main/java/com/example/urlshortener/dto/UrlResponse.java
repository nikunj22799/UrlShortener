package com.example.urlshortener.dto;

import com.example.urlshortener.entity.CodeType;
import java.net.URI;
import java.time.Instant;
import java.util.UUID;

public record UrlResponse(
        UUID id,
        String shortCode,
        URI shortUrl,
        String originalUrl,
        CodeType codeType,
        LifecycleStatus status,
        boolean expired,
        Instant expiresAt,
        Instant createdAt,
        Instant updatedAt,
        Instant deletedAt,
        long version) {
}
