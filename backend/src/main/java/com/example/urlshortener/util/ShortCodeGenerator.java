package com.example.urlshortener.util;

import com.example.urlshortener.config.ApplicationProperties;
import java.security.SecureRandom;
import org.springframework.stereotype.Component;

@Component
public class ShortCodeGenerator {
    private static final String ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    private final SecureRandom secureRandom;
    private final int shortCodeLength;

    public ShortCodeGenerator(SecureRandom secureRandom, ApplicationProperties properties) {
        this.secureRandom = secureRandom;
        this.shortCodeLength = properties.shortCode().length();
    }

    public String generateShortCode() {
        StringBuilder shortCode = new StringBuilder(shortCodeLength);
        for (int index = 0; index < shortCodeLength; index++) {
            shortCode.append(ALPHABET.charAt(secureRandom.nextInt(ALPHABET.length())));
        }
        return shortCode.toString();
    }
}