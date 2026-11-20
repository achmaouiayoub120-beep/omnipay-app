-- Transaction : comptes et historique des virements (schema versionne, execute par Flyway).
CREATE TABLE accounts (
    account_id     VARCHAR(50)   PRIMARY KEY,
    owner_username VARCHAR(50)   NOT NULL,
    balance        NUMERIC(12,2) NOT NULL CHECK (balance >= 0),
    currency       VARCHAR(3)    NOT NULL
);

CREATE TABLE transactions (
    id             VARCHAR(36)   PRIMARY KEY,
    source_account VARCHAR(50)   NOT NULL,
    target_account VARCHAR(50)   NOT NULL,
    amount         NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    status         VARCHAR(20)   NOT NULL,
    created_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- Soldes initiaux de demonstration (simulation pedagogique).
INSERT INTO accounts (account_id, owner_username, balance, currency) VALUES
    ('ACC-ALICE-001', 'alice', 1000.00, 'EUR'),
    ('ACC-BOB-002',   'bob',    500.00, 'EUR');
