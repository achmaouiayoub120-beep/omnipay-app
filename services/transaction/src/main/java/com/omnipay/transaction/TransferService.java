package com.omnipay.transaction;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Regles metier des virements : debit, credit et historique dans une seule transaction SQL. */
@Service
public class TransferService {

    public record TransferRequest(String sourceAccount, String targetAccount, BigDecimal amount, String reason) { }

    public record TransferResponse(String transactionId, String status, BigDecimal amount) { }

    public record TransactionView(String id, String sourceAccount, String targetAccount, BigDecimal amount,
                                  String status, String reason, Instant createdAt) { }

    public record AccountView(String accountId, BigDecimal balance, String currency) { }

    private record Account(String owner, BigDecimal balance) { }

    private static final int MAX_REASON_LENGTH = 140;

    private final JdbcClient jdbc;

    public TransferService(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Virement atomique. Sans sourceAccount, le compte de l'appelant est utilise. Un USER ne debite que ses
     * propres comptes ; un ADMIN peut debiter n'importe quel compte.
     */
    @Transactional
    public TransferResponse transfer(TransferRequest request, String subject, boolean admin) {
        String target = request.targetAccount();
        BigDecimal amount = request.amount();
        if (isBlank(target)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "targetAccount is required");
        }
        if (amount == null || amount.signum() <= 0 || amount.stripTrailingZeros().scale() > 2) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "amount must be greater than 0 (2 decimals max)");
        }
        if (request.reason() != null && request.reason().length() > MAX_REASON_LENGTH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "reason is limited to " + MAX_REASON_LENGTH + " characters");
        }
        String source = isBlank(request.sourceAccount()) ? defaultAccount(subject) : request.sourceAccount();
        if (source.equals(target)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "sourceAccount and targetAccount must be different");
        }
        Map<String, Account> accounts = lockAccounts(source, target);
        if (!accounts.containsKey(source) || !accounts.containsKey(target)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "account not found");
        }
        if (!admin && !subject.equals(accounts.get(source).owner())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "source account belongs to another user");
        }
        if (accounts.get(source).balance().compareTo(amount) < 0) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "insufficient funds");
        }
        updateBalance(source, amount.negate());
        updateBalance(target, amount);
        String id = UUID.randomUUID().toString();
        jdbc.sql("INSERT INTO transactions (id, source_account, target_account, amount, status, reason)"
                        + " VALUES (:id, :source, :target, :amount, 'SUCCESS', :reason)")
                .param("id", id).param("source", source).param("target", target).param("amount", amount)
                .param("reason", isBlank(request.reason()) ? null : request.reason().trim())
                .update();
        return new TransferResponse(id, "SUCCESS", amount);
    }

    /** 100 derniers virements : tous pour ADMIN/AUDITOR, ceux qui concernent ses comptes pour un USER. */
    public List<TransactionView> history(String subject, boolean seeAll) {
        String ownAccounts = "(SELECT account_id FROM accounts WHERE owner_username = :owner)";
        String sql = "SELECT id, source_account, target_account, amount, status, reason, created_at FROM transactions"
                + (seeAll ? "" : " WHERE source_account IN " + ownAccounts + " OR target_account IN " + ownAccounts)
                + " ORDER BY created_at DESC, id LIMIT 100";
        JdbcClient.StatementSpec spec = jdbc.sql(sql);
        if (!seeAll) {
            spec = spec.param("owner", subject);
        }
        return spec.query((rs, n) -> new TransactionView(rs.getString("id"), rs.getString("source_account"),
                rs.getString("target_account"), rs.getBigDecimal("amount"), rs.getString("status"),
                rs.getString("reason"), rs.getTimestamp("created_at").toInstant())).list();
    }

    public List<AccountView> accountsOf(String subject) {
        return jdbc.sql("SELECT account_id, balance, currency FROM accounts WHERE owner_username = :owner ORDER BY account_id")
                .param("owner", subject)
                .query((rs, n) -> new AccountView(rs.getString("account_id"), rs.getBigDecimal("balance"), rs.getString("currency")))
                .list();
    }

    private String defaultAccount(String subject) {
        return accountsOf(subject).stream().findFirst().map(AccountView::accountId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "no account for user"));
    }

    /** Verrouille les deux comptes dans l'ordre des identifiants : pas de lecture perimee, pas d'interblocage. */
    private Map<String, Account> lockAccounts(String source, String target) {
        return jdbc.sql("SELECT account_id, owner_username, balance FROM accounts WHERE account_id IN (:source, :target)"
                        + " ORDER BY account_id FOR UPDATE")
                .param("source", source).param("target", target)
                .query(rs -> {
                    Map<String, Account> accounts = new HashMap<>();
                    while (rs.next()) {
                        accounts.put(rs.getString("account_id"),
                                new Account(rs.getString("owner_username"), rs.getBigDecimal("balance")));
                    }
                    return accounts;
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
