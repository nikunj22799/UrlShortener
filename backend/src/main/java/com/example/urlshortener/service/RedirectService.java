package com.example.urlshortener.service;

import com.example.urlshortener.entity.ShortenedUrl;
import com.example.urlshortener.entity.UrlStatus;
import com.example.urlshortener.exception.UrlNotFoundException;
import com.example.urlshortener.repository.ShortenedUrlRepository;
import java.net.URI;
import java.time.Clock;
import java.time.Instant;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

@Service
public class RedirectService {
    private static final Pattern SHORT_CODE_PATTERN =
            Pattern.compile("[A-Za-z0-9][A-Za-z0-9-]{1,46}[A-Za-z0-9]");
    private final ShortenedUrlRepository shortenedUrlRepository;
    private final AnalyticsService analyticsService;
    private final Clock clock;

    public RedirectService(
            ShortenedUrlRepository shortenedUrlRepository,
            AnalyticsService analyticsService,
            Clock clock) {
        this.shortenedUrlRepository = shortenedUrlRepository;
        this.analyticsService = analyticsService;
        this.clock = clock;
    }

    public URI resolveRedirect(
            String shortCode,
            boolean recordAnalytics,
            String referrer,
            String userAgent,
            String correlationId) {
        validateShortCode(shortCode);
        ShortenedUrl shortenedUrl = shortenedUrlRepository.findByShortCode(shortCode)
                .orElseThrow(UrlNotFoundException::new);
        validateRedirect(shortenedUrl);
        if (recordAnalytics) {
            analyticsService.recordBestEffort(
                    shortenedUrl.getId(),
                    referrer,
                    userAgent,
                    correlationId);
        }
        URI destination = URI.create(shortenedUrl.getOriginalUrl());
        return destination;
    }

    private void validateShortCode(String shortCode) {
        if (shortCode == null || !SHORT_CODE_PATTERN.matcher(shortCode).matches()) {
            throw new UrlNotFoundException();
        }
    }

    private void validateRedirect(ShortenedUrl shortenedUrl) {
        if (shortenedUrl.isDeleted()) {
            throw new UrlNotFoundException();
        }
        if (shortenedUrl.getStatus() == UrlStatus.DISABLED) {
            throw new UrlNotFoundException();
        }
        Instant now = clock.instant();
        if (shortenedUrl.isExpiredAt(now)) {
            throw new UrlNotFoundException();
        }
    }
}