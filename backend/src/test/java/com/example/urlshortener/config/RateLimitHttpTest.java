package com.example.urlshortener.config;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

import com.example.urlshortener.exception.RateLimitExceededException;
import com.example.urlshortener.support.TestProperties;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.time.Clock;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.servlet.HandlerInterceptor;

class RateLimitHttpTest {
    private HandlerInterceptor interceptor;

    @BeforeEach
    void setUp() {
        RateLimitConfiguration configuration = new RateLimitConfiguration(
                TestProperties.defaults(),
                Clock.systemUTC(),
                new SimpleMeterRegistry());

        interceptor = configuration.interceptor();
    }

    @Test
    void allowsRequestWithinRateLimit() throws Exception {
        MockHttpServletRequest request = createRequest("POST", "/api/v1/urls", "10.0.0.1");
        MockHttpServletResponse response = new MockHttpServletResponse();

        boolean allowed = interceptor.preHandle(request, response, mock(Object.class));

        assertTrue(allowed);
    }

    @Test
    void rejectsRequestAfterRateLimitIsExceeded() throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();

        for (int requestNumber = 0; requestNumber < 30; requestNumber++) {
            MockHttpServletRequest request = createRequest("POST", "/api/v1/urls", "10.0.0.2");
            interceptor.preHandle(request, response, mock(Object.class));
        }

        MockHttpServletRequest rejectedRequest = createRequest("POST", "/api/v1/urls", "10.0.0.2");

        assertThrows(
                RateLimitExceededException.class,
                () -> interceptor.preHandle(rejectedRequest, response, mock(Object.class)));
    }

    @Test
    void doesNotRateLimitUnmanagedEndpoint() throws Exception {
        MockHttpServletRequest request = createRequest("GET", "/actuator/health", "10.0.0.3");
        MockHttpServletResponse response = new MockHttpServletResponse();

        boolean allowed = interceptor.preHandle(request, response, mock(Object.class));

        assertTrue(allowed);
    }

    private MockHttpServletRequest createRequest(String method, String path, String remoteAddress) {
        MockHttpServletRequest request = new MockHttpServletRequest(method, path);
        request.setRemoteAddr(remoteAddress);
        return request;
    }
    
}