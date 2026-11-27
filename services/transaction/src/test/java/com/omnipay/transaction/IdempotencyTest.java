package com.omnipay.transaction;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import org.junit.jupiter.api.Test;

class IdempotencyTest extends AbstractIntegrationTest {

    private static final String ADMIN = bearer("admin", "ROLE_ADMIN", "ROLE_USER");

    private String transactionIdOf(String json) {
        return json.replaceAll(".*\"transactionId\":\"([^\"]+)\".*", "$1");
    }

    @Test
    void firstRequestWithAKeyIsExecutedAndRemembered() throws Exception {
        String key = UUID.randomUUID().toString();
        transfer(ADMIN, key, ALICE, BOB, "100")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"));

        assertEquals(0, new BigDecimal("900.00").compareTo(balance(ALICE)));
        assertEquals(1, count("idempotency_keys"));
        assertEquals(1, count("transactions"));
    }

    @Test
    void doubleClickWithTheSameKeyDebitsOnlyOnce() throws Exception {
        String key = UUID.randomUUID().toString();
        String first = transfer(ADMIN, key, ALICE, BOB, "100").andExpect(status().isOk()).andReturn()
                .getResponse().getContentAsString();
        String second = transfer(ADMIN, key, ALICE, BOB, "100").andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(IdempotencyService.REPLAY_STATUS))
                .andExpect(jsonPath("$.amount").value(100))
                .andReturn().getResponse().getContentAsString();

        assertEquals(transactionIdOf(first), transactionIdOf(second));
        assertEquals(0, new BigDecimal("900.00").compareTo(balance(ALICE)));
        assertEquals(0, new BigDecimal("600.00").compareTo(balance(BOB)));
        assertEquals(1, count("transactions"));
        assertEquals(1, count("idempotency_keys"));
    }

    @Test
    void differentKeysAreTwoDistinctTransfers() throws Exception {
        transfer(ADMIN, UUID.randomUUID().toString(), ALICE, BOB, "100").andExpect(status().isOk());
        transfer(ADMIN, UUID.randomUUID().toString(), ALICE, BOB, "100").andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"));
        assertEquals(0, new BigDecimal("800.00").compareTo(balance(ALICE)));
        assertEquals(2, count("transactions"));
    }

    @Test
    void requestsWithoutAKeyAreNeverDeduplicated() throws Exception {
        transfer(ADMIN, null, ALICE, BOB, "10").andExpect(status().isOk());
        transfer(ADMIN, "  ", ALICE, BOB, "10").andExpect(status().isOk());
        assertEquals(2, count("transactions"));
        assertEquals(0, count("idempotency_keys"));
    }

    @Test
    void aFailedTransferIsNotRememberedSoTheClientCanRetry() throws Exception {
        String key = UUID.randomUUID().toString();
        transfer(ADMIN, key, BOB, ALICE, "9999").andExpect(status().isUnprocessableEntity());
        assertEquals(0, count("idempotency_keys"));

        transfer(ADMIN, key, BOB, ALICE, "100").andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"));
    }

    @Test
    void theSameKeyUsedByAnotherUserIsIndependent() throws Exception {
        String key = UUID.randomUUID().toString();
        transfer(ADMIN, key, ALICE, BOB, "100").andExpect(status().isOk());
        transfer(bearer("alice", "ROLE_USER"), key, ALICE, BOB, "50").andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"));
        assertEquals(2, count("transactions"));
        assertEquals(2, count("idempotency_keys"));
    }

    @Test
    void malformedKeysAreRejected() throws Exception {
        transfer(ADMIN, "bad key with spaces", ALICE, BOB, "1").andExpect(status().isBadRequest());
        transfer(ADMIN, "x".repeat(129), ALICE, BOB, "1").andExpect(status().isBadRequest());
        assertEquals(0, count("transactions"));
    }

    @Test
    void storedKeysAreHashedAndScopedPerUser() {
        String hash = IdempotencyService.scopedKey("admin", "abc");
        assertEquals(64, hash.length());
        assertNotEquals(hash, IdempotencyService.scopedKey("alice", "abc"));
        assertEquals(hash, IdempotencyService.scopedKey("admin", "abc"));
    }

    @Test
    void simultaneousRequestsWithTheSameKeyDebitOnlyOnce() throws Exception {
        String key = UUID.randomUUID().toString();
        ExecutorService pool = Executors.newFixedThreadPool(4);
        try {
            List<Callable<Integer>> calls = new ArrayList<>();
            for (int i = 0; i < 4; i++) {
                calls.add(() -> transfer(ADMIN, key, ALICE, BOB, "100").andReturn().getResponse().getStatus());
            }
            for (Future<Integer> result : pool.invokeAll(calls)) {
                assertEquals(200, result.get());
            }
        } finally {
            pool.shutdownNow();
        }
        assertEquals(0, new BigDecimal("900.00").compareTo(balance(ALICE)));
        assertEquals(1, count("transactions"));
        assertEquals(1, count("idempotency_keys"));
    }
}
