package com.example.urlshortener.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.example.urlshortener.entity.CodeType;
import com.example.urlshortener.entity.ShortenedUrl;
import com.example.urlshortener.entity.UrlStatus;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest
@ActiveProfiles("test")
class ShortenedUrlRepositoryIntegrationTest {
    @Autowired
    private ShortenedUrlRepository shortenedUrlRepository;

    @Test
    void findsUrlByPublicId() {
        UUID urlId = UUID.randomUUID();
        ShortenedUrl shortenedUrl = createUrl(urlId, "abc12345", "https://example.com/products/123");
        shortenedUrlRepository.save(shortenedUrl);

        Optional<ShortenedUrl> result = shortenedUrlRepository.findByPublicId(urlId.toString());

        assertTrue(result.isPresent());
        assertEquals(urlId, result.get().getPublicId());
    }

    @Test
    void findsUrlByShortCode() {
        ShortenedUrl shortenedUrl = createUrl(UUID.randomUUID(), "abc12345", "https://example.com/products/123");
        shortenedUrlRepository.save(shortenedUrl);

        Optional<ShortenedUrl> result = shortenedUrlRepository.findByShortCode("abc12345");

        assertTrue(result.isPresent());
        assertEquals("abc12345", result.get().getShortCode());
    }

    @Test
    void searchesActiveUrls() {
        shortenedUrlRepository.save(createUrl(UUID.randomUUID(), "first123", "https://example.com/first"));
        shortenedUrlRepository.save(createUrl(UUID.randomUUID(), "second12", "https://example.com/second"));

        Page<ShortenedUrl> result = shortenedUrlRepository.searchUrls(
                "ACTIVE",
                null,
                null,
                Instant.parse("2026-08-07T12:00:00Z"),
                PageRequest.of(0, 10));

        assertEquals(2, result.getTotalElements());
    }

    @Test
    void searchesByText() {
        shortenedUrlRepository.save(createUrl(UUID.randomUUID(), "google12", "https://google.com/search"));
        shortenedUrlRepository.save(createUrl(UUID.randomUUID(), "github12", "https://github.com"));

        Page<ShortenedUrl> result = shortenedUrlRepository.searchUrls(
                null,
                "google",
                null,
                Instant.parse("2026-08-07T12:00:00Z"),
                PageRequest.of(0, 10));

        assertEquals(1, result.getTotalElements());
        assertEquals("google12", result.getContent().getFirst().getShortCode());
    }

    @Test
    void searchesExpiredUrls() {
        ShortenedUrl expiredUrl = ShortenedUrl.create(
                UUID.randomUUID(),
                "expired1",
                "https://example.com/expired",
                CodeType.GENERATED,
                Instant.parse("2026-08-01T12:00:00Z"),
                Instant.parse("2026-07-01T12:00:00Z"));

        ShortenedUrl activeUrl = createUrl(UUID.randomUUID(), "active12", "https://example.com/active");

        shortenedUrlRepository.save(expiredUrl);
        shortenedUrlRepository.save(activeUrl);

        Page<ShortenedUrl> result = shortenedUrlRepository.searchUrls(
                null,
                null,
                true,
                Instant.parse("2026-08-07T12:00:00Z"),
                PageRequest.of(0, 10));

        assertEquals(1, result.getTotalElements());
        assertEquals("expired1", result.getContent().getFirst().getShortCode());
    }

    @Test
    void searchesDisabledUrls() {
        ShortenedUrl shortenedUrl = createUrl(UUID.randomUUID(), "disabled", "https://example.com/disabled");
        shortenedUrl.disable(Instant.parse("2026-08-05T12:00:00Z"));
        shortenedUrlRepository.save(shortenedUrl);

        Page<ShortenedUrl> result = shortenedUrlRepository.searchUrls(
                "DISABLED",
                null,
                null,
                Instant.parse("2026-08-07T12:00:00Z"),
                PageRequest.of(0, 10));

        assertEquals(1, result.getTotalElements());
        assertEquals(UrlStatus.DISABLED, result.getContent().getFirst().getStatus());
    }

    private ShortenedUrl createUrl(UUID urlId, String shortCode, String originalUrl) {
        return ShortenedUrl.create(
                urlId,
                shortCode,
                originalUrl,
                CodeType.GENERATED,
                null,
                Instant.parse("2026-08-01T12:00:00Z"));
    }
}