package com.example.urlshortener.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.head;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.urlshortener.service.RedirectService;
import java.net.URI;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class RedirectControllerTest {
    private RedirectService redirectService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        redirectService = mock(RedirectService.class);
        mockMvc = MockMvcBuilders.standaloneSetup(new RedirectController(redirectService)).build();
    }

    @Test
    void redirectsToOriginalUrl() throws Exception {
        when(redirectService.resolveRedirect(eq("abc12345"), eq(true), any(), any(), any()))
                .thenReturn(URI.create("https://example.com/products/123"));

        mockMvc.perform(get("/r/abc12345")
                        .header("Referer", "https://google.com")
                        .header("User-Agent", "Mozilla/5.0"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", "https://example.com/products/123"));
    }

    @Test
    void redirectsWithoutAnalyticsForHeadRequest() throws Exception {
        when(redirectService.resolveRedirect(eq("abc12345"), eq(false), any(), any(), any()))
                .thenReturn(URI.create("https://example.com/products/123"));

        mockMvc.perform(head("/r/abc12345"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", "https://example.com/products/123"));
    }
}