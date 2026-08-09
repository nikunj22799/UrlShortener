package com.example.urlshortener.controller;

import com.example.urlshortener.config.CorrelationIdFilter;
import com.example.urlshortener.dto.CreateUrlRequest;
import com.example.urlshortener.dto.LifecycleStatus;
import com.example.urlshortener.dto.UrlExpirationPatchRequest;
import com.example.urlshortener.dto.UrlListResponse;
import com.example.urlshortener.dto.UrlResponse;
import com.example.urlshortener.exception.InvalidRequestException;
import com.example.urlshortener.exception.InvalidRequestException;
import com.example.urlshortener.service.UrlService;
import com.example.urlshortener.service.UrlService.CreationResult;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/v1/urls")
public class UrlController {
    private static final Pattern ETAG_PATTERN = Pattern.compile("\"([0-9]+)\"");
    private final UrlService urlService;

    public UrlController(UrlService urlService) {
        this.urlService = urlService;
    }

    @PostMapping
    public ResponseEntity<UrlResponse> createUrl(
            @Valid @RequestBody CreateUrlRequest request,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
            HttpServletRequest servletRequest) {
        CreationResult creationResult = urlService.createShortUrl(
                request,
                idempotencyKey,
                correlationId(servletRequest));
        UrlResponse urlResponse = creationResult.response();
        ResponseEntity.BodyBuilder responseBuilder =
                ResponseEntity.created(URI.create("/api/v1/urls/" + urlResponse.id()))
                        .eTag(Long.toString(urlResponse.version()));
        if (creationResult.replayed()) {
            responseBuilder.header("Idempotency-Replayed", "true");
        }
        return responseBuilder.body(urlResponse);
    }

    @GetMapping("/{urlId}")
    public ResponseEntity<UrlResponse> getUrl(@PathVariable UUID urlId) {
        return withEntityTag(urlService.getUrl(urlId));
    }

    @GetMapping
    public UrlListResponse getUrls(
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) LifecycleStatus status,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "createdAt") String sort,
            @RequestParam(defaultValue = "desc") String direction,
            @RequestParam(required = false) Boolean expired) {
        return urlService.listUrls(page, size, status, search, sort, direction, expired);
    }

    @PatchMapping("/{urlId}")
    public ResponseEntity<UrlResponse> updateUrlExpiration(
            @PathVariable UUID urlId,
            @RequestHeader(name = HttpHeaders.IF_MATCH, required = false) String ifMatch,
            @RequestBody UrlExpirationPatchRequest request,
            HttpServletRequest servletRequest) {
        if (!request.isExpiresAtPresent()) {
            throw new InvalidRequestException("expiresAt", "is required and may be null");
        }
        return withEntityTag(urlService.updateExpiration(
                urlId,
                requiredVersion(ifMatch),
                request.getExpiresAt(),
                correlationId(servletRequest)));
    }

    @PostMapping("/{urlId}/enable")
    public ResponseEntity<UrlResponse> enableUrl(
            @PathVariable UUID urlId,
            @RequestHeader(name = HttpHeaders.IF_MATCH, required = false) String ifMatch,
            HttpServletRequest servletRequest) {
        return withEntityTag(urlService.enable(
                urlId,
                requiredVersion(ifMatch),
                correlationId(servletRequest)));
    }

    @PostMapping("/{urlId}/disable")
    public ResponseEntity<UrlResponse> disableUrl(
            @PathVariable UUID urlId,
            @RequestHeader(name = HttpHeaders.IF_MATCH, required = false) String ifMatch,
            HttpServletRequest servletRequest) {
        return withEntityTag(urlService.disable(
                urlId,
                requiredVersion(ifMatch),
                correlationId(servletRequest)));
    }

    @DeleteMapping("/{urlId}")
    public ResponseEntity<Void> deleteUrl(
            @PathVariable UUID urlId,
            @RequestHeader(name = HttpHeaders.IF_MATCH, required = false) String ifMatch,
            HttpServletRequest servletRequest) {
        urlService.delete(
                urlId,
                optionalVersion(ifMatch),
                correlationId(servletRequest));
        return ResponseEntity.noContent().build();
    }

    private ResponseEntity<UrlResponse> withEntityTag(UrlResponse urlResponse) {
        return ResponseEntity.ok()
                .eTag(Long.toString(urlResponse.version()))
                .body(urlResponse);
    }

    private long requiredVersion(String ifMatch) {
        if (ifMatch == null) {
            throw new InvalidRequestException("If-Match", "header is required");
        }
        return parseVersion(ifMatch);
    }

    private Long optionalVersion(String ifMatch) {
        return ifMatch == null ? null : parseVersion(ifMatch);
    }

    private long parseVersion(String ifMatch) {
        Matcher matcher = ETAG_PATTERN.matcher(ifMatch);
        if (!matcher.matches()) {
            throw new InvalidRequestException(
                    "If-Match",
                    "must be a strong numeric ETag such as \"0\"");
        }
        try {
            return Long.parseLong(matcher.group(1));
        } catch (NumberFormatException exception) {
            throw new InvalidRequestException(
                    "If-Match",
                    "contains an unsupported version value");
        }
    }

    private String correlationId(HttpServletRequest request) {
        Object value = request.getAttribute(CorrelationIdFilter.ATTRIBUTE_NAME);
        return value instanceof String correlationId ? correlationId : null;
    }
}