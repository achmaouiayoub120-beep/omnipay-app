package com.omnipay.auth;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/** Verification des identifiants (table users, BCrypt) et emission / validation des jetons JWT. */
@Service
public class AuthService {

    public record Session(String token, String username, List<String> roles, Instant expiresAt) { }

    public record TokenClaims(boolean valid, String subject, List<String> roles, String issuer,
                              Instant issuedAt, Instant expiresAt) { }

    private record UserRow(String passwordHash, String role) { }

    private final JdbcClient jdbc;
    private final BCryptPasswordEncoder encoder;
    private final JwtEncoder jwtEncoder;
    private final JwtDecoder jwtDecoder;
    private final String issuer;
    private final Duration ttl;
    /** Hash factice compare quand l'utilisateur n'existe pas : temps de reponse constant. */
    private final String unknownUserHash;

    public AuthService(JdbcClient jdbc, BCryptPasswordEncoder encoder, JwtEncoder jwtEncoder, JwtDecoder jwtDecoder,
                       @Value("${omnipay.security.jwt.issuer}") String issuer,
                       @Value("${omnipay.security.jwt.ttl:1h}") Duration ttl) {
        this.jdbc = jdbc;
        this.encoder = encoder;
        this.jwtEncoder = jwtEncoder;
        this.jwtDecoder = jwtDecoder;
        this.issuer = issuer;
        this.ttl = ttl;
        this.unknownUserHash = encoder.encode(UUID.randomUUID().toString());
    }

    public Session login(String username, String password) {
        UserRow user = jdbc.sql("SELECT password_hash, role FROM users WHERE username = :username")
                .param("username", username)
                .query((rs, n) -> new UserRow(rs.getString("password_hash"), rs.getString("role")))
                .optional()
                .orElse(null);
        boolean passwordMatches = encoder.matches(password, user != null ? user.passwordHash() : unknownUserHash);
        if (user == null || !passwordMatches) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid credentials");
        }
        List<String> roles = authoritiesFor(user.role());
        Instant now = Instant.now();
        Instant expiresAt = now.plus(ttl);
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(issuer)
                .subject(username)
                .issuedAt(now)
                .expiresAt(expiresAt)
                .id(UUID.randomUUID().toString())
                .claim("roles", roles)
                .build();
        String token = jwtEncoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
                .getTokenValue();
        return new Session(token, username, roles, expiresAt);
    }

    /** Valide la signature, l'emetteur et l'expiration d'un en-tete "Authorization: Bearer ...". */
    public TokenClaims validate(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "missing bearer token");
        }
        try {
            Jwt jwt = jwtDecoder.decode(authorization.substring("Bearer ".length()).trim());
            List<String> roles = jwt.getClaimAsStringList("roles");
            return new TokenClaims(true, jwt.getSubject(), roles == null ? List.of() : roles,
                    jwt.getClaimAsString("iss"), jwt.getIssuedAt(), jwt.getExpiresAt());
        } catch (JwtException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid token");
        }
    }

    /** ADMIN inclut USER ; AUDITOR est en lecture seule ; tout role inconnu retombe sur le moindre privilege. */
    static List<String> authoritiesFor(String role) {
        return switch (role) {
            case "ADMIN" -> List.of("ROLE_ADMIN", "ROLE_USER");
            case "AUDITOR" -> List.of("ROLE_AUDITOR");
            default -> List.of("ROLE_USER");
        };
    }
}
