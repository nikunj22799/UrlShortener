package com.example.urlshortener.dto;

public record AuthSessionResponse(
        boolean authenticated,
        String username) {
}
