package com.example.urlshortener.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.urlshortener.entity.ClickEvent;

public interface ClickEventRepository extends JpaRepository<ClickEvent, Long> {

}
