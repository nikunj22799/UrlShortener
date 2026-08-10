package com.example.urlshortener.support;

import com.example.urlshortener.config.ApplicationProperties;
import java.net.URI;

public final class TestProperties {
    private TestProperties() {}

    public static ApplicationProperties defaults() {
        return new ApplicationProperties(
                URI.create("http://localhost:8080"),
                new ApplicationProperties.ShortCode(8, 5),
                new ApplicationProperties.Pagination(20, 100),
                new ApplicationProperties.Analytics(7, 90, 7, 10, 100),
                new ApplicationProperties.Idempotency(24),
                new ApplicationProperties.Security(
                        "test-admin",
                        "$2y$12$4xLVQx/Cv05OODjZMZIsVeyKGTokGHYKRLmZwQg1agEvBEr/0uhF6"),
                new ApplicationProperties.RateLimit(
                        true,
                        10_000,
                        new ApplicationProperties.Policy(5, 60),
                        new ApplicationProperties.Policy(30, 60),
                        new ApplicationProperties.Policy(300, 60),
                        new ApplicationProperties.Policy(120, 60),
                        new ApplicationProperties.Policy(60, 60)));
    }

    public static ApplicationProperties withRateLimit(boolean enabled) {
        ApplicationProperties properties = defaults();

        return new ApplicationProperties(
                properties.baseUrl(),
                properties.shortCode(),
                properties.pagination(),
                properties.analytics(),
                properties.idempotency(),
                properties.security(),
                new ApplicationProperties.RateLimit(
                        enabled,
                        10_000,
                        new ApplicationProperties.Policy(5, 60),
                        new ApplicationProperties.Policy(30, 60),
                        new ApplicationProperties.Policy(300, 60),
                        new ApplicationProperties.Policy(120, 60),
                        new ApplicationProperties.Policy(60, 60)));
    }
}
