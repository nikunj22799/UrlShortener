package com.example.urlshortener.exception;

public class InvalidRequestException extends RuntimeException {
    private final String field;

    public InvalidRequestException(String message) {
        this(null, message);
    }

    public InvalidRequestException(String field, String message) {
        super(message);
        this.field = field;
    }

    public String getField() {
        return field;
    }
}