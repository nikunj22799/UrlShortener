package com.example.urlshortener.dto;
import java.util.List;

public record UrlListResponse(
        List<UrlResponse> items,
        int page,
        int size,
        long totalElements,
        int totalPages,
        String sort,
        String direction) {

    public UrlListResponse {
        items = List.copyOf(items);
    }
}
