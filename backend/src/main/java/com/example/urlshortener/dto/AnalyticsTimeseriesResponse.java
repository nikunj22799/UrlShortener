package com.example.urlshortener.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record AnalyticsTimeseriesResponse(
        UUID urlId,
        TimeBucket bucket,
        List<AnalyticsPoint> points,
        Instant from,
        Instant to,
        String consistency,
        String completeness) {
}
