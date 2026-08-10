package com.example.urlshortener.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Instant;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    UserDetailsService userDetailsService(
            ApplicationProperties properties) {
        ApplicationProperties.Security security = properties.security();
        if (!security.passwordHash().startsWith("$2")) {
            throw new IllegalArgumentException("app.security.password-hash must be a BCrypt hash");
        }

        return new InMemoryUserDetailsManager(
                User.withUsername(security.username())
                        .password(security.passwordHash())
                        .roles("ADMIN")
                        .build());
    }

    @Bean
    AuthenticationManager authenticationManager(
            AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }

    @Bean
    SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            ObjectMapper objectMapper) throws Exception {
        http
                .csrf(Customizer.withDefaults())
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
                        .sessionFixation(fixation -> fixation.changeSessionId()))
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers("/api/v1/auth/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/r/**").permitAll()
                        .requestMatchers(HttpMethod.HEAD, "/r/**").permitAll()
                        .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
                        .requestMatchers("/api/v1/**").authenticated()
                        .requestMatchers("/actuator/**").authenticated()
                        .requestMatchers("/openapi.yaml", "/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html")
                        .authenticated()
                        .anyRequest().denyAll())
                .formLogin(form -> form.disable())
                .httpBasic(basic -> basic.disable())
                .logout(logout -> logout
                        .logoutUrl("/api/v1/auth/logout")
                        .deleteCookies("URLSHORTENER_SESSION")
                        .logoutSuccessHandler((request, response, authentication) ->
                                response.setStatus(HttpServletResponse.SC_NO_CONTENT)))
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint((request, response, exception) -> {
                            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            objectMapper.writeValue(response.getWriter(), new SecurityError(
                                    Instant.now(),
                                    HttpServletResponse.SC_UNAUTHORIZED,
                                    "AUTHENTICATION_REQUIRED",
                                    "Authentication is required",
                                    request.getRequestURI(),
                                    correlationId(request),
                                    List.of()));
                        })
                        .accessDeniedHandler((request, response, exception) -> {
                            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            objectMapper.writeValue(response.getWriter(), new SecurityError(
                                    Instant.now(),
                                    HttpServletResponse.SC_FORBIDDEN,
                                    "ACCESS_DENIED",
                                    "The request is not allowed",
                                    request.getRequestURI(),
                                    correlationId(request),
                                    List.of()));
                        }));

        return http.build();
    }

    private String correlationId(jakarta.servlet.http.HttpServletRequest request) {
        Object value = request.getAttribute(CorrelationIdFilter.ATTRIBUTE_NAME);
        return value instanceof String correlationId ? correlationId : null;
    }

    private record SecurityError(
            Instant timestamp,
            int status,
            String code,
            String message,
            String path,
            String correlationId,
            List<Object> fieldErrors) {
    }
}
