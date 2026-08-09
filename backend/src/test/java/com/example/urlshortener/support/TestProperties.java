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
                new ApplicationProperties.Analytics(7, 90, 7, 10, 100, 5_000),
                new ApplicationProperties.Idempotency(24, 500),
                new ApplicationProperties.RateLimit(
                        true,
                        10_000,
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
                new ApplicationProperties.RateLimit(
                        enabled,
                        10_000,
                        new ApplicationProperties.Policy(30, 60),
                        new ApplicationProperties.Policy(300, 60),
                        new ApplicationProperties.Policy(120, 60),
                        new ApplicationProperties.Policy(60, 60)));
    }
}