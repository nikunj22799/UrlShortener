package com.example.urlshortener.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record AnalyticsReferrersResponse(
        UUID urlId,
        List<NamedCount> referrers,
        Instant from,
        Instant to,
        String consistency,
        String completeness) {
}
