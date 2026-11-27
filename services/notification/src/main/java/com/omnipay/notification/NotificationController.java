package com.omnipay.notification;

import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** Envoi de notification simule : on journalise uniquement, rien n'est expedie. */
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private static final Logger LOG = LoggerFactory.getLogger(NotificationController.class);

    public record SendRequest(String recipient, String message) { }

    public record SendResponse(String notificationId, String status) { }

    @PostMapping("/send")
    public SendResponse send(@RequestBody SendRequest request) {
        if (request == null || isBlank(request.recipient()) || isBlank(request.message())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "recipient and message are required");
        }
        String id = "NT-" + UUID.randomUUID();
        LOG.info("Notification {} simulee envoyee ({} caracteres)", id, request.message().length());
        return new SendResponse(id, "SENT");
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "UP", "service", "notification-service");
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
