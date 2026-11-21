package com.omnipay.transaction;

import static java.nio.charset.StandardCharsets.UTF_8;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import javax.crypto.spec.SecretKeySpec;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import com.nimbusds.jose.jwk.source.ImmutableSecret;

/** Contexte Spring partage par les tests : secret JWT genere a chaque execution (aucun secret commite). */
@SpringBootTest
@AutoConfigureMockMvc
abstract class AbstractIntegrationTest {

    static final String ALICE = "ACC-ALICE-001";
    static final String BOB = "ACC-BOB-002";
    static final String USER_ACCOUNT = "ACC-USER-003";
    static final String ADMIN_ACCOUNT = "ACC-ADMIN-004";
    static final String ISSUER = "omnipay-security-authority";
    static final String SECRET = UUID.randomUUID() + "-" + UUID.randomUUID();

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected JdbcClient jdbc;

    @DynamicPropertySource
    static void securityProperties(DynamicPropertyRegistry registry) {
        registry.add("omnipay.security.jwt.secret", () -> SECRET);
        registry.add("omnipay.chaos.enabled", () -> "true");
    }

    /** Etat initial identique aux migrations Flyway, quel que soit l'ordre des tests. */
    @BeforeEach
    void resetData() {
        jdbc.sql("DELETE FROM idempotency_keys").update();
        jdbc.sql("DELETE FROM transactions").update();
        setBalance(ALICE, "1000.00");
        setBalance(BOB, "500.00");
        setBalance(USER_ACCOUNT, "14250.00");
        setBalance(ADMIN_ACCOUNT, "50000.00");
    }

    private void setBalance(String accountId, String balance) {
        jdbc.sql("UPDATE accounts SET balance = :b WHERE account_id = :id").param("b", new BigDecimal(balance))
                .param("id", accountId).update();
    }

    protected BigDecimal balance(String accountId) {
        return jdbc.sql("SELECT balance FROM accounts WHERE account_id = :id").param("id", accountId)
                .query(BigDecimal.class).single();
    }

    protected int count(String table) {
        return jdbc.sql("SELECT COUNT(*) FROM " + table).query(Integer.class).single();
    }

    protected static String bearer(String subject, String... roles) {
        return "Bearer " + jwt(SECRET, ISSUER, subject, Instant.now().plusSeconds(3600), roles);
    }

    protected static String jwt(String secret, String issuer, String subject, Instant expiresAt, String... roles) {
        NimbusJwtEncoder encoder = new NimbusJwtEncoder(
                new ImmutableSecret<>(new SecretKeySpec(secret.getBytes(UTF_8), "HmacSHA256")));
        JwtClaimsSet claims = JwtClaimsSet.builder().issuer(issuer).subject(subject)
                .issuedAt(expiresAt.minusSeconds(3600)).expiresAt(expiresAt).claim("roles", List.of(roles)).build();
        return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
    }

    protected ResultActions transfer(String authorization, String idempotencyKey, String source, String target, String amount)
            throws Exception {
        String json = "{" + (source == null ? "" : "\"sourceAccount\":\"" + source + "\",")
                + "\"targetAccount\":\"" + target + "\",\"amount\":" + amount + "}";
        MockHttpServletRequestBuilder request = post("/api/transactions").contentType(MediaType.APPLICATION_JSON).content(json);
        if (authorization != null) {
            request.header("Authorization", authorization);
        }
        if (idempotencyKey != null) {
            request.header("X-Idempotency-Key", idempotencyKey);
        }
        return mockMvc.perform(request);
    }
}
