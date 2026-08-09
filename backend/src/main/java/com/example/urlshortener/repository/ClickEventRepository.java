package com.example.urlshortener.repository;

import com.example.urlshortener.entity.ClickEvent;

import java.time.Instant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ClickEventRepository extends JpaRepository<ClickEvent, Long> {

    @Modifying
    @Query(value = "DELETE FROM click_event WHERE occurred_at < :cutoff ORDER BY occurred_at, id LIMIT :limit", nativeQuery = true)
    int deleteBeforeInBatch(@Param("cutoff") Instant cutoff, @Param("limit") int limit);
}
