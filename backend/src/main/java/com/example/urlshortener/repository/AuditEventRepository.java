package com.example.urlshortener.repository;

import com.example.urlshortener.entity.AuditEvent;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditEventRepository extends JpaRepository<AuditEvent, Long> {
}
