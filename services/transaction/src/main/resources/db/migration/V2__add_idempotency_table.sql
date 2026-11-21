-- Table de memorisation des cles d'idempotence pour eviter les doubles debits.
-- idempotency_key : SHA-256 hexadecimal de "<utilisateur>\n<cle X-Idempotency-Key>" (64 caracteres) :
-- une cle est propre a son utilisateur et sa taille est bornee, quel que soit l'en-tete recu.
CREATE TABLE IF NOT EXISTS idempotency_keys (
    idempotency_key VARCHAR(64) PRIMARY KEY,
    transaction_id  VARCHAR(36),
    response_body   TEXT NOT NULL,
    status_code     INT NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_idempotency_created_at ON idempotency_keys(created_at);
