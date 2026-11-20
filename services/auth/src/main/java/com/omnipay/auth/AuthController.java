package com.omnipay.auth;

import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Authentification : les identifiants sont verifies dans la table users (mots de passe BCrypt).
 * Le "JWT" retourne reste un jeton factice a usage pedagogique uniquement.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    public record LoginRequest(String username, String password) { }

    public record LoginResponse(String token, String type, String status, String username) { }

    private final JdbcClient jdbc;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    /** Hash factice : on le compare quand l'utilisateur n'existe pas, pour un temps de reponse constant. */
    private final String unknownUserHash = encoder.encode(UUID.randomUUID().toString());

    public AuthController(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @PostMapping("/login")
    public LoginResponse login(@RequestBody LoginRequest request) {
        if (isBlank(request.username()) || isBlank(request.password())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "username and password are required");
        }
        String hash = jdbc.sql("SELECT password_hash FROM users WHERE username = :username")
                .param("username", request.username())
                .query(String.class)
                .optional()
                .orElse(null);
        boolean valid = encoder.matches(request.password(), hash != null ? hash : unknownUserHash) && hash != null;
        if (!valid) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid credentials");
        }
        return new LoginResponse("simulated-jwt-" + UUID.randomUUID(), "Bearer", "SUCCESS", request.username());
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "UP", "service", "auth-service");
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
