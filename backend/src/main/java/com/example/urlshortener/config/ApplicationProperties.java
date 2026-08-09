package com.example.urlshortener.config;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.net.URI;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app")
public record ApplicationProperties(
        @NotNull URI baseUrl,
        @Valid @NotNull ShortCode shortCode,
        @Valid @NotNull Pagination pagination,
        @Valid @NotNull Analytics analytics,
        @Valid @NotNull Idempotency idempotency,
        @Valid @NotNull RateLimit rateLimit) {

    public ApplicationProperties {
        if (baseUrl != null) {
            validateBaseUrl(baseUrl);
        }
    }

    private static void validateBaseUrl(URI baseUrl) {
        String scheme = baseUrl.getScheme();
        boolean supportedScheme = "http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme);
        boolean originOnly = (baseUrl.getPath() == null || baseUrl.getPath().isEmpty() || "/".equals(baseUrl.getPath()))
                && baseUrl.getQuery() == null
                && baseUrl.getFragment() == null
                && baseUrl.getUserInfo() == null;
        if (!supportedScheme || baseUrl.getHost() == null || !originOnly) {
            throw new IllegalArgumentException(
                    "app.base-url must be an HTTP(S) origin without path, query, fragment, or user info");
        }
    }

    public record ShortCode(
            @Min(6) @Max(32) int length,
            @Min(1) @Max(20) int maximumAttempts) {
    }

    public record Pagination(
            @Min(1) @Max(100) int defaultSize,
            @Min(1) @Max(500) int maximumSize) {
        public Pagination {
            if (defaultSize > maximumSize) {
                throw new IllegalArgumentException(
                        "app.pagination.default-size must not exceed maximum-size");
            }
        }
    }

    public record Analytics(
            @Min(1) @Max(90) int defaultRangeDays,
            @Min(1) @Max(90) int maximumRangeDays,
            @Min(1) @Max(7) int maximumHourlyRangeDays,
            @Min(1) @Max(100) int defaultReferrerLimit,
            @Min(1) @Max(100) int maximumReferrerLimit,
            @Min(1) @Max(100_000) int cleanupBatchSize) {
        public Analytics {
            if (defaultRangeDays > maximumRangeDays) {
                throw new IllegalArgumentException(
                        "app.analytics.default-range-days must not exceed maximum-range-days");
            }
            if (defaultReferrerLimit > maximumReferrerLimit) {
                throw new IllegalArgumentException(
                        "app.analytics.default-referrer-limit must not exceed maximum-referrer-limit");
            }
        }
    }

    public record Idempotency(
            @Min(1) @Max(168) int retentionHours,
            @Min(1) @Max(10_000) int cleanupBatchSize) {
    }

    public record RateLimit(
            boolean enabled,
            @Min(100) @Max(1_000_000) int maximumIdentities,
            @Valid @NotNull Policy create,
            @Valid @NotNull Policy redirect,
            @Valid @NotNull Policy management,
            @Valid @NotNull Policy analytics) {
    }

    public record Policy(
            @Min(1) @Max(1_000_000) int requests,
            @Min(1) @Max(3_600) int windowSeconds) {
    }
}