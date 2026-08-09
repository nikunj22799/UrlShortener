package com.example.urlshortener.controller;

import com.example.urlshortener.dto.AnalyticsDevicesResponse;
import com.example.urlshortener.dto.AnalyticsReferrersResponse;
import com.example.urlshortener.dto.AnalyticsSummaryResponse;
import com.example.urlshortener.dto.AnalyticsTimeseriesResponse;
import com.example.urlshortener.dto.TimeBucket;
import com.example.urlshortener.service.AnalyticsService;
import java.time.Instant;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/urls/{id}/analytics")
public class AnalyticsController {
    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/summary")
    public AnalyticsSummaryResponse summary(
            @PathVariable UUID id,
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to) {
        return analyticsService.getSummary(id, from, to);
    }

    @GetMapping("/timeseries")
    public AnalyticsTimeseriesResponse timeseries(
            @PathVariable UUID id,
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to,
            @RequestParam(defaultValue = "DAY") TimeBucket bucket) {
        return analyticsService.getTimeSeries(id, from, to, bucket);
    }

    @GetMapping("/referrers")
    public AnalyticsReferrersResponse referrers(
            @PathVariable UUID id,
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to,
            @RequestParam(required = false) Integer limit) {
        return analyticsService.getReferrers(id, from, to, limit);
    }

    @GetMapping("/devices")
    public AnalyticsDevicesResponse devices(
            @PathVariable UUID id,
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to) {
        return analyticsService.getDevices(id, from, to);
    }
}