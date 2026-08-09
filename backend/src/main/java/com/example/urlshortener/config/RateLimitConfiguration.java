package com.example.urlshortener.config;

import com.example.urlshortener.exception.RateLimitExceededException;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Clock;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class RateLimitConfiguration implements WebMvcConfigurer, HandlerInterceptor {
    private final Map<String, WindowState> windows = new LinkedHashMap<>(16, 0.75f, true);
    private final ApplicationProperties properties;
    private final Clock clock;
    private final Counter rejectedRequests;

    public RateLimitConfiguration(
            ApplicationProperties properties,
            Clock clock,
            MeterRegistry meterRegistry) {
        this.properties = properties;
        this.clock = clock;
        this.rejectedRequests = meterRegistry.counter("rate.limit.rejected.total");
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(this);
    }

    @Override
    public boolean preHandle(
            HttpServletRequest request,
            HttpServletResponse response,
            Object handler) {
        Policy policy = resolvePolicy(request);
        if (policy == null || !properties.rateLimit().enabled()) {
            return true;
        }
        String identity = request.getRemoteAddr() == null ? "unknown" : request.getRemoteAddr();
        long retryAfterSeconds = acquire(policy, identity);
        if (retryAfterSeconds > 0) {
            rejectedRequests.increment();
            throw new RateLimitExceededException(retryAfterSeconds);
        }
        return true;
    }

    private synchronized long acquire(Policy policy, String identity) {
        ApplicationProperties.Policy limits = limits(policy);
        long nowSeconds = clock.instant().getEpochSecond();
        long windowStart = nowSeconds - Math.floorMod(nowSeconds, limits.windowSeconds());
        String key = policy.name() + ':' + identity;
        WindowState current = windows.get(key);
        if (current == null || current.windowStart() != windowStart) {
            if (current == null && windows.size() >= properties.rateLimit().maximumIdentities()) {
                windows.remove(windows.keySet().iterator().next());
            }
            windows.put(key, new WindowState(windowStart, 1));
            return 0;
        }
        if (current.count() >= limits.requests()) {
            return Math.max(1, windowStart + limits.windowSeconds() - nowSeconds);
        }
        windows.put(key, new WindowState(windowStart, current.count() + 1));
        return 0;
    }

    private ApplicationProperties.Policy limits(Policy policy) {
        return switch (policy) {
            case CREATE -> properties.rateLimit().create();
            case REDIRECT -> properties.rateLimit().redirect();
            case MANAGEMENT -> properties.rateLimit().management();
            case ANALYTICS -> properties.rateLimit().analytics();
        };
    }

    private Policy resolvePolicy(HttpServletRequest request) {
        String path = request.getRequestURI();
        String method = request.getMethod();
        if ("POST".equals(method) && "/api/v1/urls".equals(path)) {
            return Policy.CREATE;
        }
        if (path.startsWith("/r/") && ("GET".equals(method) || "HEAD".equals(method))) {
            return Policy.REDIRECT;
        }
        if (path.startsWith("/api/v1/urls/") && path.contains("/analytics/")) {
            return Policy.ANALYTICS;
        }
        if (path.equals("/api/v1/urls") || path.startsWith("/api/v1/urls/")) {
            return Policy.MANAGEMENT;
        }
        return null;
    }

    private enum Policy {
        CREATE,
        REDIRECT,
        MANAGEMENT,
        ANALYTICS
    }

    private record WindowState(long windowStart, int count) {
    }
}