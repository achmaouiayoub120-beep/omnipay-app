package com.omnipay.transaction;

import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.omnipay.transaction.TransferService.AccountView;
import com.omnipay.transaction.TransferService.TransactionView;
import com.omnipay.transaction.TransferService.TransferRequest;
import com.omnipay.transaction.TransferService.TransferResponse;

/** API des virements. Les droits (RBAC) sont appliques par SecurityConfig ; l'utilisateur vient du JWT. */
@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private static final Logger LOG = LoggerFactory.getLogger(TransactionController.class);

    private final TransferService transfers;
    private final IdempotencyService idempotency;
    private final boolean chaosEnabled;

    public TransactionController(TransferService transfers, IdempotencyService idempotency,
                                 @Value("${omnipay.chaos.enabled:false}") boolean chaosEnabled) {
        this.transfers = transfers;
        this.idempotency = idempotency;
        this.chaosEnabled = chaosEnabled;
    }

    /** POST /api/transactions (alias historique : /transfer). Rejouable grace a X-Idempotency-Key. */
    @PostMapping({"", "/transfer"})
    public TransferResponse transfer(@RequestBody TransferRequest request, Authentication auth,
                                     @RequestHeader(value = "X-Idempotency-Key", required = false) String idempotencyKey,
                                     @RequestHeader(value = "X-Chaos-Fail", required = false) String chaos) {
        injectFaultIfRequested(auth, chaos);
        return idempotency.execute(auth.getName(), idempotencyKey,
                () -> transfers.transfer(request, auth.getName(), hasRole(auth, "ROLE_ADMIN")));
    }

    @GetMapping
    public List<TransactionView> history(Authentication auth) {
        return transfers.history(auth.getName(), hasRole(auth, "ROLE_ADMIN") || hasRole(auth, "ROLE_AUDITOR"));
    }

    @GetMapping("/accounts/me")
    public List<AccountView> myAccounts(Authentication auth) {
        return transfers.accountsOf(auth.getName());
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "UP", "service", "transaction-service");
    }

    /**
     * Demo jury (rollback canary) : avec OMNIPAY_CHAOS_ENABLED=true et le role ADMIN, l'en-tete
     * X-Chaos-Fail: true provoque une vraie erreur 500. Desactive par defaut, donc inoperant en production.
     */
    private void injectFaultIfRequested(Authentication auth, String chaos) {
        if (!"true".equalsIgnoreCase(chaos)) {
            return;
        }
        if (!chaosEnabled || !hasRole(auth, "ROLE_ADMIN")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "chaos injection is disabled");
        }
        LOG.error("[CHAOS] panne simulee par {} pour la demonstration du rollback canary", auth.getName());
        throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "[CHAOS] simulated failure");
    }

    private static boolean hasRole(Authentication auth, String role) {
        return auth.getAuthorities().stream().anyMatch(a -> role.equals(a.getAuthority()));
    }
}
