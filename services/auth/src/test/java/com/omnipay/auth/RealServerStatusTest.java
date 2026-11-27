package com.omnipay.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/**
 * Serveur HTTP reel (Tomcat) : MockMvc ne passe pas par la page d'erreur du conteneur. Sans la regle
 * dispatcherTypeMatchers(ERROR), un 400 sortait en 401.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class RealServerStatusTest {

    private static final String SECRET = UUID.randomUUID() + "-" + UUID.randomUUID();

    @LocalServerPort
    private int port;

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("omnipay.security.jwt.secret", () -> SECRET);
    }

    private int login(String json) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/auth/login"))
                .header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(json)).build();
        return HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.discarding()).statusCode();
    }

    @Test
    void loginStatusCodesOverRealHttp() throws Exception {
        assertEquals(200, login("{\"username\":\"user\",\"password\":\"password\"}"));
        assertEquals(401, login("{\"username\":\"user\",\"password\":\"wrong\"}"));
        assertEquals(400, login("{\"username\":\"user\"}"));
    }
}
