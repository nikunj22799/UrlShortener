package com.example.urlshortener.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public record CreateUrlRequest(
        @NotBlank @Size(min = 10, max = 2048) String originalUrl,
        @Size(min = 3, max = 48)
        @Pattern(regexp = "[A-Za-z0-9][A-Za-z0-9-]{1,46}[A-Za-z0-9]")
        String customAlias,
        Instant expiresAt) {
}
