package com.omnipay.notification;

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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

@SpringBootTest
@AutoConfigureMockMvc
class NotificationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private ResultActions send(String json) throws Exception {
        return mockMvc.perform(post("/api/notifications/send").contentType(MediaType.APPLICATION_JSON).content(json));
    }

    @Test
    void healthReturnsUp() throws Exception {
        mockMvc.perform(get("/api/notifications/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.service").value("notification-service"));
    }

    @Test
    void validNotificationIsSent() throws Exception {
        send("{\"recipient\":\"user@omnipay.local\",\"message\":\"Virement recu\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SENT"))
                .andExpect(jsonPath("$.notificationId").value(Matchers.startsWith("NT-")));
    }

    @Test
    void emptyPayloadIsRejected() throws Exception {
        send("{}").andExpect(status().isBadRequest());
    }

    @Test
    void missingMessageIsRejected() throws Exception {
        send("{\"recipient\":\"user@omnipay.local\"}").andExpect(status().isBadRequest());
    }

    @Test
    void blankRecipientIsRejected() throws Exception {
        send("{\"recipient\":\"  \",\"message\":\"hello\"}").andExpect(status().isBadRequest());
    }
}
