package com.omnipay.transaction;

import static java.nio.charset.StandardCharsets.UTF_8;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Optional;
import java.util.function.Supplier;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.omnipay.transaction.TransferService.TransferResponse;

/**
 * Idempotence des virements (en-tete X-Idempotency-Key) : une meme cle ne debite qu'une seule fois.
 * Le virement et l'enregistrement de la cle sont valides ensemble ; si deux requetes identiques arrivent
 * en meme temps, la seconde echoue sur la cle primaire, est annulee puis rejoue la reponse de la premiere.
 */
@Service
public class IdempotencyService {

    public static final String REPLAY_STATUS = "IDEMPOTENT_REPLAY";

    private static final Logger LOG = LoggerFactory.getLogger(IdempotencyService.class);
    private static final Pattern VALID_KEY = Pattern.compile("[A-Za-z0-9._-]{1,128}");

    private final JdbcClient jdbc;
    private final TransactionTemplate tx;
    private final ObjectMapper mapper;

    public IdempotencyService(JdbcClient jdbc, TransactionTemplate tx, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.tx = tx;
        this.mapper = mapper;
    }

    /** Sans cle : execution normale. Avec cle deja traitee : reponse d'origine, statut IDEMPOTENT_REPLAY. */
    public TransferResponse execute(String subject, String clientKey, Supplier<TransferResponse> transfer) {
        if (clientKey == null || clientKey.isBlank()) {
            return transfer.get();
        }
        if (!VALID_KEY.matcher(clientKey).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "X-Idempotency-Key must be 1-128 characters of [A-Za-z0-9._-]");
        }
        String key = scopedKey(subject, clientKey);
        Optional<TransferResponse> done = find(key);
        if (done.isPresent()) {
            return replay(clientKey, done.get());
        }
        try {
            return tx.execute(status -> {
                TransferResponse response = transfer.get();
                store(key, response);
                return response;
            });
        } catch (DuplicateKeyException concurrent) {
            return find(key).map(original -> replay(clientKey, original)).orElseThrow(() -> concurrent);
        }
    }

    private TransferResponse replay(String clientKey, TransferResponse original) {
        LOG.warn("[IDEMPOTENCE] Clé déjà traitée détectée : {}. Restitution de la réponse originale sans ré-exécution du virement.",
                clientKey);
        return new TransferResponse(original.transactionId(), REPLAY_STATUS, original.amount());
    }

    private Optional<TransferResponse> find(String key) {
        return jdbc.sql("SELECT response_body FROM idempotency_keys WHERE idempotency_key = :key")
                .param("key", key)
                .query(String.class)
                .optional()
                .map(this::fromJson);
    }

    private void store(String key, TransferResponse response) {
        jdbc.sql("INSERT INTO idempotency_keys (idempotency_key, transaction_id, response_body, status_code)"
                        + " VALUES (:key, :transactionId, :body, 200)")
                .param("key", key).param("transactionId", response.transactionId()).param("body", toJson(response))
                .update();
    }

    /** Cle propre a l'utilisateur : un autre utilisateur ne peut ni rejouer ni lire cette reponse. */
    static String scopedKey(String subject, String clientKey) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest((subject + "\n" + clientKey).getBytes(UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }

    private String toJson(TransferResponse response) {
        try {
            return mapper.writeValueAsString(response);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("cannot serialize response", e);
        }
    }

    private TransferResponse fromJson(String json) {
        try {
            return mapper.readValue(json, TransferResponse.class);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("cannot read stored idempotent response", e);
        }
    }
}
