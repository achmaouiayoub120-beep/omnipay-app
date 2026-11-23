# Spécification technique des microservices OmniPay (P2 — S1 à S3)

> Mini-banque **simulée** à des fins académiques : aucune logique financière réelle,
> comptes et soldes de démonstration uniquement, aucun secret dans le code.

## 1. Architecture

```text
            ┌──────────────┐  /api/auth          ┌────────────────┐      ┌─────────────────────┐      ┌──────────────────────┐
 client ──► │ frontend     │ ──────────────────► │ auth-service   │      │ transaction-service │ ───► │ notification-service │
            │ Nginx :8080  │  /api/transactions  │ :8081          │      │ :8082               │      │ :8083                │
            │              │ ────────────────────┼────────────────┼────► │                     │      └──────────────────────┘
            └──────────────┘                     └────────────────┘      └──────────┬──────────┘
                                               │ (S2+)
                                        ┌──────▼──────┐
                                        │ PostgreSQL  │  postgres:16-alpine, :5432
                                        └─────────────┘
```

| Service | Module Maven | Port | Rôle |
|---|---|---|---|
| frontend | `services/frontend` | 8080 | Portail web bancaire (Nginx non-root) + reverse-proxy des API |
| auth-service | `services/auth` | 8081 | Login (BCrypt), émission et validation de jetons JWT signés (rôles RBAC) |
| transaction-service | `services/transaction` | 8082 | Virement atomique et idempotent, filtre JWT + RBAC (JDBC + Flyway) |
| notification-service | `services/notification` | 8083 | Envoi simulé (journalisation), identifiant `NT-<uuid>` |

Les services sont indépendants (pas d'appel inter-services). Depuis la Semaine 2, `auth` et
`transaction` persistent leurs données via JDBC (`JdbcClient`) ; le schéma est versionné avec
**Flyway** (`src/main/resources/db/migration/`) et appliqué au démarrage.

- Par défaut (sans variable) : base **H2 en mémoire** (mode PostgreSQL) — tests et démarrage local autonomes.
- Avec PostgreSQL : définir `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_DRIVER=org.postgresql.Driver`,
  `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`. **Une base (ou un schéma) distincte par service** :
  chaque service a sa propre migration `V1` et sa propre table `flyway_schema_history`.

Stack : Java 21, Spring Boot 3.4.1, Maven multi-modules, JDBC + Flyway, Actuator + Micrometer Prometheus, JaCoCo.

## 2. Matrice des endpoints

| Service | Méthode | Chemin | Succès | Erreurs |
|---|---|---|---|---|
| auth | POST | `/api/auth/login` | 200 | 400 si `username` ou `password` vide/absent ; 401 si identifiants invalides |
| auth | GET | `/api/auth/validate` | 200 (claims décodés) | 401 si jeton absent, invalide, expiré ou d'un autre émetteur |
| auth | GET | `/api/auth/health` | 200 (public) | — |
| transaction | POST | `/api/transactions` (alias `/transfer`) | 200 — rôles USER, ADMIN | 400 données invalides ; 401 sans jeton valide ; 403 rôle insuffisant ou compte d'un autre utilisateur ; 404 compte introuvable ; 422 solde insuffisant |
| transaction | GET | `/api/transactions` | 200 — rôles USER, ADMIN, AUDITOR | 401 / 403 |
| transaction | GET | `/api/transactions/accounts/me` | 200 — rôles USER, ADMIN, AUDITOR | 401 / 403 |
| transaction | GET | `/api/transactions/health` | 200 (public) | — |
| notification | POST | `/api/notifications/send` | 200 | 400 si `recipient` ou `message` vide/absent |
| notification | GET | `/api/notifications/health` | 200 | — |
| tous | GET | `/actuator/health`, `/actuator/info`, `/actuator/metrics`, `/actuator/prometheus` | 200 | — |

### 2.1 Auth — `POST /api/auth/login` et `GET /api/auth/validate`

Les identifiants sont vérifiés dans la table `users` (mots de passe en BCrypt). Comptes de **démonstration**
(migrations `V1` et `V2`, mot de passe `password` pour les trois premiers ; à supprimer avant tout usage réel) :

| Utilisateur | Rôles dans le jeton | Compte bancaire (transaction) |
|---|---|---|
| `admin` | `ROLE_ADMIN`, `ROLE_USER` | `ACC-ADMIN-004` (50 000,00 EUR) |
| `user` | `ROLE_USER` | `ACC-USER-003` (14 250,00 EUR) |
| `auditor` | `ROLE_AUDITOR` (lecture seule) | aucun |
| `alice`, `bob` | `ROLE_USER` (mot de passe `<nom>-demo-pass`) | `ACC-ALICE-001`, `ACC-BOB-002` |

```json
// requête
{ "username": "admin", "password": "password" }
// réponse 200
{ "token": "<jwt>", "type": "Bearer", "status": "SUCCESS", "username": "admin",
  "roles": ["ROLE_ADMIN", "ROLE_USER"], "expiresAt": 1790000000 }
```

Jeton JWT **HS256** : `sub` (utilisateur), `roles`, `iss` = `omnipay-security-authority`, `iat`, `exp` (1 heure), `jti`.
`GET /api/auth/validate` (en-tête `Authorization: Bearer <jwt>`) vérifie signature, émetteur et expiration
et renvoie `{ "valid": true, "subject", "roles", "issuer", "issuedAt", "expiresAt" }` (401 sinon).

### 2.2 Transaction — `POST /api/transactions`

Tous les appels (hors `/health` et `/actuator/**`) exigent un jeton JWT valide (voir §6). Le virement est **atomique** (`@Transactional`) : les deux comptes sont verrouillés dans l'ordre
des identifiants, puis débit, crédit et ligne `transactions` (statut `SUCCESS`) sont validés ensemble.
Sans `sourceAccount`, le compte de l'appelant est débité ; un `ROLE_USER` ne peut débiter que ses propres comptes
(403 sinon), un `ROLE_ADMIN` n'importe lequel. Comptes de démonstration : voir le tableau §2.1
(`ACC-ALICE-001` 1000.00 EUR, `ACC-BOB-002` 500.00 EUR, `ACC-USER-003`, `ACC-ADMIN-004`).

```json
// requête  (en-têtes : Authorization: Bearer <jwt>, X-Idempotency-Key: <uuid>)
{ "targetAccount": "ACC-BOB-002", "amount": 150.00, "reason": "Loyer" }
// réponse 200 (transactionId = UUID enregistré dans la table transactions)
{ "transactionId": "<uuid>", "status": "SUCCESS", "amount": 150.00 }
```

`GET /api/transactions` renvoie les 100 derniers virements (ceux de l'utilisateur ; tous pour ADMIN et AUDITOR) ;
`GET /api/transactions/accounts/me` renvoie les comptes et soldes de l'appelant.

### 2.3 Notification — `POST /api/notifications/send`

```json
// requête
{ "recipient": "user@omnipay.local", "message": "Virement reçu" }
// réponse 200
{ "notificationId": "NT-<uuid>", "status": "SENT" }
```

### 2.4 Health (identique, `service` change)

```json
{ "status": "UP", "service": "auth-service" }
```

Erreur de validation (corps Spring standard) : `400 Bad Request`.

## 3. Variables d'environnement

| Variable | Service | Défaut | Description |
|---|---|---|---|
| `SERVER_PORT` | tous | 8081 / 8082 / 8083 | Port d'écoute HTTP |
| `POSTGRES_DB` | compose | `omnipay_db` | Base PostgreSQL |
| `POSTGRES_USER` | compose | `omnipay` | Utilisateur PostgreSQL |
| `POSTGRES_PASSWORD` | compose | **obligatoire** (`.env`) | Mot de passe PostgreSQL, jamais commité |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | transaction | injectées par compose | Réservées (non lues par l'application) |
| `SPRING_DATASOURCE_URL` | auth, transaction, notification | `jdbc:h2:mem:omnipay;...;MODE=PostgreSQL` | URL JDBC (PostgreSQL en environnement réel) |
| `SPRING_DATASOURCE_DRIVER` | idem | `org.h2.Driver` | Driver JDBC (`org.postgresql.Driver`) |
| `SPRING_DATASOURCE_USERNAME` / `SPRING_DATASOURCE_PASSWORD` | idem | `sa` / vide | Identifiants de base (jamais commités : Secret Kubernetes / `.env`) |
| `LOGGING_LEVEL_COM_OMNIPAY` | tous | `INFO` (Spring) | Niveau de logs, positionné par `logLevel` du chart Helm |
| `OMNIPAY_JWT_SECRET` | auth, transaction | **obligatoire** (≥ 32 car.) | Secret de signature HS256 des jetons. Jamais commité : `.env` en local, Secret Kubernetes `omnipay-jwt` en cluster. Le service refuse de démarrer s'il est absent |
| `OMNIPAY_CHAOS_ENABLED` | transaction | `false` | Démo jury : autorise `X-Chaos-Fail: true` (HTTP 500 volontaire, ROLE_ADMIN). `true` en dev/recette, `false` en prod |
| `OMNIPAY_CORS_ORIGINS` | auth, transaction | `http://localhost:*,http://127.0.0.1:*` | Origines CORS (développement local uniquement ; derrière Nginx tout est en même origine) |

## 4. Observabilité (pour P5)

- Métriques Prometheus : `GET /actuator/prometheus` sur chacun des 3 ports.
- Chaque métrique porte le tag `application=<nom-du-service>`.
- Les pods Helm sont annotés `prometheus.io/scrape|path|port`.

## 5. Exécution locale

### Maven

```bash
mvn clean verify                    # compile, teste et génère target/site/jacoco/jacoco.xml (couverture lignes >= 80 %)
mvn -pl services/auth spring-boot:run   # démarre un service (ex. auth sur :8081)
```

### Docker Compose

```bash
cp .env.example .env                # puis renseigner POSTGRES_PASSWORD et OMNIPAY_JWT_SECRET (openssl rand -base64 48)
docker compose up -d --build        # portail : http://localhost:8080
curl http://localhost:8081/api/auth/health
TOKEN=$(curl -s -X POST http://localhost:8081/api/auth/login -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}' | jq -r .token)
curl -X POST http://localhost:8082/api/transactions \
  -H "Authorization: Bearer $TOKEN" -H "X-Idempotency-Key: $(uuidgen)" -H "Content-Type: application/json" \
  -d '{"sourceAccount":"ACC-ALICE-001","targetAccount":"ACC-BOB-002","amount":150.00}'
docker compose down
```

Les Dockerfiles Java se construisent depuis la **racine du dépôt** (le POM parent est nécessaire) :
`docker build -f services/auth/Dockerfile -t omnipay/auth-service .`
Le frontend se construit depuis son dossier : `docker build -t omnipay/frontend-service services/frontend`.

Durcissement : build multi-stage (Temurin 21 Maven → JRE 21 Alpine), utilisateur non-root
`omniuser` (UID/GID 10001), `HEALTHCHECK` natif, `MaxRAMPercentage=75`.

### Helm

```bash
helm lint helm/omnipay
helm template omnipay helm/omnipay
helm install omnipay helm/omnipay -n omnipay --create-namespace -f helm/omnipay/values-dev.yaml
```

Le chart génère un Deployment + Service par entrée de `services` (`values.yaml`) avec les sondes
Actuator (`/actuator/health/readiness` : 10 s / 5 s, `/actuator/health/liveness` : 20 s / 10 s, plus une
`startupProbe` de 300 s max : le démarrage mesuré à 0,2 CPU / 256 Mi (profil dev) dure ~110 s), un arrêt gracieux (`preStop` 5 s +
20 s Spring dans `terminationGracePeriodSeconds: 40`) et le profil Pod Security Standards *restricted*
(`runAsNonRoot`, root filesystem en lecture seule avec `/tmp` en `emptyDir`, `drop: ["ALL"]`,
`allowPrivilegeEscalation: false`). Les images pointent vers
`harbor.omnipay.local:30002/omnipay/<service>:0.1.0` (à surcharger via `--set` ou le dépôt GitOps).

| Profil | Répliques | Logs `com.omnipay` | Ressources (requests → limits) | Haute disponibilité |
|---|---|---|---|---|
| `values.yaml` (défaut) | 1 | INFO | 100m/256Mi → 500m/512Mi | — |
| `values-dev.yaml` | 1 | DEBUG | 50m/128Mi → 200m/256Mi | — |
| `values-recette.yaml` | 2 | INFO | 100m/256Mi → 300m/384Mi | anti-affinité *preferred* par nœud |
| `values-prod.yaml` | 3 (HPA 3→10, CPU 80 %) | INFO | 150m/256Mi → 500m/512Mi | anti-affinité *required* par nœud, PDB `minAvailable: 2` |

> Prod : l'anti-affinité *required* exige au moins 3 nœuds (le cluster K3s de la S1 est mono-nœud).
> Sur moins de 3 nœuds, utiliser `podAntiAffinity.type: preferred` ou rester sur `values-recette.yaml`.

### Test de charge (k6)

```bash
# L'API exige un JWT : le script se connecte en ADMIN (mot de passe fourni par K6_PASSWORD, jamais dans le dépôt)
k6 run -e K6_PASSWORD=<mot-de-passe-admin-de-demo> tests/k6/load-test-transactions.js     # 10 VUs, 1 min, localhost:8082
k6 run -e K6_PASSWORD=... -e BASE_URL=http://<noeud>:<nodePort> -e AUTH_URL=http://<noeud>:<nodePort> tests/k6/load-test-transactions.js
```

Seuils : `http_req_duration` p95 < 200 ms, `http_req_failed` < 1 %. Les virements alternent
Alice → Bob / Bob → Alice pour que les soldes restent stables pendant la minute de test.

## 6. Sécurité applicative, idempotence et portail web (Semaine 3)

### 6.1 JWT et RBAC (Spring Security)

- `auth-service` signe le jeton (HS256, Nimbus) ; `transaction-service` le vérifie dans `JwtAuthenticationFilter`
  (signature, émetteur `omnipay-security-authority`, expiration) puis peuple le `SecurityContext` avec les rôles.
- Sans session, sans CSRF (API à jeton). Un jeton invalide laisse la requête anonyme : **401** ; rôle manquant : **403**.

| Route (transaction-service) | ROLE_USER | ROLE_ADMIN | ROLE_AUDITOR | Anonyme |
|---|---|---|---|---|
| `GET /api/transactions/**` | ✔ (ses comptes) | ✔ (tous) | ✔ (tous) | 401 |
| `POST /api/transactions/**` | ✔ (ses comptes) | ✔ (tous les comptes) | 403 | 401 |
| `/actuator/**`, `/api/transactions/health` | public (Prometheus, sondes K8s, HEALTHCHECK) | | | |

- Le secret `OMNIPAY_JWT_SECRET` n'est jamais dans le dépôt ; en cluster : `kubectl -n <ns> create secret generic omnipay-jwt --from-literal=secret="$(openssl rand -base64 48)"`.
- `notification-service` n'est pas protégé (aucun client externe : appelé en interne).

### 6.2 Idempotence des virements (`X-Idempotency-Key`)

- En-tête optionnel : 1 à 128 caractères `[A-Za-z0-9._-]` (un UUID convient). Sans clé, aucun dédoublonnage.
- Clé inconnue : le virement et l'enregistrement de la clé (table `idempotency_keys`, migration `V2`) sont validés dans la **même transaction SQL**.
- Clé déjà traitée : réponse d'origine renvoyée (HTTP 200, même `transactionId`, statut `IDEMPOTENT_REPLAY`), journal `[IDEMPOTENCE] Clé déjà traitée détectée : <clé>…`, aucun second débit.
- Requêtes simultanées avec la même clé : la seconde échoue sur la clé primaire, est annulée, puis rejoue la réponse de la première.
- La clé stockée est `SHA-256(utilisateur + "\n" + clé)` : une clé est propre à son utilisateur. Seuls les succès sont mémorisés (un 422 peut être rejoué avec la même clé).
- Purge : l'index `idx_idempotency_created_at` prépare un nettoyage périodique (non automatisé).

### 6.3 Portail web (`services/frontend`)

- SPA en JavaScript natif (aucune dépendance Node), servie par Nginx non-root (`nginxinc/nginx-unprivileged`, UID 101, port 8080) ;
  CSS local (glassmorphism), aucune ressource externe : **CSP stricte** `default-src 'self'`, fonctionne hors-ligne.
- Reverse-proxy : `/api/auth/` → `auth-service:8081`, `/api/transactions` → `transaction-service:8082` ; `/health` pour les sondes.
  Sur Kubernetes, les cibles viennent d'un ConfigMap généré par le chart (`<release>-auth`, `<release>-transaction`).
- Fonctions : connexion JWT (`sessionStorage`), carte virtuelle, solde / revenus / dépenses du mois, virement avec `X-Idempotency-Key`
  automatique, historique filtrable, compte à rebours d'expiration du jeton.
- **Outils Jury** : injecter 50 virements (trafic Prometheus/Grafana), simuler des erreurs HTTP 500 (`X-Chaos-Fail`, ROLE_ADMIN, `OMNIPAY_CHAOS_ENABLED=true`),
  décoder le JWT (avec vérification côté serveur via `/api/auth/validate`) et tester l'idempotence (double envoi de la même clé).
- Helm : `frontend-deployment.yaml`, `frontend-service.yaml`, `frontend-configmap.yaml`, `ingress.yaml` (`app.omnipay.local`, `omnipay.local`) ;
  PSS *restricted* (UID 101, root en lecture seule, `emptyDir` sur `/tmp` et `/var/cache/nginx`), 64 Mi / 50m → 128 Mi / 100m.


---

## 7. Évolutions Semaine 4 (S4) : Frontend React 18 Ultra, Polishing UI/UX & Tests de Charge k6 (P2)

### 7.1 Architecture Frontend React 18 Ultra (Fintech Glassmorphism 2.0)
En Semaine 4, le portail web client passe au niveau supérieur en intégrant **React 18** natif hébergé localement (`src/vendor/react.production.min.js` et `react-dom.production.min.js`), sans aucune dépendance réseau externe (100% conforme à la directive CSP `script-src 'self'` et compatible mode hors-ligne).

#### Fonctionnalités Majeures Ajoutées :
1. **Carte Bancaire 3D Interactive (Apple Card / Revolut Hologramme) :**
   - Effet de parallaxe 3D dynamique réagissant aux mouvements de la souris (`perspective: 1200px`, calcul de `rotateX` et `rotateY`).
   - Reflet holographique animé (`vcard-shine`) suivant l'orientation de la lumière.
   - Puce dorée texturée avec circuits imprimés.
   - Flip 3D (face arrière) avec bande magnétique, cryptogramme dynamique (CVV 842) et bouton de copie instantanée de l'IBAN.
   - Sélecteur de skins de carte en 1-clic : *Obsidian Cyber*, *Emerald VIP*, *Platinum Frost*.
2. **Badge Télémétrie HUD Zero-Trust Interactif :**
   - Radar vert pulsant en temps réel dans l'en-tête.
   - Modal de télémétrie affichant la latence en millisecondes de chaque microservice (`Auth: 12ms`, `Tx: 18ms`, `Notif: 8ms`, `Vault: NodePort 30006`).
   - Synthèse de sécurité : TLS 1.3 Strict, eBPF Falco actif, NetworkPolicies Deny-All, Admission Kyverno Cosign.
3. **Graphique SVG Donut Dynamique des Dépenses :**
   - Répartition visuelle interactive des dépenses (Virements 45%, Services 30%, Assurances 25%).
4. **Carrousel des Bénéficiaires Fréquents :**
   - Sélection rapide en 1-clic d'un contact (Alice, Bob, ESTC Treasury, Réserve SRE) pré-remplissant automatiquement le formulaire de virement.
5. **Moteur Sonore Fintech & Célébration Visuelle :**
   - Web Audio API pure (zéro fichier audio) synthétisant un carillon d'accord triomphal lors d'un virement réussi.
   - Explosion de confettis néon sur Canvas 2D lors de la validation d'un transfert.

### 7.2 Banc de Tests de Charge k6 Scalé (50 à 150 VUs)
Pour alimenter en direct la stack d'observabilité de Moad (P5) lors de la soutenance (Tracing Tempo et Golden Signals RED), le script k6 a été enrichi (`tests/load/k6-transactions-load.js`) :
- **Profil de montée en charge :**
  - Étape 1 : 0 ➔ 50 VUs en 20s (Ramp-up).
  - Étape 2 : 50 ➔ 150 VUs pendant 1m30s (Plateau de charge).
  - Étape 3 : 150 ➔ 0 VU en 20s (Ramp-down).
- **Seuils de qualité (Thresholds) :**
  - Latence p95 < 250 ms.
  - Taux d'erreurs HTTP < 1%.
  - Taux de réussite des vérifications > 99%.
- **Orchestration :** Scripts exécutables `tests/load/run-load-test.sh` (Bash) et `tests/load/run-load-test.ps1` (PowerShell).

### 7.3 Matrice de Résilience & Découplage
- **Résilience Découplée :** La défaillance temporaire de `notification-service` n'interrompt pas les opérations financières de `transaction-service`.
- **Idempotence :** Un double-clic ou retry réseau avec le même `X-Idempotency-Key` garantit mathématiquement l'unicité de l'opération en base PostgreSQL.
