-- Auth : table des utilisateurs (schema versionne, execute par Flyway au demarrage).
CREATE TABLE users (
    id            VARCHAR(36)  PRIMARY KEY,
    username      VARCHAR(50)  UNIQUE NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    role          VARCHAR(20)  NOT NULL,
    created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- Comptes de DEMONSTRATION (simulation pedagogique). Mots de passe stockes en BCrypt (cout 10),
-- jamais en clair. A remplacer/supprimer avant tout usage reel.
INSERT INTO users (id, username, password_hash, role) VALUES
    ('00000000-0000-4000-8000-000000000001', 'admin', '$2y$10$ZkiI0pyP78VxFXRNW8iDX.jfq7IbRleTwcTcQbvKi9Omw2HMF0gnm', 'ADMIN'),
    ('00000000-0000-4000-8000-000000000002', 'alice', '$2y$10$BiONyW6CK9GLxEbRG5I/..MrN.Ezm/iv6P7yJYZUzlqLeXfTp85xm', 'USER'),
    ('00000000-0000-4000-8000-000000000003', 'bob',   '$2y$10$8EKwkvebFherMFf/dbZ9w.i0bnVa681EZGq9nU5GVnhtQmWS.T8D.','USER');
