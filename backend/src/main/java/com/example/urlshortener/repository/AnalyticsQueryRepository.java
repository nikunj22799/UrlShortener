package com.example.urlshortener.repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AnalyticsQueryRepository {
    private final JdbcTemplate jdbcTemplate;

    public AnalyticsQueryRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public SummaryRow getSummary(long shortenedUrlId, Timestamp from, Timestamp to) {
        String sql = """
                SELECT COUNT(*) AS clicks,
                       MAX(occurred_at) AS last_event_at
                FROM click_event
                WHERE shortened_url_id = ?
                  AND occurred_at >= ?
                  AND occurred_at < ?
                """;
        SummaryRow summary = jdbcTemplate.queryForObject(
                sql,
                this::mapSummary,
                shortenedUrlId,
                from,
                to);
        return summary;
    }

    public List<BucketRow> getHourlyClicks(long shortenedUrlId, Timestamp from, Timestamp to) {
        String sql = """
                SELECT TIMESTAMP(DATE_FORMAT(occurred_at, '%Y-%m-%d %H:00:00')) AS bucket_start,
                       COUNT(*) AS clicks
                FROM click_event
                WHERE shortened_url_id = ?
                  AND occurred_at >= ?
                  AND occurred_at < ?
                GROUP BY bucket_start
                ORDER BY bucket_start
                """;
        List<BucketRow> results = jdbcTemplate.query(
                sql,
                this::mapBucket,
                shortenedUrlId,
                from,
                to);
        return results;
    }

    public List<BucketRow> getDailyClicks(long shortenedUrlId, Timestamp from, Timestamp to) {
        String sql = """
                SELECT TIMESTAMP(DATE(occurred_at)) AS bucket_start,
                       COUNT(*) AS clicks
                FROM click_event
                WHERE shortened_url_id = ?
                  AND occurred_at >= ?
                  AND occurred_at < ?
                GROUP BY bucket_start
                ORDER BY bucket_start
                """;
        List<BucketRow> results = jdbcTemplate.query(
                sql,
                this::mapBucket,
                shortenedUrlId,
                from,
                to);
        return results;
    }

    public List<NamedCountRow> getReferrers(
            long shortenedUrlId,
            Timestamp from,
            Timestamp to,
            int limit) {
        String sql = """
                SELECT COALESCE(referrer_host, 'DIRECT_OR_UNKNOWN') AS name,
                       COUNT(*) AS clicks
                FROM click_event
                WHERE shortened_url_id = ?
                  AND occurred_at >= ?
                  AND occurred_at < ?
                GROUP BY COALESCE(referrer_host, 'DIRECT_OR_UNKNOWN')
                ORDER BY clicks DESC, name ASC
                LIMIT ?
                """;
        List<NamedCountRow> results = jdbcTemplate.query(
                sql,
                this::mapNamedCount,
                shortenedUrlId,
                from,
                to,
                limit);
        return results;
    }

    public List<NamedCountRow> getDeviceTypes(long shortenedUrlId, Timestamp from, Timestamp to) {
        String sql = """
                SELECT COALESCE(device_type, 'UNKNOWN') AS name,
                       COUNT(*) AS clicks
                FROM click_event
                WHERE shortened_url_id = ?
                  AND occurred_at >= ?
                  AND occurred_at < ?
                GROUP BY COALESCE(device_type, 'UNKNOWN')
                ORDER BY clicks DESC, name ASC
                """;
        List<NamedCountRow> results = jdbcTemplate.query(
                sql,
                this::mapNamedCount,
                shortenedUrlId,
                from,
                to);
        return results;
    }

    public List<NamedCountRow> getBrowsers(long shortenedUrlId, Timestamp from, Timestamp to) {
        String sql = """
                SELECT COALESCE(browser_family, 'UNKNOWN') AS name,
                       COUNT(*) AS clicks
                FROM click_event
                WHERE shortened_url_id = ?
                  AND occurred_at >= ?
                  AND occurred_at < ?
                GROUP BY COALESCE(browser_family, 'UNKNOWN')
                ORDER BY clicks DESC, name ASC
                """;
        List<NamedCountRow> results = jdbcTemplate.query(
                sql,
                this::mapNamedCount,
                shortenedUrlId,
                from,
                to);
        return results;
    }

    public List<NamedCountRow> getOperatingSystems(long shortenedUrlId, Timestamp from, Timestamp to) {
        String sql = """
                SELECT COALESCE(operating_system_family, 'UNKNOWN') AS name,
                       COUNT(*) AS clicks
                FROM click_event
                WHERE shortened_url_id = ?
                  AND occurred_at >= ?
                  AND occurred_at < ?
                GROUP BY COALESCE(operating_system_family, 'UNKNOWN')
                ORDER BY clicks DESC, name ASC
                """;
        List<NamedCountRow> results = jdbcTemplate.query(
                sql,
                this::mapNamedCount,
                shortenedUrlId,
                from,
                to);
        return results;
    }

    private SummaryRow mapSummary(ResultSet resultSet, int rowNumber) throws SQLException {
        long clicks = resultSet.getLong("clicks");
        Timestamp lastEventTimestamp = resultSet.getTimestamp("last_event_at");
        Instant lastEventAt = lastEventTimestamp == null ? null : lastEventTimestamp.toInstant();
        return new SummaryRow(clicks, lastEventAt);
    }

    private BucketRow mapBucket(ResultSet resultSet, int rowNumber) throws SQLException {
        Instant start = resultSet.getTimestamp("bucket_start").toInstant();
        long clicks = resultSet.getLong("clicks");
        return new BucketRow(start, clicks);
    }

    private NamedCountRow mapNamedCount(ResultSet resultSet, int rowNumber) throws SQLException {
        String name = resultSet.getString("name");
        long clicks = resultSet.getLong("clicks");
        return new NamedCountRow(name, clicks);
    }

    public record SummaryRow(long clicks, Instant lastEventAt) {
    }

    public record BucketRow(Instant start, long clicks) {
    }

    public record NamedCountRow(String name, long clicks) {
    }
}