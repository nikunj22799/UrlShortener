package com.example.urlshortener.dto;

import java.time.Instant;
import java.util.UUID;

public record AnalyticsSummaryResponse(
        UUID urlId,
        long totalClicks,
        Instant lastEventAt,
        Instant from,
        Instant to,
        String consistency,
        String completeness) {
}
