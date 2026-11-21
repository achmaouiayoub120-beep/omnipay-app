package com.omnipay.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

class JwtTokenTest extends AbstractIntegrationTest {

    @Autowired
    private JwtDecoder jwtDecoder;

    @Autowired
    private JwtEncoder jwtEncoder;

    @Autowired
    private ObjectMapper mapper;

    private String tokenOf(String username) throws Exception {
        String body = loginAs(username, "password").andReturn().getResponse().getContentAsString();
        return mapper.readTree(body).get("token").asText();
    }

    private String token(String issuer, Instant expiresAt) {
        JwtClaimsSet claims = JwtClaimsSet.builder().issuer(issuer).subject("admin")
                .issuedAt(expiresAt.minusSeconds(3600)).expiresAt(expiresAt).claim("roles", List.of("ROLE_ADMIN")).build();
        return jwtEncoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
    }

    @Test
    void tokenCarriesSubjectRolesIssuerAndAOneHourExpiry() throws Exception {
        Jwt jwt = jwtDecoder.decode(tokenOf("admin"));

        assertEquals("admin", jwt.getSubject());
        assertEquals("omnipay-security-authority", jwt.getClaimAsString("iss"));
        assertEquals(List.of("ROLE_ADMIN", "ROLE_USER"), jwt.getClaimAsStringList("roles"));
        assertEquals(Duration.ofHours(1), Duration.between(jwt.getIssuedAt(), jwt.getExpiresAt()));
        assertEquals("HS256", jwt.getHeaders().get("alg"));
        assertTrue(jwt.getId() != null && !jwt.getId().isBlank());
    }

    @Test
    void validateReturnsTheDecodedClaims() throws Exception {
        mockMvc.perform(get("/api/auth/validate").header("Authorization", "Bearer " + tokenOf("auditor")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(true))
                .andExpect(jsonPath("$.subject").value("auditor"))
                .andExpect(jsonPath("$.roles[0]").value("ROLE_AUDITOR"))
                .andExpect(jsonPath("$.issuer").value("omnipay-security-authority"))
                .andExpect(jsonPath("$.expiresAt").isNotEmpty());
    }

    @Test
    void validateRejectsMissingOrMalformedAuthorization() throws Exception {
        mockMvc.perform(get("/api/auth/validate")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/auth/validate").header("Authorization", "Basic abc")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/auth/validate").header("Authorization", "Bearer not-a-jwt")).andExpect(status().isUnauthorized());
    }

    @Test
    void validateRejectsExpiredTokens() throws Exception {
        String expired = token("omnipay-security-authority", Instant.now().minusSeconds(600));
        mockMvc.perform(get("/api/auth/validate").header("Authorization", "Bearer " + expired))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void validateRejectsAnotherIssuer() throws Exception {
        String foreign = token("someone-else", Instant.now().plusSeconds(3600));
        mockMvc.perform(get("/api/auth/validate").header("Authorization", "Bearer " + foreign))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void validateRejectsATamperedToken() throws Exception {
        String valid = tokenOf("user");
        JsonNode parts = mapper.valueToTree(valid.split("\\."));
        String tampered = parts.get(0).asText() + "." + parts.get(1).asText() + "." + "A".repeat(parts.get(2).asText().length());
        mockMvc.perform(get("/api/auth/validate").header("Authorization", "Bearer " + tampered))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void rolesAreMappedWithLeastPrivilegeByDefault() {
        assertEquals(List.of("ROLE_ADMIN", "ROLE_USER"), AuthService.authoritiesFor("ADMIN"));
        assertEquals(List.of("ROLE_AUDITOR"), AuthService.authoritiesFor("AUDITOR"));
        assertEquals(List.of("ROLE_USER"), AuthService.authoritiesFor("USER"));
        assertEquals(List.of("ROLE_USER"), AuthService.authoritiesFor("SOMETHING_ELSE"));
    }

    @Test
    void secretMustBeLongEnough() {
        SecurityConfig config = new SecurityConfig();
        assertThrows(IllegalStateException.class, () -> config.jwtSecretKey(""));
        assertThrows(IllegalStateException.class, () -> config.jwtSecretKey("too-short"));
    }
}
