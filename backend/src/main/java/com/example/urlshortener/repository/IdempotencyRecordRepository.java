package com.example.urlshortener.repository;

import com.example.urlshortener.entity.IdempotencyRecord;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface IdempotencyRecordRepository extends JpaRepository<IdempotencyRecord, Long> {

    @Query("select record from IdempotencyRecord record "
            + "join fetch record.shortenedUrl where record.keyHash = :keyHash")
    Optional<IdempotencyRecord> findByKeyHash(@Param("keyHash") byte[] keyHash);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select record from IdempotencyRecord record "
            + "join fetch record.shortenedUrl where record.keyHash = :keyHash")
    Optional<IdempotencyRecord> findByKeyHashForUpdate(@Param("keyHash") byte[] keyHash);

    @Modifying
    @Query(value = "DELETE FROM idempotency_record WHERE expires_at <= :now ORDER BY expires_at, id LIMIT :limit", nativeQuery = true)
    int deleteExpiredBatch(@Param("now") Instant now, @Param("limit") int limit);
}
