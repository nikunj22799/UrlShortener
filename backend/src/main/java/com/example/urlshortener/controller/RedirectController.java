package com.example.urlshortener.controller;

import com.example.urlshortener.config.CorrelationIdFilter;
import com.example.urlshortener.service.RedirectService;
import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/r")
public class RedirectController {
    private final RedirectService redirectService;

    public RedirectController(RedirectService redirectService) {
        this.redirectService = redirectService;
    }

    @RequestMapping(value = "/{shortCode}", method = {RequestMethod.GET, RequestMethod.HEAD})
    public ResponseEntity<Void> redirect(
            @PathVariable String shortCode,
            HttpServletRequest request) {
        boolean recordAnalytics = RequestMethod.GET.name().equals(request.getMethod());
        URI destination = redirectService.resolveRedirect(
                shortCode,
                recordAnalytics,
                request.getHeader("Referer"),
                request.getHeader("User-Agent"),
                correlationId(request));
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(destination)
                .cacheControl(CacheControl.noStore())
                .build();
    }

    private String correlationId(HttpServletRequest request) {
        Object value = request.getAttribute(CorrelationIdFilter.ATTRIBUTE_NAME);
        return value instanceof String correlationId ? correlationId : null;
    }
}