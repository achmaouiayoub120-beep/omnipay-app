package com.omnipay.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.hamcrest.Matchers;
import org.junit.jupiter.api.Test;

class AuthControllerTest extends AbstractIntegrationTest {

    @Test
    void healthReturnsUp() throws Exception {
        mockMvc.perform(get("/api/auth/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.service").value("auth-service"));
    }

    @Test
    void flywaySeedsFiveUsersWithHashedPasswords() {
        int users = jdbc.sql("SELECT COUNT(*) FROM users").query(Integer.class).single();
        int clearText = jdbc.sql("SELECT COUNT(*) FROM users WHERE password_hash NOT LIKE '$2%'")
                .query(Integer.class).single();
        assertEquals(5, users);
        assertEquals(0, clearText);
    }

    @Test
    void adminGetsAdminAndUserRoles() throws Exception {
        loginAs("admin", "password")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.type").value("Bearer"))
                .andExpect(jsonPath("$.username").value("admin"))
                .andExpect(jsonPath("$.roles[0]").value("ROLE_ADMIN"))
                .andExpect(jsonPath("$.roles[1]").value("ROLE_USER"))
                .andExpect(jsonPath("$.token").value(Matchers.matchesPattern("[\\w-]+\\.[\\w-]+\\.[\\w-]+")));
    }

    @Test
    void userGetsOnlyTheUserRole() throws Exception {
        loginAs("user", "password")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roles.length()").value(1))
                .andExpect(jsonPath("$.roles[0]").value("ROLE_USER"));
    }

    @Test
    void auditorGetsOnlyTheAuditorRole() throws Exception {
        loginAs("auditor", "password")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roles.length()").value(1))
                .andExpect(jsonPath("$.roles[0]").value("ROLE_AUDITOR"));
    }

    @Test
    void seededNonDemoUsersKeepTheirOwnPasswords() throws Exception {
        loginAs("alice", "alice-demo-pass").andExpect(status().isOk());
        loginAs("alice", "password").andExpect(status().isUnauthorized());
    }

    @Test
    void wrongPasswordIsUnauthorized() throws Exception {
        loginAs("alice", "not-the-password").andExpect(status().isUnauthorized());
    }

    @Test
    void unknownUserIsUnauthorized() throws Exception {
        loginAs("mallory", "whatever").andExpect(status().isUnauthorized());
    }

    @Test
    void passwordOfAnotherUserIsUnauthorized() throws Exception {
        loginAs("bob", "alice-demo-pass").andExpect(status().isUnauthorized());
    }

    @Test
    void incompletePayloadsAreRejected() throws Exception {
        login("{\"username\":\"admin\"}").andExpect(status().isBadRequest());
        login("{}").andExpect(status().isBadRequest());
        login("{\"username\":\"  \",\"password\":\"x\"}").andExpect(status().isBadRequest());
    }

    @Test
    void unknownRoutesRequireAuthentication() throws Exception {
        mockMvc.perform(get("/api/auth/users")).andExpect(status().isUnauthorized());
    }
}
