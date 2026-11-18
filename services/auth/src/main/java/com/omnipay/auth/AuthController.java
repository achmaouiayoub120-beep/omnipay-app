package com.omnipay.auth;

import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Authentification simulee : aucun secret, aucune base d'utilisateurs.
 * Le "JWT" retourne est un jeton factice a usage pedagogique uniquement.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    public record LoginRequest(String username, String password) { }

    public record LoginResponse(String token, String type, String status, String username) { }

    @PostMapping("/login")
    public LoginResponse login(@RequestBody LoginRequest request) {
        if (request == null || isBlank(request.username()) || isBlank(request.password())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "username and password are required");
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
