package com.omnipay.transaction;

import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** Virement simule : validation minimale, aucune persistance. */
@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    public record TransferRequest(String sourceAccount, String targetAccount, Double amount) { }

    public record TransferResponse(String transactionId, String status, double amount) { }

    @PostMapping("/transfer")
    public TransferResponse transfer(@RequestBody TransferRequest request) {
        if (request == null || isBlank(request.sourceAccount()) || isBlank(request.targetAccount())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "sourceAccount and targetAccount are required");
        }
        if (request.amount() == null || request.amount() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "amount must be greater than 0");
        }
        return new TransferResponse("TX-" + UUID.randomUUID(), "COMPLETED", request.amount());
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "UP", "service", "transaction-service");
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
