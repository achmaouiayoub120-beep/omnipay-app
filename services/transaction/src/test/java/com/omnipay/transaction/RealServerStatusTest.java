package com.omnipay.transaction;

import static java.nio.charset.StandardCharsets.UTF_8;
import static org.junit.jupiter.api.Assertions.assertEquals;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import javax.crypto.spec.SecretKeySpec;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import com.nimbusds.jose.jwk.source.ImmutableSecret;

/**
 * Serveur HTTP reel (Tomcat) : MockMvc ne passe pas par la page d'erreur du conteneur. Sans la regle
 * dispatcherTypeMatchers(ERROR), tous les codes 400/403/404/422/500 sortaient en 401.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class RealServerStatusTest {

    private static final String SECRET = UUID.randomUUID() + "-" + UUID.randomUUID();

    @LocalServerPort
    private int port;

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("omnipay.security.jwt.secret", () -> SECRET);
        registry.add("omnipay.chaos.enabled", () -> "true");
    }

    private static String token(String subject, String... roles) {
        NimbusJwtEncoder encoder = new NimbusJwtEncoder(
                new ImmutableSecret<>(new SecretKeySpec(SECRET.getBytes(UTF_8), "HmacSHA256")));
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder().issuer("omnipay-security-authority").subject(subject)
                .issuedAt(now).expiresAt(now.plusSeconds(3600)).claim("roles", List.of(roles)).build();
        return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
    }

    private int post(String token, String json, String... extraHeaders) throws Exception {
        HttpRequest.Builder request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/transactions"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json));
        if (token != null) {
            request.header("Authorization", "Bearer " + token);
        }
        for (int i = 0; i < extraHeaders.length; i += 2) {
            request.header(extraHeaders[i], extraHeaders[i + 1]);
        }
        return HttpClient.newHttpClient().send(request.build(), HttpResponse.BodyHandlers.discarding()).statusCode();
    }

    @Test
    void businessErrorsKeepTheirOwnStatusOverRealHttp() throws Exception {
        String admin = token("admin", "ROLE_ADMIN", "ROLE_USER");
        String user = token("user", "ROLE_USER");
        String auditor = token("auditor", "ROLE_AUDITOR");

        assertEquals(401, post(null, "{\"targetAccount\":\"ACC-BOB-002\",\"amount\":1}"));
        assertEquals(403, post(auditor, "{\"targetAccount\":\"ACC-BOB-002\",\"amount\":1}"));
        assertEquals(403, post(user, "{\"sourceAccount\":\"ACC-ALICE-001\",\"targetAccount\":\"ACC-BOB-002\",\"amount\":1}"));
        assertEquals(404, post(admin, "{\"sourceAccount\":\"ACC-GHOST-999\",\"targetAccount\":\"ACC-BOB-002\",\"amount\":1}"));
        assertEquals(422, post(admin, "{\"sourceAccount\":\"ACC-BOB-002\",\"targetAccount\":\"ACC-ALICE-001\",\"amount\":99999999}"));
        assertEquals(400, post(admin, "{\"targetAccount\":\"ACC-BOB-002\",\"amount\":-1}"));
        assertEquals(500, post(admin, "{\"targetAccount\":\"ACC-BOB-002\",\"amount\":1}", "X-Chaos-Fail", "true"));
    }
}
