package com.example.urlshortener;

import static org.junit.jupiter.api.Assertions.assertNotNull;

import com.example.urlshortener.controller.AnalyticsController;
import com.example.urlshortener.controller.RedirectController;
import com.example.urlshortener.controller.UrlController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class UrlShortenerIntegrationTest {
    @Autowired
    private UrlController urlController;

    @Autowired
    private RedirectController redirectController;

    @Autowired
    private AnalyticsController analyticsController;

    @Test
    void applicationContextLoads() {
        assertNotNull(urlController);
        assertNotNull(redirectController);
        assertNotNull(analyticsController);
    }
}