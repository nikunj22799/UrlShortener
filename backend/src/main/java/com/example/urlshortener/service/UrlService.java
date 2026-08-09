package com.example.urlshortener.service;

import com.example.urlshortener.config.ApplicationProperties;
import com.example.urlshortener.dto.CreateUrlRequest;
import com.example.urlshortener.dto.LifecycleStatus;
import com.example.urlshortener.dto.UrlListResponse;
import com.example.urlshortener.dto.UrlResponse;
import com.example.urlshortener.entity.CodeType;
import com.example.urlshortener.entity.IdempotencyRecord;
import com.example.urlshortener.entity.ShortenedUrl;
import com.example.urlshortener.entity.UrlStatus;
import com.example.urlshortener.exception.ConflictException;
import com.example.urlshortener.exception.InvalidRequestException;
import com.example.urlshortener.exception.UrlNotFoundException;
import com.example.urlshortener.repository.IdempotencyRecordRepository;
import com.example.urlshortener.repository.ShortenedUrlRepository;
import com.example.urlshortener.util.ShortCodeGenerator;
import com.example.urlshortener.util.UrlValidator;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class UrlService {
    private static final int MAX_SEARCH_LENGTH = 200;
    private static final Pattern IDEMPOTENCY_KEY_PATTERN = Pattern.compile("[A-Za-z0-9._~-]{8,128}");
    private final ShortenedUrlRepository shortenedUrlRepository;
    private final IdempotencyRecordRepository idempotencyRecordRepository;
    private final UrlValidator urlValidator;
    private final ShortCodeGenerator shortCodeGenerator;
    private final ApplicationProperties properties;
    private final Clock clock;
    private final TransactionTemplate newTransaction;

    public UrlService(ShortenedUrlRepository shortenedUrlRepository, IdempotencyRecordRepository idempotencyRecordRepository, UrlValidator urlValidator, ShortCodeGenerator shortCodeGenerator, ApplicationProperties properties, Clock clock, PlatformTransactionManager transactionManager) {
        this.shortenedUrlRepository = shortenedUrlRepository;
        this.idempotencyRecordRepository = idempotencyRecordRepository;
        this.urlValidator = urlValidator;
        this.shortCodeGenerator = shortCodeGenerator;
        this.properties = properties;
        this.clock = clock;
        this.newTransaction = new TransactionTemplate(transactionManager);
        this.newTransaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    public CreationResult createShortUrl(CreateUrlRequest request, String idempotencyKey) {
        String originalUrl = urlValidator.validateDestination(request.originalUrl());
        String customAlias = urlValidator.normalizeAlias(request.customAlias());
        Instant now = clock.instant();
        validateExpiration(request.expiresAt(), now);
        if (idempotencyKey == null) {
            ShortenedUrl shortenedUrl = createUrl(originalUrl, customAlias, request.expiresAt(), now);
            return new CreationResult(toResponse(shortenedUrl, now), false);
        }
        return createIdempotentUrl(request, originalUrl, customAlias, idempotencyKey, now);
    }

    @Transactional(readOnly = true)
    public UrlResponse getUrl(UUID urlId) {
        ShortenedUrl shortenedUrl = findUrl(urlId);
        return toResponse(shortenedUrl, clock.instant());
    }

    @Transactional(readOnly = true)
    public UrlListResponse listUrls(Integer page, Integer size, LifecycleStatus status, String search, String sort, String direction, Boolean expired) {
        int pageNumber = page == null ? 0 : page;
        int pageSize = size == null ? properties.pagination().defaultSize() : size;
        validatePagination(pageNumber, pageSize);
        if (status == LifecycleStatus.DELETED && expired != null) {
            throw new InvalidRequestException("expired", "cannot be combined with status DELETED");
        }
        String searchText = validateSearch(search);
        String statusValue = status == null ? null : status.name();
        Sort.Direction sortDirection = getSortDirection(direction);
        String sortField = getSortField(sort);
        Sort sorting = Sort.by(sortDirection, sortField).and(Sort.by(sortDirection, "id"));
        PageRequest pageRequest = PageRequest.of(pageNumber, pageSize, sorting);
        Instant now = clock.instant();
        Page<ShortenedUrl> result = shortenedUrlRepository.searchUrls(statusValue, searchText, expired, now, pageRequest);
        List<UrlResponse> urls = result.stream().map(url -> toResponse(url, now)).toList();
        return new UrlListResponse(urls, pageNumber, pageSize, result.getTotalElements(), result.getTotalPages(), sortField, sortDirection.name().toLowerCase(Locale.ROOT));
    }

    @Transactional
    public UrlResponse updateExpiration(UUID urlId, long expectedVersion, Instant expiresAt) {
        ShortenedUrl shortenedUrl = findUrl(urlId);
        validateActiveUrl(shortenedUrl);
        validateVersion(shortenedUrl, expectedVersion);
        Instant now = clock.instant();
        validateExpiration(expiresAt, now);
        shortenedUrl.updateExpiration(expiresAt, now);
        ShortenedUrl updatedUrl = shortenedUrlRepository.save(shortenedUrl);
        return toResponse(updatedUrl, now);
    }

    @Transactional
    public UrlResponse enable(UUID urlId, long expectedVersion) {
        ShortenedUrl shortenedUrl = findUrl(urlId);
        validateActiveUrl(shortenedUrl);
        validateVersion(shortenedUrl, expectedVersion);
        Instant now = clock.instant();
        shortenedUrl.enable(now);
        ShortenedUrl updatedUrl = shortenedUrlRepository.save(shortenedUrl);
        return toResponse(updatedUrl, now);
    }

    @Transactional
    public UrlResponse disable(UUID urlId, long expectedVersion) {
        ShortenedUrl shortenedUrl = findUrl(urlId);
        validateActiveUrl(shortenedUrl);
        validateVersion(shortenedUrl, expectedVersion);
        Instant now = clock.instant();
        shortenedUrl.disable(now);
        ShortenedUrl updatedUrl = shortenedUrlRepository.save(shortenedUrl);
        return toResponse(updatedUrl, now);
    }

    @Transactional
    public void delete(UUID urlId, Long expectedVersion) {
        ShortenedUrl shortenedUrl = findUrl(urlId);
        if (shortenedUrl.isDeleted()) {
            return;
        }
        if (expectedVersion == null) {
            throw new InvalidRequestException("If-Match", "header is required");
        }
        validateVersion(shortenedUrl, expectedVersion);
        shortenedUrl.markDeleted(clock.instant());
        shortenedUrlRepository.save(shortenedUrl);
    }

    private ShortenedUrl createUrl(String originalUrl, String customAlias, Instant expiresAt, Instant createdAt) {
        if (customAlias != null) {
            return createCustomAlias(originalUrl, customAlias, expiresAt, createdAt);
        }
        return createGeneratedUrl(originalUrl, expiresAt, createdAt);
    }

    private ShortenedUrl createCustomAlias(String originalUrl, String customAlias, Instant expiresAt, Instant createdAt) {
        ShortenedUrl shortenedUrl = newUrl(originalUrl, customAlias, CodeType.CUSTOM_ALIAS, expiresAt, createdAt);
        try {
            return saveInNewTransaction(shortenedUrl);
        } catch (DataIntegrityViolationException exception) {
            throw new ConflictException("ALIAS_CONFLICT", "Custom alias already exists");
        }
    }

    private ShortenedUrl createGeneratedUrl(String originalUrl, Instant expiresAt, Instant createdAt) {
        int maximumAttempts = properties.shortCode().maximumAttempts();
        for (int attempt = 0; attempt < maximumAttempts; attempt++) {
            String shortCode = shortCodeGenerator.generateShortCode();
            if (urlValidator.isReservedAlias(shortCode)) {
                continue;
            }
            ShortenedUrl shortenedUrl = newUrl(originalUrl, shortCode, CodeType.GENERATED, expiresAt, createdAt);
            try {
                return saveInNewTransaction(shortenedUrl);
            } catch (DataIntegrityViolationException exception) {
                if (!isShortCodeConflict(exception)) {
                    throw exception;
                }
            }
        }
        throw new ConflictException("SHORT_CODE_CONFLICT", "Unable to generate a unique short code");
    }

    private CreationResult createIdempotentUrl(CreateUrlRequest request, String originalUrl, String customAlias, String idempotencyKey, Instant now) {
        validateIdempotencyKey(idempotencyKey);
        byte[] keyHash = sha256(idempotencyKey);
        byte[] requestHash = createRequestHash(request, originalUrl, customAlias);
        Optional<IdempotencyRecord> existing = idempotencyRecordRepository.findByKeyHash(keyHash);
        if (existing.isPresent()) {
            IdempotencyRecord record = existing.get();
            if (!record.isExpiredAt(now)) {
                if (!record.hasRequestHash(requestHash)) {
                    throw new ConflictException("IDEMPOTENCY_CONFLICT", "Idempotency key was already used for a different request");
                }
                return new CreationResult(toResponse(record.getShortenedUrl(), now), true);
            }
            idempotencyRecordRepository.delete(record);
            idempotencyRecordRepository.flush();
        }
        ShortenedUrl shortenedUrl = createUrl(originalUrl, customAlias, request.expiresAt(), now);
        Instant recordExpiresAt = now.plus(properties.idempotency().retentionHours(), ChronoUnit.HOURS);
        IdempotencyRecord record = new IdempotencyRecord(keyHash, requestHash, shortenedUrl, now, recordExpiresAt);
        idempotencyRecordRepository.save(record);
        return new CreationResult(toResponse(shortenedUrl, now), false);
    }

    private ShortenedUrl saveInNewTransaction(ShortenedUrl shortenedUrl) {
        ShortenedUrl savedUrl = newTransaction.execute(status -> shortenedUrlRepository.saveAndFlush(shortenedUrl));
        if (savedUrl == null) {
            throw new IllegalStateException("URL could not be saved");
        }
        return savedUrl;
    }

    private ShortenedUrl findUrl(UUID urlId) {
        return shortenedUrlRepository.findByPublicId(urlId.toString()).orElseThrow(UrlNotFoundException::new);
    }

    private ShortenedUrl newUrl(String originalUrl, String shortCode, CodeType codeType, Instant expiresAt, Instant createdAt) {
        return ShortenedUrl.create(UUID.randomUUID(), shortCode, originalUrl, codeType, expiresAt, createdAt);
    }

    private void validateActiveUrl(ShortenedUrl shortenedUrl) {
        if (shortenedUrl.isDeleted()) {
            throw new UrlNotFoundException("URL has been deleted");
        }
    }

    private void validateVersion(ShortenedUrl shortenedUrl, long expectedVersion) {
        if (shortenedUrl.getVersion() != expectedVersion) {
            throw new ConflictException("VERSION_CONFLICT", "URL has been modified by another request");
        }
    }

    private void validateExpiration(Instant expiresAt, Instant now) {
        if (expiresAt != null && !expiresAt.isAfter(now)) {
            throw new InvalidRequestException("expiresAt", "must be in the future");
        }
    }

    private void validatePagination(int page, int size) {
        if (page < 0) {
            throw new InvalidRequestException("page", "must be greater than or equal to 0");
        }
        int maximumSize = properties.pagination().maximumSize();
        if (size < 1 || size > maximumSize) {
            throw new InvalidRequestException("size", "must be between 1 and " + maximumSize);
        }
    }

    private String validateSearch(String search) {
        if (search == null) {
            return null;
        }
        String searchText = search.trim();
        if (searchText.isEmpty()) {
            throw new InvalidRequestException("search", "must not be blank");
        }
        if (searchText.length() > MAX_SEARCH_LENGTH) {
            throw new InvalidRequestException("search", "must not exceed " + MAX_SEARCH_LENGTH + " characters");
        }
        return searchText;
    }

    private Sort.Direction getSortDirection(String direction) {
        if (direction == null || direction.equalsIgnoreCase("desc")) {
            return Sort.Direction.DESC;
        }
        if (direction.equalsIgnoreCase("asc")) {
            return Sort.Direction.ASC;
        }
        throw new InvalidRequestException("direction", "must be either asc or desc");
    }

    private String getSortField(String sort) {
        if (sort == null) {
            return "createdAt";
        }
        return switch (sort) {
            case "createdAt", "updatedAt", "expiresAt", "shortCode", "status" -> sort;
            default -> throw new InvalidRequestException("sort", "must be one of createdAt, updatedAt, expiresAt, shortCode, status");
        };
    }

    private void validateIdempotencyKey(String idempotencyKey) {
        if (!IDEMPOTENCY_KEY_PATTERN.matcher(idempotencyKey).matches()) {
            throw new InvalidRequestException("Idempotency-Key", "must contain 8 to 128 letters, digits, periods, underscores, tildes, or hyphens");
        }
    }

    private byte[] createRequestHash(CreateUrlRequest request, String originalUrl, String customAlias) {
        String value = originalUrl + "|" + (customAlias == null ? "" : customAlias) + "|" + (request.expiresAt() == null ? "" : request.expiresAt());
        return sha256(value);
    }

    private byte[] sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return digest.digest(value.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available", exception);
        }
    }

    private boolean isShortCodeConflict(Throwable exception) {
        Throwable cause = exception;
        while (cause != null) {
            String message = cause.getMessage();
            if (message != null && message.contains("uk_shortened_url_short_code")) {
                return true;
            }
            cause = cause.getCause();
        }
        return false;
    }

    private UrlResponse toResponse(ShortenedUrl shortenedUrl, Instant now) {
        LifecycleStatus status;
        if (shortenedUrl.isDeleted()) {
            status = LifecycleStatus.DELETED;
        } else if (shortenedUrl.getStatus() == UrlStatus.ACTIVE) {
            status = LifecycleStatus.ACTIVE;
        } else {
            status = LifecycleStatus.DISABLED;
        }
        return new UrlResponse(shortenedUrl.getPublicId(), shortenedUrl.getShortCode(), buildShortUrl(shortenedUrl.getShortCode()), shortenedUrl.getOriginalUrl(), shortenedUrl.getCodeType(), status, shortenedUrl.isExpiredAt(now), shortenedUrl.getExpiresAt(), shortenedUrl.getCreatedAt(), shortenedUrl.getUpdatedAt(), shortenedUrl.getDeletedAt(), shortenedUrl.getVersion());
    }

    private URI buildShortUrl(String shortCode) {
        String baseUrl = properties.baseUrl().toString();
        if (baseUrl.endsWith("/")) {
            baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
        }
        return URI.create(baseUrl + "/r/" + shortCode);
    }

    public record CreationResult(UrlResponse response, boolean replayed) {}
}