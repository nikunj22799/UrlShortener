package com.example.urlshortener.exception;

public class UrlNotFoundException extends RuntimeException {
    public UrlNotFoundException() {
        super("URL not found");
    }

    public UrlNotFoundException(String message) {
        super(message);
    }
}