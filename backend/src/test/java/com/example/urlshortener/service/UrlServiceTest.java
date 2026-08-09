package com.example.urlshortener.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.urlshortener.config.ApplicationProperties;
import com.example.urlshortener.dto.CreateUrlRequest;
import com.example.urlshortener.dto.UrlResponse;
import com.example.urlshortener.entity.CodeType;
import com.example.urlshortener.entity.ShortenedUrl;
import com.example.urlshortener.exception.ConflictException;
import com.example.urlshortener.exception.InvalidRequestException;
import com.example.urlshortener.exception.UrlNotFoundException;
import com.example.urlshortener.repository.IdempotencyRecordRepository;
import com.example.urlshortener.repository.ShortenedUrlRepository;
import com.example.urlshortener.support.TestProperties;
import com.example.urlshortener.util.ShortCodeGenerator;
import com.example.urlshortener.util.UrlValidator;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.SimpleTransactionStatus;

class UrlServiceTest {
    private ShortenedUrlRepository shortenedUrlRepository;
    private IdempotencyRecordRepository idempotencyRecordRepository;
    private ShortCodeGenerator shortCodeGenerator;
    private UrlService urlService;

    @BeforeEach
    void setUp() {
        shortenedUrlRepository = mock(ShortenedUrlRepository.class);
        idempotencyRecordRepository = mock(IdempotencyRecordRepository.class);
        shortCodeGenerator = mock(ShortCodeGenerator.class);
        UrlValidator urlValidator = new UrlValidator();
        ApplicationProperties properties = TestProperties.defaults();
        Clock clock = Clock.fixed(Instant.parse("2026-08-07T12:00:00Z"), ZoneOffset.UTC);
        PlatformTransactionManager transactionManager = mock(PlatformTransactionManager.class);
        TransactionStatus transactionStatus = new SimpleTransactionStatus();

        when(transactionManager.getTransaction(any())).thenReturn(transactionStatus);

        urlService = new UrlService(
                shortenedUrlRepository,
                idempotencyRecordRepository,
                urlValidator,
                shortCodeGenerator,
                properties,
                clock,
                transactionManager);
    }

    @Test
    void returnsExistingUrlById() {
        UUID urlId = UUID.randomUUID();
        ShortenedUrl shortenedUrl = createUrl(urlId, "abc12345");

        when(shortenedUrlRepository.findByPublicId(urlId.toString())).thenReturn(Optional.of(shortenedUrl));

        UrlResponse response = urlService.getUrl(urlId);

        assertEquals(urlId, response.id());
        assertEquals("abc12345", response.shortCode());
        assertEquals("https://example.com/products/123", response.originalUrl());
    }

    @Test
    void throwsExceptionWhenUrlDoesNotExist() {
        UUID urlId = UUID.randomUUID();

        when(shortenedUrlRepository.findByPublicId(urlId.toString())).thenReturn(Optional.empty());

        assertThrows(UrlNotFoundException.class, () -> urlService.getUrl(urlId));
    }

    @Test
    void createsUrlWithGeneratedShortCode() {
        CreateUrlRequest request = new CreateUrlRequest(
                "https://example.com/products/123",
                null,
                null);

        when(shortCodeGenerator.generateShortCode()).thenReturn("abc12345");
        when(shortenedUrlRepository.saveAndFlush(any(ShortenedUrl.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        UrlService.CreationResult result = urlService.createShortUrl(request, null, "correlation-123");

        assertEquals("abc12345", result.response().shortCode());
        assertEquals("https://example.com/products/123", result.response().originalUrl());
        assertEquals(false, result.replayed());
    }

    @Test
    void createsUrlWithCustomAlias() {
        CreateUrlRequest request = new CreateUrlRequest(
                "https://example.com/products/123",
                "my-link",
                null);

        when(shortenedUrlRepository.saveAndFlush(any(ShortenedUrl.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        UrlService.CreationResult result = urlService.createShortUrl(request, null, "correlation-123");

        assertEquals("my-link", result.response().shortCode());
    }

    @Test
    void rejectsExpiredExpirationDate() {
        CreateUrlRequest request = new CreateUrlRequest(
                "https://example.com/products/123",
                null,
                Instant.parse("2026-08-06T12:00:00Z"));

        assertThrows(
                InvalidRequestException.class,
                () -> urlService.createShortUrl(request, null, "correlation-123"));
    }

    @Test
    void throwsConflictWhenVersionDoesNotMatch() {
        UUID urlId = UUID.randomUUID();
        ShortenedUrl shortenedUrl = createUrl(urlId, "abc12345");

        when(shortenedUrlRepository.findByPublicId(urlId.toString())).thenReturn(Optional.of(shortenedUrl));

        assertThrows(
                ConflictException.class,
                () -> urlService.disable(urlId, 10L, "correlation-123"));
    }

    @Test
    void disablesUrl() {
        UUID urlId = UUID.randomUUID();
        ShortenedUrl shortenedUrl = createUrl(urlId, "abc12345");

        when(shortenedUrlRepository.findByPublicId(urlId.toString())).thenReturn(Optional.of(shortenedUrl));
        when(shortenedUrlRepository.save(shortenedUrl)).thenReturn(shortenedUrl);

        UrlResponse response = urlService.disable(urlId, 0L, "correlation-123");

        assertEquals("DISABLED", response.status().name());
        verify(shortenedUrlRepository).save(shortenedUrl);
    }

    @Test
    void deletesUrl() {
        UUID urlId = UUID.randomUUID();
        ShortenedUrl shortenedUrl = createUrl(urlId, "abc12345");

        when(shortenedUrlRepository.findByPublicId(urlId.toString())).thenReturn(Optional.of(shortenedUrl));

        urlService.delete(urlId, 0L, "correlation-123");

        verify(shortenedUrlRepository).save(shortenedUrl);
    }

    private ShortenedUrl createUrl(UUID urlId, String shortCode) {
        return ShortenedUrl.create(
                urlId,
                shortCode,
                "https://example.com/products/123",
                CodeType.GENERATED,
                null,
                Instant.parse("2026-08-01T12:00:00Z"));
    }
}