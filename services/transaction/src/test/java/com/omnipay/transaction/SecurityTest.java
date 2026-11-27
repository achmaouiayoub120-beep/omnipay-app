package com.omnipay.transaction;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;

import org.junit.jupiter.api.Test;

class SecurityTest extends AbstractIntegrationTest {

    private static final String AUDITOR = bearer("auditor", "ROLE_AUDITOR");
    private static final String USER = bearer("user", "ROLE_USER");

    @Test
    void requestsWithoutTokenAreUnauthorized() throws Exception {
        transfer(null, null, ALICE, BOB, "10").andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/transactions")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/transactions/accounts/me")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/unknown")).andExpect(status().isUnauthorized());
        assertEquals(0, count("transactions"));
    }

    @Test
    void garbageTokenIsUnauthorized() throws Exception {
        transfer("Bearer not-a-jwt", null, ALICE, BOB, "10").andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/transactions").header("Authorization", "Basic YWRtaW46cGFzc3dvcmQ="))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void expiredTokenIsUnauthorized() throws Exception {
        String expired = "Bearer " + jwt(SECRET, ISSUER, "admin", Instant.now().minusSeconds(600), "ROLE_ADMIN", "ROLE_USER");
        transfer(expired, null, ALICE, BOB, "10").andExpect(status().isUnauthorized());
        assertEquals(0, count("transactions"));
    }

    @Test
    void tokenSignedWithAnotherKeyIsUnauthorized() throws Exception {
        String forged = "Bearer " + jwt("another-secret-another-secret-another-secret", ISSUER, "admin",
                Instant.now().plusSeconds(3600), "ROLE_ADMIN", "ROLE_USER");
        transfer(forged, null, ALICE, BOB, "10").andExpect(status().isUnauthorized());
    }

    @Test
    void tokenFromAnotherIssuerIsUnauthorized() throws Exception {
        String foreign = "Bearer " + jwt(SECRET, "someone-else", "admin", Instant.now().plusSeconds(3600), "ROLE_ADMIN");
        transfer(foreign, null, ALICE, BOB, "10").andExpect(status().isUnauthorized());
    }

    @Test
    void auditorIsReadOnly() throws Exception {
        mockMvc.perform(get("/api/transactions").header("Authorization", AUDITOR)).andExpect(status().isOk());
        transfer(AUDITOR, null, ALICE, BOB, "10").andExpect(status().isForbidden());
        assertEquals(0, count("transactions"));
    }

    @Test
    void validTokenWithoutAnyRoleIsForbidden() throws Exception {
        mockMvc.perform(get("/api/transactions").header("Authorization", bearer("ghost")))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/transactions").header("Authorization", bearer("ghost", "ADMIN")))
                .andExpect(status().isForbidden());
    }

    @Test
    void userCanReadAndWrite() throws Exception {
        mockMvc.perform(get("/api/transactions").header("Authorization", USER)).andExpect(status().isOk());
        transfer(USER, null, null, BOB, "10").andExpect(status().isOk());
    }

    @Test
    void actuatorEndpointsStayOpenForPrometheusAndProbes() throws Exception {
        mockMvc.perform(get("/actuator/health/liveness")).andExpect(status().isOk());
        mockMvc.perform(get("/actuator/health/readiness")).andExpect(status().isOk());
        // Les exporters de metriques sont desactives en test (404) : on verifie seulement que l'acces n'est pas protege.
        int prometheus = mockMvc.perform(get("/actuator/prometheus")).andReturn().getResponse().getStatus();
        assertTrue(prometheus != 401 && prometheus != 403, "prometheus status = " + prometheus);
    }

    @Test
    void secretMustBeLongEnough() {
        SecurityConfig config = new SecurityConfig();
        assertThrows(IllegalStateException.class, () -> config.jwtSecretKey(""));
        assertThrows(IllegalStateException.class, () -> config.jwtSecretKey("too-short"));
    }
}
