package com.example.urlshortener.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.urlshortener.entity.IdempotencyRecord;

public interface IdempotencyRecordRepository extends JpaRepository<IdempotencyRecord, Long> {

    @Query("select record from IdempotencyRecord record "
            + "join fetch record.shortenedUrl where record.keyHash = :keyHash")
    Optional<IdempotencyRecord> findByKeyHash(@Param("keyHash") byte[] keyHash);

}
