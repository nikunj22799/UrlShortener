package com.example.urlshortener.dto;

public record CsrfTokenResponse(
        String token,
        String headerName) {
}
