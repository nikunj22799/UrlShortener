package com.example.urlshortener.service;

import com.example.urlshortener.config.ApplicationProperties;
import com.example.urlshortener.dto.AnalyticsDevicesResponse;
import com.example.urlshortener.dto.AnalyticsPoint;
import com.example.urlshortener.dto.AnalyticsReferrersResponse;
import com.example.urlshortener.dto.AnalyticsSummaryResponse;
import com.example.urlshortener.dto.AnalyticsTimeseriesResponse;
import com.example.urlshortener.dto.NamedCount;
import com.example.urlshortener.dto.TimeBucket;
import com.example.urlshortener.entity.ClickEvent;
import com.example.urlshortener.entity.ShortenedUrl;
import com.example.urlshortener.exception.InvalidRequestException;
import com.example.urlshortener.exception.UrlNotFoundException;
import com.example.urlshortener.repository.AnalyticsQueryRepository;
import com.example.urlshortener.repository.AnalyticsQueryRepository.BucketRow;
import com.example.urlshortener.repository.AnalyticsQueryRepository.NamedCountRow;
import com.example.urlshortener.repository.AnalyticsQueryRepository.SummaryRow;
import com.example.urlshortener.repository.ClickEventRepository;
import com.example.urlshortener.repository.ShortenedUrlRepository;
import java.net.URI;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AnalyticsService {
    private static final Logger LOGGER = LoggerFactory.getLogger(AnalyticsService.class);
    private static final String CONSISTENCY = "NEAR_REAL_TIME";
    private static final String COMPLETENESS = "BEST_EFFORT";
    private final ShortenedUrlRepository shortenedUrlRepository;
    private final ClickEventRepository clickEventRepository;
    private final AnalyticsQueryRepository analyticsQueryRepository;
    private final ApplicationProperties properties;
    private final Clock clock;

    public AnalyticsService(
            ShortenedUrlRepository shortenedUrlRepository,
            ClickEventRepository clickEventRepository,
            AnalyticsQueryRepository analyticsQueryRepository,
            ApplicationProperties properties,
            Clock clock) {
        this.shortenedUrlRepository = shortenedUrlRepository;
        this.clickEventRepository = clickEventRepository;
        this.analyticsQueryRepository = analyticsQueryRepository;
        this.properties = properties;
        this.clock = clock;
    }

    public void recordBestEffort(
            Long shortenedUrlId,
            String referrer,
            String userAgent,
            String correlationId) {
        try {
            String browser = getBrowser(userAgent);
            String operatingSystem = getOperatingSystem(userAgent);
            String deviceType = getDeviceType(userAgent);
            String referrerHost = getReferrerHost(referrer);
            ClickEvent clickEvent = new ClickEvent(
                    shortenedUrlId,
                    clock.instant(),
                    referrerHost,
                    browser,
                    operatingSystem,
                    deviceType,
                    correlationId);
            clickEventRepository.save(clickEvent);
        } catch (RuntimeException exception) {
        	LOGGER.warn(
                    "Analytics event could not be recorded for shortenedUrlId={}",
                    shortenedUrlId,
                    exception);
        }
    }

    @Transactional(readOnly = true)
    public AnalyticsSummaryResponse getSummary(UUID urlId, Instant from, Instant to) {
        ShortenedUrl shortenedUrl = findUrl(urlId);
        AnalyticsRange range = getRange(from, to, null);
        Timestamp fromTimestamp = Timestamp.from(range.from());
        Timestamp toTimestamp = Timestamp.from(range.to());
        SummaryRow summary = analyticsQueryRepository.getSummary(
                shortenedUrl.getId(),
                fromTimestamp,
                toTimestamp);
        AnalyticsSummaryResponse response = new AnalyticsSummaryResponse(
                urlId,
                summary.clicks(),
                summary.lastEventAt(),
                range.from(),
                range.to(),
                CONSISTENCY,
                COMPLETENESS);
        return response;
    }

    @Transactional(readOnly = true)
    public AnalyticsTimeseriesResponse getTimeSeries(
            UUID urlId,
            Instant from,
            Instant to,
            TimeBucket bucket) {
        ShortenedUrl shortenedUrl = findUrl(urlId);
        TimeBucket selectedBucket = bucket == null ? TimeBucket.DAY : bucket;
        AnalyticsRange range = getRange(from, to, selectedBucket);
        Timestamp fromTimestamp = Timestamp.from(range.from());
        Timestamp toTimestamp = Timestamp.from(range.to());
        List<BucketRow> rows;
        if (selectedBucket == TimeBucket.HOUR) {
            rows = analyticsQueryRepository.getHourlyClicks(
                    shortenedUrl.getId(),
                    fromTimestamp,
                    toTimestamp);
        } else {
            rows = analyticsQueryRepository.getDailyClicks(
                    shortenedUrl.getId(),
                    fromTimestamp,
                    toTimestamp);
        }
        Map<Instant, Long> clickCounts = rows.stream()
                .collect(Collectors.toMap(BucketRow::start, BucketRow::clicks));
        List<AnalyticsPoint> points = buildTimeSeries(range, selectedBucket, clickCounts);
        AnalyticsTimeseriesResponse response = new AnalyticsTimeseriesResponse(
                urlId,
                selectedBucket,
                points,
                range.from(),
                range.to(),
                CONSISTENCY,
                COMPLETENESS);
        return response;
    }

    @Transactional(readOnly = true)
    public AnalyticsReferrersResponse getReferrers(
            UUID urlId,
            Instant from,
            Instant to,
            Integer limit) {
        ShortenedUrl shortenedUrl = findUrl(urlId);
        AnalyticsRange range = getRange(from, to, null);
        int referrerLimit = getReferrerLimit(limit);
        Timestamp fromTimestamp = Timestamp.from(range.from());
        Timestamp toTimestamp = Timestamp.from(range.to());
        List<NamedCountRow> rows = analyticsQueryRepository.getReferrers(
                shortenedUrl.getId(),
                fromTimestamp,
                toTimestamp,
                referrerLimit);
        List<NamedCount> referrers = toNamedCounts(rows);
        AnalyticsReferrersResponse response = new AnalyticsReferrersResponse(
                urlId,
                referrers,
                range.from(),
                range.to(),
                CONSISTENCY,
                COMPLETENESS);
        return response;
    }

    @Transactional(readOnly = true)
    public AnalyticsDevicesResponse getDevices(UUID urlId, Instant from, Instant to) {
        ShortenedUrl shortenedUrl = findUrl(urlId);
        AnalyticsRange range = getRange(from, to, null);
        Timestamp fromTimestamp = Timestamp.from(range.from());
        Timestamp toTimestamp = Timestamp.from(range.to());
        long shortenedUrlId = shortenedUrl.getId();
        List<NamedCount> deviceTypes = toNamedCounts(
                analyticsQueryRepository.getDeviceTypes(shortenedUrlId, fromTimestamp, toTimestamp));
        List<NamedCount> browsers = toNamedCounts(
                analyticsQueryRepository.getBrowsers(shortenedUrlId, fromTimestamp, toTimestamp));
        List<NamedCount> operatingSystems = toNamedCounts(
                analyticsQueryRepository.getOperatingSystems(shortenedUrlId, fromTimestamp, toTimestamp));
        AnalyticsDevicesResponse response = new AnalyticsDevicesResponse(
                urlId,
                deviceTypes,
                browsers,
                operatingSystems,
                range.from(),
                range.to(),
                CONSISTENCY,
                COMPLETENESS);
        return response;
    }

    private ShortenedUrl findUrl(UUID urlId) {
        ShortenedUrl shortenedUrl = shortenedUrlRepository.findByPublicId(urlId.toString())
                .orElseThrow(UrlNotFoundException::new);
        return shortenedUrl;
    }

    private AnalyticsRange getRange(Instant from, Instant to, TimeBucket bucket) {
        if ((from == null) != (to == null)) {
            throw new InvalidRequestException("from and to must be supplied together");
        }
        Instant rangeEnd = to == null ? clock.instant() : to;
        Instant rangeStart = from == null
                ? rangeEnd.minus(properties.analytics().defaultRangeDays(), ChronoUnit.DAYS)
                : from;
        if (!rangeStart.isBefore(rangeEnd)) {
            throw new InvalidRequestException("from must be earlier than to");
        }
        Duration duration = Duration.between(rangeStart, rangeEnd);
        if (duration.toDays() > properties.analytics().maximumRangeDays()) {
            throw new InvalidRequestException(
                    "analytics range must not exceed "
                            + properties.analytics().maximumRangeDays()
                            + " days");
        }
        if (bucket == TimeBucket.HOUR
                && duration.toDays() > properties.analytics().maximumHourlyRangeDays()) {
            throw new InvalidRequestException(
                    "hourly analytics must not exceed "
                            + properties.analytics().maximumHourlyRangeDays()
                            + " days");
        }
        return new AnalyticsRange(rangeStart, rangeEnd);
    }

    private int getReferrerLimit(Integer requestedLimit) {
        int limit = requestedLimit == null
                ? properties.analytics().defaultReferrerLimit()
                : requestedLimit;
        int maximumLimit = properties.analytics().maximumReferrerLimit();
        if (limit < 1 || limit > maximumLimit) {
            throw new InvalidRequestException(
                    "limit",
                    "must be between 1 and " + maximumLimit);
        }
        return limit;
    }

    private List<AnalyticsPoint> buildTimeSeries(
            AnalyticsRange range,
            TimeBucket bucket,
            Map<Instant, Long> clickCounts) {
        List<AnalyticsPoint> points = new ArrayList<>();
        Instant current = getBucketStart(range.from(), bucket);
        while (current.isBefore(range.to())) {
            Instant next = bucket == TimeBucket.HOUR
                    ? current.plus(1, ChronoUnit.HOURS)
                    : current.plus(1, ChronoUnit.DAYS);
            Instant start = current.isBefore(range.from()) ? range.from() : current;
            Instant end = next.isAfter(range.to()) ? range.to() : next;
            long clicks = clickCounts.getOrDefault(current, 0L);
            points.add(new AnalyticsPoint(start, end, clicks));
            current = next;
        }
        return points;
    }

    private Instant getBucketStart(Instant value, TimeBucket bucket) {
        if (bucket == TimeBucket.HOUR) {
            return value.truncatedTo(ChronoUnit.HOURS);
        }
        return value.atZone(ZoneOffset.UTC)
                .toLocalDate()
                .atStartOfDay()
                .toInstant(ZoneOffset.UTC);
    }

    private List<NamedCount> toNamedCounts(List<NamedCountRow> rows) {
        List<NamedCount> counts = rows.stream()
                .map(row -> new NamedCount(row.name(), row.clicks()))
                .toList();
        return counts;
    }

    private String getBrowser(String userAgent) {
        String value = normalizeUserAgent(userAgent);
        if (value.contains("edg/")) return "EDGE";
        if (value.contains("firefox/")) return "FIREFOX";
        if (value.contains("chrome/") || value.contains("crios/")) return "CHROME";
        if (value.contains("safari/")) return "SAFARI";
        if (isBot(value)) return "BOT";
        return value.isEmpty() ? "UNKNOWN" : "OTHER";
    }

    private String getOperatingSystem(String userAgent) {
        String value = normalizeUserAgent(userAgent);
        if (value.contains("windows")) return "WINDOWS";
        if (value.contains("android")) return "ANDROID";
        if (value.contains("iphone") || value.contains("ipad")) return "IOS";
        if (value.contains("macintosh") || value.contains("mac os")) return "MACOS";
        if (value.contains("linux")) return "LINUX";
        return "UNKNOWN";
    }

    private String getDeviceType(String userAgent) {
        String value = normalizeUserAgent(userAgent);
        if (isBot(value)) return "BOT";
        if (value.contains("tablet") || value.contains("ipad")) return "TABLET";
        if (value.contains("mobile") || value.contains("iphone") || value.contains("android")) return "MOBILE";
        if (value.contains("windows") || value.contains("macintosh") || value.contains("linux")) return "DESKTOP";
        return "OTHER";
    }

    private String normalizeUserAgent(String userAgent) {
        return userAgent == null ? "" : userAgent.toLowerCase(Locale.ROOT);
    }

    private boolean isBot(String userAgent) {
        return userAgent.contains("bot")
                || userAgent.contains("spider")
                || userAgent.contains("crawler");
    }

    private String getReferrerHost(String referrer) {
        if (referrer == null || referrer.isBlank()) {
            return null;
        }
        try {
            return URI.create(referrer).getHost();
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }

    private record AnalyticsRange(Instant from, Instant to) {}
}