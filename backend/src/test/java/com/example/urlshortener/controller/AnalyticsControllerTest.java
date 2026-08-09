package com.example.urlshortener.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.urlshortener.dto.AnalyticsDevicesResponse;
import com.example.urlshortener.dto.AnalyticsReferrersResponse;
import com.example.urlshortener.dto.AnalyticsSummaryResponse;
import com.example.urlshortener.dto.AnalyticsTimeseriesResponse;
import com.example.urlshortener.dto.NamedCount;
import com.example.urlshortener.dto.TimeBucket;
import com.example.urlshortener.service.AnalyticsService;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class AnalyticsControllerTest {
    private AnalyticsService analyticsService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        analyticsService = mock(AnalyticsService.class);
        mockMvc = MockMvcBuilders.standaloneSetup(new AnalyticsController(analyticsService)).build();
    }

    @Test
    void returnsSummary() throws Exception {
        UUID urlId = UUID.randomUUID();
        Instant from = Instant.parse("2026-08-01T00:00:00Z");
        Instant to = Instant.parse("2026-08-07T00:00:00Z");

        AnalyticsSummaryResponse response = new AnalyticsSummaryResponse(
                urlId,
                25,
                Instant.parse("2026-08-06T12:00:00Z"),
                from,
                to,
                "NEAR_REAL_TIME",
                "BEST_EFFORT");

        when(analyticsService.getSummary(urlId, from, to)).thenReturn(response);

        mockMvc.perform(get("/api/v1/urls/{urlId}/analytics/summary", urlId)
                        .param("from", from.toString())
                        .param("to", to.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.urlId").value(urlId.toString()))
                .andExpect(jsonPath("$.totalClicks").value(25));
    }

    @Test
    void returnsTimeSeries() throws Exception {
        UUID urlId = UUID.randomUUID();
        Instant from = Instant.parse("2026-08-01T00:00:00Z");
        Instant to = Instant.parse("2026-08-02T00:00:00Z");

        AnalyticsTimeseriesResponse response = new AnalyticsTimeseriesResponse(
                urlId,
                TimeBucket.DAY,
                List.of(),
                from,
                to,
                "NEAR_REAL_TIME",
                "BEST_EFFORT");

        when(analyticsService.getTimeSeries(urlId, from, to, TimeBucket.DAY)).thenReturn(response);

        mockMvc.perform(get("/api/v1/urls/{urlId}/analytics/timeseries", urlId)
                        .param("from", from.toString())
                        .param("to", to.toString())
                        .param("bucket", "DAY"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.urlId").value(urlId.toString()))
                .andExpect(jsonPath("$.bucket").value("DAY"));
    }

    @Test
    void returnsReferrers() throws Exception {
        UUID urlId = UUID.randomUUID();
        Instant from = Instant.parse("2026-08-01T00:00:00Z");
        Instant to = Instant.parse("2026-08-07T00:00:00Z");

        AnalyticsReferrersResponse response = new AnalyticsReferrersResponse(
                urlId,
                List.of(new NamedCount("google.com", 10)),
                from,
                to,
                "NEAR_REAL_TIME",
                "BEST_EFFORT");

        when(analyticsService.getReferrers(urlId, from, to, 10)).thenReturn(response);

        mockMvc.perform(get("/api/v1/urls/{urlId}/analytics/referrers", urlId)
                        .param("from", from.toString())
                        .param("to", to.toString())
                        .param("limit", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.referrers[0].name").value("google.com"))
                .andExpect(jsonPath("$.referrers[0].clicks").value(10));
    }

    @Test
    void returnsDevices() throws Exception {
        UUID urlId = UUID.randomUUID();

        AnalyticsDevicesResponse response = new AnalyticsDevicesResponse(
                urlId,
                List.of(new NamedCount("DESKTOP", 15)),
                List.of(new NamedCount("CHROME", 12)),
                List.of(new NamedCount("WINDOWS", 10)),
                null,
                null,
                "NEAR_REAL_TIME",
                "BEST_EFFORT");

        when(analyticsService.getDevices(eq(urlId), any(), any())).thenReturn(response);

        mockMvc.perform(get("/api/v1/urls/{urlId}/analytics/devices", urlId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.deviceTypes[0].name").value("DESKTOP"))
                .andExpect(jsonPath("$.browsers[0].name").value("CHROME"))
                .andExpect(jsonPath("$.operatingSystems[0].name").value("WINDOWS"));
    }
}