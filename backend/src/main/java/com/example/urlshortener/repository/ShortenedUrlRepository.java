package com.example.urlshortener.repository;

import com.example.urlshortener.entity.ShortenedUrl;
import java.time.Instant;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ShortenedUrlRepository extends JpaRepository<ShortenedUrl, Long> {
    @Query("SELECT url FROM ShortenedUrl url WHERE url.publicId = :publicId")
    Optional<ShortenedUrl> findByPublicId(@Param("publicId") String publicId);

    @Query("SELECT url FROM ShortenedUrl url WHERE url.shortCode = :shortCode")
    Optional<ShortenedUrl> findByShortCode(@Param("shortCode") String shortCode);

    @Query(
            value = """
                    SELECT url
                    FROM ShortenedUrl url
                    WHERE (
                        (:status IS NULL AND url.deletedAt IS NULL)
                        OR (:status = 'DELETED' AND url.deletedAt IS NOT NULL)
                        OR (:status = 'ACTIVE' AND url.deletedAt IS NULL AND url.status = com.example.urlshortener.entity.UrlStatus.ACTIVE)
                        OR (:status = 'DISABLED' AND url.deletedAt IS NULL AND url.status = com.example.urlshortener.entity.UrlStatus.DISABLED)
                    )
                    AND (
                        :search IS NULL
                        OR LOCATE(LOWER(:search), LOWER(url.shortCode)) > 0
                        OR LOCATE(LOWER(:search), LOWER(url.originalUrl)) > 0
                    )
                    AND (
                        :expired IS NULL
                        OR (:expired = true AND url.expiresAt IS NOT NULL AND url.expiresAt <= :now)
                        OR (:expired = false AND (url.expiresAt IS NULL OR url.expiresAt > :now))
                    )
                    """,
            countQuery = """
                    SELECT COUNT(url)
                    FROM ShortenedUrl url
                    WHERE (
                        (:status IS NULL AND url.deletedAt IS NULL)
                        OR (:status = 'DELETED' AND url.deletedAt IS NOT NULL)
                        OR (:status = 'ACTIVE' AND url.deletedAt IS NULL AND url.status = com.example.urlshortener.entity.UrlStatus.ACTIVE)
                        OR (:status = 'DISABLED' AND url.deletedAt IS NULL AND url.status = com.example.urlshortener.entity.UrlStatus.DISABLED)
                    )
                    AND (
                        :search IS NULL
                        OR LOCATE(LOWER(:search), LOWER(url.shortCode)) > 0
                        OR LOCATE(LOWER(:search), LOWER(url.originalUrl)) > 0
                    )
                    AND (
                        :expired IS NULL
                        OR (:expired = true AND url.expiresAt IS NOT NULL AND url.expiresAt <= :now)
                        OR (:expired = false AND (url.expiresAt IS NULL OR url.expiresAt > :now))
                    )
                    """)
    Page<ShortenedUrl> searchUrls(@Param("status") String status, @Param("search") String search, @Param("expired") Boolean expired, @Param("now") Instant now, Pageable pageable);
}