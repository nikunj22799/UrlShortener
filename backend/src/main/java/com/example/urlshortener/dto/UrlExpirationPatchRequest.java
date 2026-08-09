package com.example.urlshortener.dto;

import com.fasterxml.jackson.annotation.JsonSetter;
import java.time.Instant;

public final class UrlExpirationPatchRequest {

    private Instant expiresAt;
    private boolean expiresAtPresent;

    @JsonSetter("expiresAt")
    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
        this.expiresAtPresent = true;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public boolean isExpiresAtPresent() {
        return expiresAtPresent;
    }
}
