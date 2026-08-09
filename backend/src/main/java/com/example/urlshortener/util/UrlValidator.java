package com.example.urlshortener.util;

import com.example.urlshortener.exception.InvalidRequestException;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

@Component
public class UrlValidator {
    public static final int MINIMUM_URL_LENGTH = 10;
    public static final int MAXIMUM_URL_LENGTH = 2048;
    public static final int MINIMUM_ALIAS_LENGTH = 3;
    public static final int MAXIMUM_ALIAS_LENGTH = 48;
    private static final Pattern ALIAS_PATTERN = Pattern.compile("[A-Za-z0-9][A-Za-z0-9-]{1,46}[A-Za-z0-9]");
    private static final Set<String> RESERVED_ALIASES = Set.of(
            "api", "actuator", "assets", "admin", "login", "logout",
            "health", "ready", "readiness", "engineering", "system", "swagger-ui");

    public String validateDestination(String originalUrl) {
        if (originalUrl == null || originalUrl.isBlank()) {
            throw invalidUrl("must not be blank");
        }
        if (originalUrl.length() < MINIMUM_URL_LENGTH || originalUrl.length() > MAXIMUM_URL_LENGTH) {
            throw invalidUrl("must contain between 10 and 2048 characters");
        }
        if (!originalUrl.equals(originalUrl.strip())) {
            throw invalidUrl("must not contain leading or trailing whitespace");
        }
        URI uri = parseUrl(originalUrl);
        validateScheme(uri);
        validateHost(uri);
        return originalUrl;
    }

    public String normalizeAlias(String customAlias) {
        if (customAlias == null) {
            return null;
        }
        if (!ALIAS_PATTERN.matcher(customAlias).matches()) {
            throw invalidAlias("must contain 3 to 48 letters, numbers, or hyphens and begin and end with a letter or number");
        }
        String normalizedAlias = customAlias.toLowerCase(Locale.ROOT);
        if (isReservedAlias(normalizedAlias)) {
            throw invalidAlias("is reserved by the application");
        }
        return normalizedAlias;
    }

    public boolean isReservedAlias(String shortCode) {
        return shortCode != null && RESERVED_ALIASES.contains(shortCode.toLowerCase(Locale.ROOT));
    }

    private URI parseUrl(String originalUrl) {
        try {
            URI uri = new URI(originalUrl);
            if (uri.isOpaque()) {
                throw invalidUrl("must be a valid HTTP or HTTPS URL");
            }
            return uri;
        } catch (URISyntaxException exception) {
            throw invalidUrl("must be a valid HTTP or HTTPS URL");
        }
    }

    private void validateScheme(URI uri) {
        String scheme = uri.getScheme();
        if (!"http".equalsIgnoreCase(scheme) && !"https".equalsIgnoreCase(scheme)) {
            throw invalidUrl("must use the http or https scheme");
        }
    }

    private void validateHost(URI uri) {
        if (uri.getRawUserInfo() != null) {
            throw invalidUrl("must not contain user credentials");
        }
        if (uri.getHost() == null || uri.getHost().isBlank()) {
            throw invalidUrl("must contain a valid host");
        }
    }

    private InvalidRequestException invalidUrl(String message) {
        return new InvalidRequestException(message);
    }

    private InvalidRequestException invalidAlias(String message) {
        return new InvalidRequestException("customAlias", message);
    }
}