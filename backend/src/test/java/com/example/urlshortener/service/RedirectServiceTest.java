package com.example.urlshortener.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.urlshortener.entity.CodeType;
import com.example.urlshortener.entity.ShortenedUrl;
import com.example.urlshortener.exception.UrlNotFoundException;
import com.example.urlshortener.repository.ShortenedUrlRepository;
import java.net.URI;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class RedirectServiceTest {
    private ShortenedUrlRepository shortenedUrlRepository;
    private AnalyticsService analyticsService;
    private RedirectService redirectService;
    private Clock clock;

    @BeforeEach
    void setUp() {
        shortenedUrlRepository = mock(ShortenedUrlRepository.class);
        analyticsService = mock(AnalyticsService.class);
        clock = Clock.fixed(Instant.parse("2026-08-07T12:00:00Z"), ZoneOffset.UTC);
        redirectService = new RedirectService(shortenedUrlRepository, analyticsService, clock);
    }

    @Test
    void redirectsActiveUrl() {
        ShortenedUrl shortenedUrl = createUrl(null);
        when(shortenedUrlRepository.findByShortCode("abc12345")).thenReturn(Optional.of(shortenedUrl));

        URI destination = redirectService.resolveRedirect("abc12345", true, null, "Mozilla", "correlation-123");

        assertEquals("https://example.com/products/123", destination.toString());
        verify(analyticsService).recordBestEffort(shortenedUrl.getId(), null, "Mozilla", "correlation-123");
    }

    @Test
    void redirectsWithoutRecordingAnalytics() {
        ShortenedUrl shortenedUrl = createUrl(null);
        when(shortenedUrlRepository.findByShortCode("abc12345")).thenReturn(Optional.of(shortenedUrl));

        URI destination = redirectService.resolveRedirect("abc12345", false, null, null, "correlation-123");

        assertEquals("https://example.com/products/123", destination.toString());
        verify(analyticsService, never()).recordBestEffort(shortenedUrl.getId(), null, null, "correlation-123");
    }

    @Test
    void throwsExceptionWhenShortCodeDoesNotExist() {
        when(shortenedUrlRepository.findByShortCode("missing1")).thenReturn(Optional.empty());

        assertThrows(UrlNotFoundException.class, () -> redirectService.resolveRedirect("missing1", true, null, null, "correlation-123"));
    }

    @Test
    void throwsExceptionForInvalidShortCode() {
        assertThrows(UrlNotFoundException.class, () -> redirectService.resolveRedirect("invalid@code", true, null, null, "correlation-123"));

        verify(shortenedUrlRepository, never()).findByShortCode(anyString());
    }

    @Test
    void throwsExceptionWhenUrlIsExpired() {
        ShortenedUrl shortenedUrl = createUrl(Instant.parse("2026-08-07T11:00:00Z"));
        when(shortenedUrlRepository.findByShortCode("abc12345")).thenReturn(Optional.of(shortenedUrl));

        assertThrows(UrlNotFoundException.class, () -> redirectService.resolveRedirect("abc12345", true, null, null, "correlation-123"));
    }

    @Test
    void throwsExceptionWhenUrlIsDisabled() {
        ShortenedUrl shortenedUrl = createUrl(null);
        shortenedUrl.disable(Instant.parse("2026-08-07T10:00:00Z"));

        when(shortenedUrlRepository.findByShortCode("abc12345"))
                .thenReturn(Optional.of(shortenedUrl));

        assertThrows(
                UrlNotFoundException.class,
                () -> redirectService.resolveRedirect(
                        "abc12345",
                        true,
                        null,
                        null,
                        "correlation-123"));
    }

    @Test
    void throwsExceptionWhenUrlIsDeleted() {
        ShortenedUrl shortenedUrl = createUrl(null);
        shortenedUrl.markDeleted(Instant.parse("2026-08-07T10:00:00Z"));

        when(shortenedUrlRepository.findByShortCode("abc12345"))
                .thenReturn(Optional.of(shortenedUrl));

        assertThrows(
                UrlNotFoundException.class,
                () -> redirectService.resolveRedirect(
                        "abc12345",
                        true,
                        null,
                        null,
                        "correlation-123"));
    }
    
    private ShortenedUrl createUrl(Instant expiresAt) {
        return ShortenedUrl.create(UUID.randomUUID(), "abc12345", "https://example.com/products/123", CodeType.GENERATED, expiresAt, Instant.parse("2026-08-01T12:00:00Z"));
    }
}