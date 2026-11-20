package com.omnipay.transaction;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;

import org.junit.jupiter.api.BeforeEach;
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
class TransactionControllerTest {

    private static final String ALICE = "ACC-ALICE-001";
    private static final String BOB = "ACC-BOB-002";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcClient jdbc;

    /** Etat initial identique a la migration Flyway, quel que soit l'ordre des tests. */
    @BeforeEach
    void resetData() {
        jdbc.sql("DELETE FROM transactions").update();
        jdbc.sql("UPDATE accounts SET balance = 1000.00 WHERE account_id = :id").param("id", ALICE).update();
        jdbc.sql("UPDATE accounts SET balance = 500.00 WHERE account_id = :id").param("id", BOB).update();
    }

    private ResultActions transfer(String source, String target, String amount) throws Exception {
        String json = "{\"sourceAccount\":\"" + source + "\",\"targetAccount\":\"" + target + "\",\"amount\":" + amount + "}";
        return mockMvc.perform(post("/api/transactions/transfer").contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private BigDecimal balance(String accountId) {
        return jdbc.sql("SELECT balance FROM accounts WHERE account_id = :id").param("id", accountId)
                .query(BigDecimal.class).single();
    }

    private int transactionCount() {
        return jdbc.sql("SELECT COUNT(*) FROM transactions").query(Integer.class).single();
    }

    @Test
    void healthReturnsUp() throws Exception {
        mockMvc.perform(get("/api/transactions/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.service").value("transaction-service"));
    }

    @Test
    void flywaySeedsInitialBalances() {
        assertEquals(0, new BigDecimal("1000.00").compareTo(balance(ALICE)));
        assertEquals(0, new BigDecimal("500.00").compareTo(balance(BOB)));
    }

    @Test
    void transferMovesMoneyAndRecordsTransaction() throws Exception {
        transfer(ALICE, BOB, "150.25")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.amount").value(150.25))
                .andExpect(jsonPath("$.transactionId").isNotEmpty());

        assertEquals(0, new BigDecimal("849.75").compareTo(balance(ALICE)));
        assertEquals(0, new BigDecimal("650.25").compareTo(balance(BOB)));
        assertEquals(1, transactionCount());
    }

    @Test
    void transferOfWholeBalanceIsAllowed() throws Exception {
        transfer(ALICE, BOB, "1000").andExpect(status().isOk());
        assertEquals(0, BigDecimal.ZERO.compareTo(balance(ALICE)));
        assertEquals(0, new BigDecimal("1500.00").compareTo(balance(BOB)));
    }

    @Test
    void transferWithInsufficientFundsIsRejectedAndLeavesBalancesUntouched() throws Exception {
        transfer(BOB, ALICE, "500.01").andExpect(status().isUnprocessableEntity());

        assertEquals(0, new BigDecimal("500.00").compareTo(balance(BOB)));
        assertEquals(0, new BigDecimal("1000.00").compareTo(balance(ALICE)));
        assertEquals(0, transactionCount());
    }

    @Test
    void transferFromUnknownSourceIsNotFound() throws Exception {
        transfer("ACC-GHOST-999", BOB, "10").andExpect(status().isNotFound());
        assertEquals(0, new BigDecimal("500.00").compareTo(balance(BOB)));
    }

    @Test
    void transferToUnknownTargetIsNotFound() throws Exception {
        transfer(ALICE, "ACC-GHOST-999", "10").andExpect(status().isNotFound());
        assertEquals(0, new BigDecimal("1000.00").compareTo(balance(ALICE)));
    }

    @Test
    void zeroNegativeOrMissingAmountIsRejected() throws Exception {
        transfer(ALICE, BOB, "0").andExpect(status().isBadRequest());
        transfer(ALICE, BOB, "-5").andExpect(status().isBadRequest());
        transfer(ALICE, BOB, "null").andExpect(status().isBadRequest());
        assertEquals(0, transactionCount());
    }

    @Test
    void amountWithMoreThanTwoDecimalsIsRejected() throws Exception {
        transfer(ALICE, BOB, "10.555").andExpect(status().isBadRequest());
    }

    @Test
    void blankOrIdenticalAccountsAreRejected() throws Exception {
        transfer("", BOB, "10").andExpect(status().isBadRequest());
        transfer(ALICE, " ", "10").andExpect(status().isBadRequest());
        transfer(ALICE, ALICE, "10").andExpect(status().isBadRequest());
    }

    @Test
    void successiveTransfersConserveTheTotalMoney() throws Exception {
        for (int i = 0; i < 5; i++) {
            transfer(ALICE, BOB, "10.50").andExpect(status().isOk());
            transfer(BOB, ALICE, "3.25").andExpect(status().isOk());
        }
        assertEquals(0, new BigDecimal("1500.00").compareTo(balance(ALICE).add(balance(BOB))));
        assertEquals(10, transactionCount());
    }
}
