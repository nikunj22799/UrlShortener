package com.example.urlshortener.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.example.urlshortener.config.ApplicationProperties;
import com.example.urlshortener.support.TestProperties;
import java.security.SecureRandom;
import org.junit.jupiter.api.Test;

class ShortCodeGeneratorTest {

    @Test
    void generatesShortCodeWithConfiguredLength() {
        ApplicationProperties properties = TestProperties.defaults();
        ShortCodeGenerator generator = new ShortCodeGenerator(new SecureRandom(), properties);

        String shortCode = generator.generateShortCode();

        assertEquals(properties.shortCode().length(), shortCode.length());
    }

    @Test
    void generatesOnlyAllowedCharacters() {
        ApplicationProperties properties = TestProperties.defaults();
        ShortCodeGenerator generator = new ShortCodeGenerator(new SecureRandom(), properties);

        String shortCode = generator.generateShortCode();

        assertTrue(shortCode.matches("[0-9A-Za-z]+"));
    }

    @Test
    void generatesDifferentShortCodes() {
        ApplicationProperties properties = TestProperties.defaults();
        ShortCodeGenerator generator = new ShortCodeGenerator(new SecureRandom(), properties);

        String firstShortCode = generator.generateShortCode();
        String secondShortCode = generator.generateShortCode();

        assertNotEquals(firstShortCode, secondShortCode);
    }
}