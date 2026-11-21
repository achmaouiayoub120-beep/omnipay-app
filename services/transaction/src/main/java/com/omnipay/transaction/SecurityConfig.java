package com.omnipay.transaction;

import static java.nio.charset.StandardCharsets.UTF_8;

import java.util.List;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import jakarta.servlet.DispatcherType;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * RBAC : lecture (GET) pour USER, ADMIN et AUDITOR ; ecriture (POST) pour USER et ADMIN uniquement.
 * Les jetons sont emis par auth-service (HS256) ; le secret partage vient de OMNIPAY_JWT_SECRET.
 */
@Configuration
public class SecurityConfig {

    static final int MIN_SECRET_BYTES = 32;

    @Bean
    SecretKey jwtSecretKey(@Value("${omnipay.security.jwt.secret:}") String secret) {
        byte[] bytes = secret.getBytes(UTF_8);
        if (bytes.length < MIN_SECRET_BYTES) {
            throw new IllegalStateException("OMNIPAY_JWT_SECRET must be set (" + MIN_SECRET_BYTES + " characters minimum)");
        }
        return new SecretKeySpec(bytes, "HmacSHA256");
    }

    @Bean
    JwtDecoder jwtDecoder(SecretKey jwtSecretKey, @Value("${omnipay.security.jwt.issuer}") String issuer) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(jwtSecretKey).macAlgorithm(MacAlgorithm.HS256).build();
        decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer(issuer));
        return decoder;
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, JwtDecoder jwtDecoder) throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(e -> e.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                .addFilterBefore(new JwtAuthenticationFilter(jwtDecoder), UsernamePasswordAuthenticationFilter.class)
                .authorizeHttpRequests(auth -> auth
                        // Page d'erreur interne du conteneur : sinon tout 403/404/422/500 serait masque en 401
                        .dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
                        // Prometheus, sondes Kubernetes et HEALTHCHECK Docker : sans jeton
                        .requestMatchers("/actuator/**", "/api/transactions/health").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/transactions/**").hasAnyRole("USER", "ADMIN", "AUDITOR")
                        .requestMatchers(HttpMethod.POST, "/api/transactions/**").hasAnyRole("USER", "ADMIN")
                        .anyRequest().authenticated())
                .build();
    }

    /** CORS : uniquement pour le developpement local (frontend sur un autre port). Derriere Nginx : meme origine. */
    @Bean
    CorsConfigurationSource corsConfigurationSource(
            @Value("${omnipay.cors.allowed-origin-patterns:http://localhost:*,http://127.0.0.1:*}") List<String> origins) {
        CorsConfiguration cors = new CorsConfiguration();
        cors.setAllowedOriginPatterns(origins);
        cors.setAllowedMethods(List.of("GET", "POST", "OPTIONS"));
        cors.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Idempotency-Key", "X-Chaos-Fail"));
        cors.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", cors);
        return source;
    }
}
