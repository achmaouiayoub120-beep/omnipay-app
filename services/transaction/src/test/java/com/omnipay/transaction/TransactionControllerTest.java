package com.omnipay.transaction;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class TransactionControllerTest extends AbstractIntegrationTest {

    private static final String ADMIN = bearer("admin", "ROLE_ADMIN", "ROLE_USER");
    private static final String ALICE_TOKEN = bearer("alice", "ROLE_USER");
    private static final String USER = bearer("user", "ROLE_USER");

    private void assertBalance(String accountId, String expected) {
        assertEquals(0, new BigDecimal(expected).compareTo(balance(accountId)), accountId + " = " + balance(accountId));
    }

    @Test
    void healthIsPublicAndReturnsUp() throws Exception {
        mockMvc.perform(get("/api/transactions/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.service").value("transaction-service"));
    }

    @Test
    void flywaySeedsAccountsAndIdempotencyTable() {
        assertBalance(ALICE, "1000.00");
        assertBalance(BOB, "500.00");
        assertBalance(USER_ACCOUNT, "14250.00");
        assertEquals(0, count("idempotency_keys"));
    }

    @Test
    void transferMovesMoneyAndRecordsTransaction() throws Exception {
        transfer(ADMIN, null, ALICE, BOB, "150.25")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.amount").value(150.25))
                .andExpect(jsonPath("$.transactionId").isNotEmpty());

        assertBalance(ALICE, "849.75");
        assertBalance(BOB, "650.25");
        assertEquals(1, count("transactions"));
    }

    @Test
    void legacyTransferPathStillWorks() throws Exception {
        mockMvc.perform(post("/api/transactions/transfer").header("Authorization", ADMIN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sourceAccount\":\"" + ALICE + "\",\"targetAccount\":\"" + BOB + "\",\"amount\":10}"))
                .andExpect(status().isOk());
        assertBalance(BOB, "510.00");
    }

    @Test
    void sourceDefaultsToTheCallersOwnAccountAndKeepsTheReason() throws Exception {
        mockMvc.perform(post("/api/transactions").header("Authorization", USER).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"targetAccount\":\"" + BOB + "\",\"amount\":250.00,\"reason\":\"  Loyer novembre \"}"))
                .andExpect(status().isOk());

        assertBalance(USER_ACCOUNT, "14000.00");
        assertBalance(BOB, "750.00");
        mockMvc.perform(get("/api/transactions").header("Authorization", USER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].reason").value("Loyer novembre"))
                .andExpect(jsonPath("$[0].sourceAccount").value(USER_ACCOUNT))
                .andExpect(jsonPath("$[0].status").value("SUCCESS"));
    }

    @Test
    void userWithoutAccountCannotUseTheDefaultSource() throws Exception {
        transfer(bearer("nobody", "ROLE_USER"), null, null, BOB, "10").andExpect(status().isNotFound());
    }

    @Test
    void userCannotDebitSomeoneElsesAccount() throws Exception {
        transfer(USER, null, ALICE, BOB, "10").andExpect(status().isForbidden());
        assertBalance(ALICE, "1000.00");
        assertEquals(0, count("transactions"));
    }

    @Test
    void ownerCanDebitOwnAccount() throws Exception {
        transfer(ALICE_TOKEN, null, ALICE, BOB, "10").andExpect(status().isOk());
        assertBalance(ALICE, "990.00");
    }

    @Test
    void transferOfWholeBalanceIsAllowed() throws Exception {
        transfer(ADMIN, null, ALICE, BOB, "1000").andExpect(status().isOk());
        assertBalance(ALICE, "0");
        assertBalance(BOB, "1500.00");
    }

    @Test
    void insufficientFundsIsRejectedAndLeavesBalancesUntouched() throws Exception {
        transfer(ADMIN, null, BOB, ALICE, "500.01").andExpect(status().isUnprocessableEntity());
        assertBalance(BOB, "500.00");
        assertBalance(ALICE, "1000.00");
        assertEquals(0, count("transactions"));
    }

    @Test
    void unknownAccountsAreNotFound() throws Exception {
        transfer(ADMIN, null, "ACC-GHOST-999", BOB, "10").andExpect(status().isNotFound());
        transfer(ADMIN, null, ALICE, "ACC-GHOST-999", "10").andExpect(status().isNotFound());
        assertBalance(ALICE, "1000.00");
    }

    @Test
    void invalidAmountIsRejected() throws Exception {
        transfer(ADMIN, null, ALICE, BOB, "0").andExpect(status().isBadRequest());
        transfer(ADMIN, null, ALICE, BOB, "-5").andExpect(status().isBadRequest());
        transfer(ADMIN, null, ALICE, BOB, "null").andExpect(status().isBadRequest());
        transfer(ADMIN, null, ALICE, BOB, "10.555").andExpect(status().isBadRequest());
        assertEquals(0, count("transactions"));
    }

    @Test
    void invalidAccountsOrReasonAreRejected() throws Exception {
        transfer(ADMIN, null, ALICE, " ", "10").andExpect(status().isBadRequest());
        transfer(ADMIN, null, ALICE, ALICE, "10").andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/transactions").header("Authorization", ADMIN).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"targetAccount\":\"" + BOB + "\",\"amount\":1,\"reason\":\"" + "x".repeat(141) + "\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void successiveTransfersConserveTheTotalMoney() throws Exception {
        for (int i = 0; i < 5; i++) {
            transfer(ADMIN, null, ALICE, BOB, "10.50").andExpect(status().isOk());
            transfer(ADMIN, null, BOB, ALICE, "3.25").andExpect(status().isOk());
        }
        assertEquals(0, new BigDecimal("1500.00").compareTo(balance(ALICE).add(balance(BOB))));
        assertEquals(10, count("transactions"));
    }

    @Test
    void myAccountsReturnsOnlyTheCallersAccounts() throws Exception {
        mockMvc.perform(get("/api/transactions/accounts/me").header("Authorization", USER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].accountId").value(USER_ACCOUNT))
                .andExpect(jsonPath("$[0].balance").value(14250.00))
                .andExpect(jsonPath("$[0].currency").value("EUR"));
    }

    @Test
    void historyIsScopedToTheUserButAdminAndAuditorSeeEverything() throws Exception {
        transfer(ADMIN, null, ALICE, BOB, "10").andExpect(status().isOk());
        transfer(USER, null, null, BOB, "5").andExpect(status().isOk());

        mockMvc.perform(get("/api/transactions").header("Authorization", USER))
                .andExpect(jsonPath("$.length()").value(1));
        mockMvc.perform(get("/api/transactions").header("Authorization", bearer("auditor", "ROLE_AUDITOR")))
                .andExpect(jsonPath("$.length()").value(2));
        mockMvc.perform(get("/api/transactions").header("Authorization", ADMIN))
                .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void chaosHeaderProvokesAnInternalErrorForAdminOnly() throws Exception {
        mockMvc.perform(post("/api/transactions").header("Authorization", ADMIN).header("X-Chaos-Fail", "true")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sourceAccount\":\"" + ALICE + "\",\"targetAccount\":\"" + BOB + "\",\"amount\":1}"))
                .andExpect(status().isInternalServerError());
        mockMvc.perform(post("/api/transactions").header("Authorization", USER).header("X-Chaos-Fail", "true")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"targetAccount\":\"" + BOB + "\",\"amount\":1}"))
                .andExpect(status().isForbidden());
        assertBalance(ALICE, "1000.00");
        assertEquals(0, count("transactions"));
    }
}
