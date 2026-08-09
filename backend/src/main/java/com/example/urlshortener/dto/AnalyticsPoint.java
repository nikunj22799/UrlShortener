package com.example.urlshortener.dto;

import java.time.Instant;

public record AnalyticsPoint(Instant start, Instant end, long clicks) {
}
