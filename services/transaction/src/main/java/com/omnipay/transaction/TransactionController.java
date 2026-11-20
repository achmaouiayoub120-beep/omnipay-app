package com.omnipay.transaction;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** Virement compte a compte : debit, credit et historique dans une seule transaction SQL. */
@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    public record TransferRequest(String sourceAccount, String targetAccount, BigDecimal amount) { }

    public record TransferResponse(String transactionId, String status, BigDecimal amount) { }

    private final JdbcClient jdbc;

    public TransactionController(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @PostMapping("/transfer")
    @Transactional
    public TransferResponse transfer(@RequestBody TransferRequest request) {
        String source = request.sourceAccount();
        String target = request.targetAccount();
        BigDecimal amount = request.amount();
        if (isBlank(source) || isBlank(target) || source.equals(target)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "sourceAccount and targetAccount must be set and different");
        }
        if (amount == null || amount.signum() <= 0 || amount.stripTrailingZeros().scale() > 2) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "amount must be greater than 0 (2 decimals max)");
        }
        Map<String, BigDecimal> balances = lockBalances(source, target);
        if (!balances.containsKey(source) || !balances.containsKey(target)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "account not found");
        }
        if (balances.get(source).compareTo(amount) < 0) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "insufficient funds");
        }
        updateBalance(source, amount.negate());
        updateBalance(target, amount);
        String id = UUID.randomUUID().toString();
        jdbc.sql("INSERT INTO transactions (id, source_account, target_account, amount, status)"
                        + " VALUES (:id, :source, :target, :amount, 'SUCCESS')")
                .param("id", id).param("source", source).param("target", target).param("amount", amount)
                .update();
        return new TransferResponse(id, "SUCCESS", amount);
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "UP", "service", "transaction-service");
    }

    /** Verrouille les deux comptes dans l'ordre des identifiants : pas de lecture perimee, pas d'interblocage. */
    private Map<String, BigDecimal> lockBalances(String source, String target) {
        return jdbc.sql("SELECT account_id, balance FROM accounts WHERE account_id IN (:source, :target)"
                        + " ORDER BY account_id FOR UPDATE")
                .param("source", source).param("target", target)
                .query(rs -> {
                    Map<String, BigDecimal> balances = new HashMap<>();
                    while (rs.next()) {
                        balances.put(rs.getString("account_id"), rs.getBigDecimal("balance"));
                    }
                    return balances;
                });
    }

    private void updateBalance(String accountId, BigDecimal delta) {
        jdbc.sql("UPDATE accounts SET balance = balance + :delta WHERE account_id = :id")
                .param("delta", delta).param("id", accountId)
                .update();
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
