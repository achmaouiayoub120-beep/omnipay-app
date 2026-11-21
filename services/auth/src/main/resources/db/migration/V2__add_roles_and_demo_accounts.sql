-- Roles RBAC : USER, ADMIN, AUDITOR (colonne users.role).
-- Comptes de DEMONSTRATION de la soutenance (simulation pedagogique) : mot de passe "password",
-- stocke en BCrypt. A supprimer ou remplacer avant tout usage reel.
--   admin   -> ROLE_ADMIN + ROLE_USER
--   user    -> ROLE_USER
--   auditor -> ROLE_AUDITOR (lecture seule)
UPDATE users SET password_hash = '$2y$10$Pn9U1B.z6NRy3kA7IDMzVeqWWS2BSRdCrLRG3UA7oZip5Dph00gXq'
 WHERE username = 'admin';

INSERT INTO users (id, username, password_hash, role) VALUES
    ('00000000-0000-4000-8000-000000000004', 'user',    '$2y$10$0nUhHj9jIKkfjg9wygOmzeLxENSccc9/37WkuEQ2wZsPla5iE14mK', 'USER'),
    ('00000000-0000-4000-8000-000000000005', 'auditor', '$2y$10$pBXzd7FFycM7P5jgh.wkruMin79lml.keT4V.d424rcSqqcO3nZwS', 'AUDITOR');
