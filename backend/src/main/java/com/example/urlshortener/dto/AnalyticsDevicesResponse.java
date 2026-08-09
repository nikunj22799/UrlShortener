package com.example.urlshortener.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record AnalyticsDevicesResponse(
        UUID urlId,
        List<NamedCount> deviceTypes,
        List<NamedCount> browsers,
        List<NamedCount> operatingSystems,
        Instant from,
        Instant to,
        String consistency,
        String completeness) {
}
