-- Motif du virement (saisi dans le portail web).
ALTER TABLE transactions ADD COLUMN reason VARCHAR(140);

-- Comptes de DEMONSTRATION des utilisateurs du portail (simulation pedagogique) :
-- user -> 14 250,00 EUR (carte du dashboard), admin -> 50 000,00 EUR.
INSERT INTO accounts (account_id, owner_username, balance, currency) VALUES
    ('ACC-USER-003',  'user',  14250.00, 'EUR'),
    ('ACC-ADMIN-004', 'admin', 50000.00, 'EUR');
