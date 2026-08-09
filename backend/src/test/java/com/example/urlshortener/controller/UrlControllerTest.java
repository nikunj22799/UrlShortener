package com.example.urlshortener.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.urlshortener.dto.CreateUrlRequest;
import com.example.urlshortener.dto.LifecycleStatus;
import com.example.urlshortener.dto.UrlListResponse;
import com.example.urlshortener.dto.UrlResponse;
import com.example.urlshortener.entity.CodeType;
import com.example.urlshortener.service.UrlService;
import com.example.urlshortener.service.UrlService.CreationResult;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class UrlControllerTest {
    private UrlService urlService;
    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        urlService = org.mockito.Mockito.mock(UrlService.class);
        objectMapper = new ObjectMapper();
        objectMapper.findAndRegisterModules();
        mockMvc = MockMvcBuilders.standaloneSetup(new UrlController(urlService)).build();
    }

    @Test
    void createsShortUrl() throws Exception {
        UUID urlId = UUID.randomUUID();
        UrlResponse response = createResponse(urlId, "abc12345", 0L);

        when(urlService.createShortUrl(any(CreateUrlRequest.class), eq("request-123"), any()))
                .thenReturn(new CreationResult(response, false));

        String request = """
                {
                  "originalUrl": "https://example.com/products/123",
                  "customAlias": null,
                  "expiresAt": null
                }
                """;

        mockMvc.perform(post("/api/v1/urls")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Idempotency-Key", "request-123")
                        .content(request))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/api/v1/urls/" + urlId))
                .andExpect(jsonPath("$.id").value(urlId.toString()))
                .andExpect(jsonPath("$.shortCode").value("abc12345"));
    }

    @Test
    void getsUrlById() throws Exception {
        UUID urlId = UUID.randomUUID();
        UrlResponse response = createResponse(urlId, "abc12345", 2L);

        when(urlService.getUrl(urlId)).thenReturn(response);

        mockMvc.perform(get("/api/v1/urls/{urlId}", urlId))
                .andExpect(status().isOk())
                .andExpect(header().string("ETag", "\"2\""))
                .andExpect(jsonPath("$.id").value(urlId.toString()))
                .andExpect(jsonPath("$.shortCode").value("abc12345"));
    }

    @Test
    void listsUrls() throws Exception {
        UUID urlId = UUID.randomUUID();
        UrlResponse response = createResponse(urlId, "abc12345", 0L);
        UrlListResponse listResponse = new UrlListResponse(
                List.of(response),
                0,
                20,
                1,
                1,
                "createdAt",
                "desc");

        when(urlService.listUrls(0, 20, null, null, "createdAt", "desc", null)).thenReturn(listResponse);

        mockMvc.perform(get("/api/v1/urls")
                        .param("page", "0")
                        .param("size", "20")
                        .param("sort", "createdAt")
                        .param("direction", "desc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].shortCode").value("abc12345"))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void disablesUrl() throws Exception {
        UUID urlId = UUID.randomUUID();
        UrlResponse response = createResponse(urlId, "abc12345", 1L);

        when(urlService.disable(eq(urlId), eq(0L), any())).thenReturn(response);

        mockMvc.perform(post("/api/v1/urls/{urlId}/disable", urlId)
                        .header("If-Match", "\"0\""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"));
    }

    @Test
    void deletesUrl() throws Exception {
        UUID urlId = UUID.randomUUID();

        mockMvc.perform(delete("/api/v1/urls/{urlId}", urlId)
                        .header("If-Match", "\"0\""))
                .andExpect(status().isNoContent());
    }

    private UrlResponse createResponse(UUID urlId, String shortCode, long version) {
        return new UrlResponse(
                urlId,
                shortCode,
                URI.create("http://localhost:8080/" + shortCode),
                "https://example.com/products/123",
                CodeType.GENERATED,
                LifecycleStatus.ACTIVE,
                false,
                null,
                Instant.parse("2026-08-01T12:00:00Z"),
                Instant.parse("2026-08-01T12:00:00Z"),
                null,
                version);
    }
}