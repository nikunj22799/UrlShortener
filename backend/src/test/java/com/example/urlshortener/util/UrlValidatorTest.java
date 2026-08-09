package com.example.urlshortener.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.example.urlshortener.exception.InvalidRequestException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class UrlValidatorTest {
    private UrlValidator urlValidator;

    @BeforeEach
    void setUp() {
        urlValidator = new UrlValidator();
    }

    @Test
    void acceptsValidHttpUrl() {
        String originalUrl = "https://example.com/products/123";

        String result = urlValidator.validateDestination(originalUrl);

        assertEquals(originalUrl, result);
    }

    @Test
    void acceptsValidHttpsUrl() {
        String originalUrl = "https://www.google.com/search?q=url";

        String result = urlValidator.validateDestination(originalUrl);

        assertEquals(originalUrl, result);
    }

    @Test
    void rejectsBlankUrl() {
        assertThrows(InvalidRequestException.class, () -> urlValidator.validateDestination(""));
    }

    @Test
    void rejectsUnsupportedScheme() {
        assertThrows(InvalidRequestException.class, () -> urlValidator.validateDestination("ftp://example.com/file"));
    }

    @Test
    void rejectsUrlWithoutHost() {
        assertThrows(InvalidRequestException.class, () -> urlValidator.validateDestination("https:///test/path"));
    }

    @Test
    void rejectsUrlWithCredentials() {
        assertThrows(InvalidRequestException.class, () -> urlValidator.validateDestination("https://user:password@example.com"));
    }

    @Test
    void returnsNullWhenAliasIsNull() {
        assertNull(urlValidator.normalizeAlias(null));
    }

    @Test
    void normalizesAliasToLowerCase() {
        String alias = urlValidator.normalizeAlias("My-Link");

        assertEquals("my-link", alias);
    }

    @Test
    void rejectsInvalidAlias() {
        assertThrows(InvalidRequestException.class, () -> urlValidator.normalizeAlias("my_link"));
    }

    @Test
    void rejectsReservedAlias() {
        assertThrows(InvalidRequestException.class, () -> urlValidator.normalizeAlias("api"));
    }

    @Test
    void identifiesReservedAlias() {
        assertTrue(urlValidator.isReservedAlias("API"));
    }
}