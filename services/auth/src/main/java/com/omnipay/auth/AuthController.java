package com.omnipay.auth;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** Authentification : identifiants verifies dans la table users, jeton JWT signe avec les roles RBAC. */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    public record LoginRequest(String username, String password) { }

    public record LoginResponse(String token, String type, String status, String username,
                                List<String> roles, long expiresAt) { }

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public LoginResponse login(@RequestBody LoginRequest request) {
        if (isBlank(request.username()) || isBlank(request.password())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "username and password are required");
        }
        AuthService.Session session = authService.login(request.username(), request.password());
        return new LoginResponse(session.token(), "Bearer", "SUCCESS", session.username(), session.roles(),
                session.expiresAt().getEpochSecond());
    }

    /** Renvoie les claims du jeton une fois signature, emetteur et expiration verifies (401 sinon). */
    @GetMapping("/validate")
    public AuthService.TokenClaims validate(@RequestHeader(value = "Authorization", required = false) String authorization) {
        return authService.validate(authorization);
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "UP", "service", "auth-service");
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
