package com.omnipay.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.hamcrest.Matchers;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcClient jdbc;

    private ResultActions login(String json) throws Exception {
        return mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(json));
    }

    @Test
    void healthReturnsUp() throws Exception {
        mockMvc.perform(get("/api/auth/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.service").value("auth-service"));
    }

    @Test
    void flywaySeedsThreeUsersWithHashedPasswords() {
        int users = jdbc.sql("SELECT COUNT(*) FROM users").query(Integer.class).single();
        int clearText = jdbc.sql("SELECT COUNT(*) FROM users WHERE password_hash NOT LIKE '$2%'")
                .query(Integer.class).single();
        org.junit.jupiter.api.Assertions.assertEquals(3, users);
        org.junit.jupiter.api.Assertions.assertEquals(0, clearText);
    }

    @Test
    void loginSucceedsWithValidCredentials() throws Exception {
        login("{\"username\":\"admin\",\"password\":\"admin-demo-pass\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.type").value("Bearer"))
                .andExpect(jsonPath("$.username").value("admin"))
                .andExpect(jsonPath("$.token").value(Matchers.startsWith("simulated-jwt-")));
    }

    @Test
    void loginFailsWithWrongPassword() throws Exception {
        login("{\"username\":\"alice\",\"password\":\"not-the-password\"}")
                .andExpect(status().isUnauthorized());
    }

    @Test
    void loginFailsForUnknownUser() throws Exception {
        login("{\"username\":\"mallory\",\"password\":\"whatever\"}")
                .andExpect(status().isUnauthorized());
    }

    @Test
    void loginFailsWhenPasswordBelongsToAnotherUser() throws Exception {
        login("{\"username\":\"bob\",\"password\":\"alice-demo-pass\"}")
                .andExpect(status().isUnauthorized());
    }

    @Test
    void loginWithoutPasswordIsRejected() throws Exception {
        login("{\"username\":\"admin\"}").andExpect(status().isBadRequest());
    }

    @Test
    void loginWithEmptyPayloadIsRejected() throws Exception {
        login("{}").andExpect(status().isBadRequest());
    }

    @Test
    void loginWithBlankUsernameIsRejected() throws Exception {
        login("{\"username\":\"  \",\"password\":\"x\"}").andExpect(status().isBadRequest());
    }
}
