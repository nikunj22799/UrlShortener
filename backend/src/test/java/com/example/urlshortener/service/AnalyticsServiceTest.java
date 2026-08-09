package com.example.urlshortener.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.urlshortener.config.ApplicationProperties;
import com.example.urlshortener.dto.AnalyticsSummaryResponse;
import com.example.urlshortener.dto.TimeBucket;
import com.example.urlshortener.entity.CodeType;
import com.example.urlshortener.entity.ShortenedUrl;
import com.example.urlshortener.exception.InvalidRequestException;
import com.example.urlshortener.repository.AnalyticsQueryRepository;
import com.example.urlshortener.repository.AnalyticsQueryRepository.SummaryRow;
import com.example.urlshortener.repository.ClickEventRepository;
import com.example.urlshortener.repository.ShortenedUrlRepository;
import com.example.urlshortener.support.TestProperties;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class AnalyticsServiceTest {
    private ShortenedUrlRepository shortenedUrlRepository;
    private ClickEventRepository clickEventRepository;
    private AnalyticsQueryRepository analyticsQueryRepository;
    private AnalyticsService analyticsService;
    private ApplicationProperties properties;
    private Clock clock;

    @BeforeEach
    void setUp() {
        shortenedUrlRepository = mock(ShortenedUrlRepository.class);
        clickEventRepository = mock(ClickEventRepository.class);
        analyticsQueryRepository = mock(AnalyticsQueryRepository.class);
        properties = TestProperties.defaults();
        clock = Clock.fixed(Instant.parse("2026-08-07T12:00:00Z"), ZoneOffset.UTC);
        analyticsService = new AnalyticsService(shortenedUrlRepository, clickEventRepository, analyticsQueryRepository, properties, clock);
    }

    @Test
    void returnsAnalyticsSummary() {
        UUID urlId = UUID.randomUUID();
        ShortenedUrl shortenedUrl = createUrl(urlId);
        Instant from = Instant.parse("2026-08-01T00:00:00Z");
        Instant to = Instant.parse("2026-08-07T00:00:00Z");

        when(shortenedUrlRepository.findByPublicId(urlId.toString())).thenReturn(Optional.of(shortenedUrl));
        when(analyticsQueryRepository.getSummary(eq(shortenedUrl.getId()), any(Timestamp.class), any(Timestamp.class)))
                .thenReturn(new SummaryRow(25, Instant.parse("2026-08-06T18:00:00Z")));

        AnalyticsSummaryResponse response = analyticsService.getSummary(urlId, from, to);

        assertEquals(urlId, response.urlId());
        assertEquals(25, response.totalClicks());
        assertEquals(from, response.from());
        assertEquals(to, response.to());
    }

    @Test
    void usesDailyBucketByDefault() {
        UUID urlId = UUID.randomUUID();
        ShortenedUrl shortenedUrl = createUrl(urlId);

        when(shortenedUrlRepository.findByPublicId(urlId.toString())).thenReturn(Optional.of(shortenedUrl));
        when(analyticsQueryRepository.getDailyClicks(anyLong(), any(Timestamp.class), any(Timestamp.class))).thenReturn(List.of());

        var response = analyticsService.getTimeSeries(urlId, null, null, null);

        assertEquals(TimeBucket.DAY, response.bucket());
        verify(analyticsQueryRepository).getDailyClicks(anyLong(), any(Timestamp.class), any(Timestamp.class));
    }

    @Test
    void usesHourlyQueryForHourlyBucket() {
        UUID urlId = UUID.randomUUID();
        ShortenedUrl shortenedUrl = createUrl(urlId);
        Instant from = Instant.parse("2026-08-06T00:00:00Z");
        Instant to = Instant.parse("2026-08-07T00:00:00Z");

        when(shortenedUrlRepository.findByPublicId(urlId.toString())).thenReturn(Optional.of(shortenedUrl));
        when(analyticsQueryRepository.getHourlyClicks(anyLong(), any(Timestamp.class), any(Timestamp.class))).thenReturn(List.of());

        var response = analyticsService.getTimeSeries(urlId, from, to, TimeBucket.HOUR);

        assertEquals(TimeBucket.HOUR, response.bucket());
        verify(analyticsQueryRepository).getHourlyClicks(anyLong(), any(Timestamp.class), any(Timestamp.class));
    }

    @Test
    void rejectsIncompleteDateRange() {
        UUID urlId = UUID.randomUUID();
        ShortenedUrl shortenedUrl = createUrl(urlId);

        when(shortenedUrlRepository.findByPublicId(urlId.toString())).thenReturn(Optional.of(shortenedUrl));

        assertThrows(
                InvalidRequestException.class,
                () -> analyticsService.getSummary(urlId, Instant.parse("2026-08-01T00:00:00Z"), null));
    }

    @Test
    void recordsClickEvent() {
        analyticsService.recordBestEffort(10L, "https://google.com", "Mozilla/5.0 Chrome/120", "correlation-123");

        verify(clickEventRepository).save(any());
    }

    private ShortenedUrl createUrl(UUID urlId) {
        ShortenedUrl shortenedUrl = ShortenedUrl.create(
                urlId,
                "abc12345",
                "https://example.com/products/123",
                CodeType.GENERATED,
                null,
                Instant.parse("2026-08-01T12:00:00Z"));

        try {
            var idField = ShortenedUrl.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(shortenedUrl, 1L);
        } catch (ReflectiveOperationException exception) {
            throw new RuntimeException(exception);
        }

        return shortenedUrl;
    }
}