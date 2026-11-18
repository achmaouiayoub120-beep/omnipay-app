# Spécification technique des microservices OmniPay (Semaine 1 — P2)

> Mini-banque **simulée** à des fins académiques : aucune logique financière réelle,
> aucune persistance, aucun secret dans le code.

## 1. Architecture

```text
            ┌────────────────┐      ┌─────────────────────┐      ┌──────────────────────┐
 client ──► │ auth-service   │      │ transaction-service │ ───► │ notification-service │
            │ :8081          │      │ :8082               │      │ :8083                │
            └────────────────┘      └──────────┬──────────┘      └──────────────────────┘
                                               │ (S2+)
                                        ┌──────▼──────┐
                                        │ PostgreSQL  │  postgres:16-alpine, :5432
                                        └─────────────┘
```

| Service | Module Maven | Port | Rôle |
|---|---|---|---|
| auth-service | `services/auth` | 8081 | Login simulé, jeton factice `simulated-jwt-<uuid>` |
| transaction-service | `services/transaction` | 8082 | Virement simulé, identifiant `TX-<uuid>` |
| notification-service | `services/notification` | 8083 | Envoi simulé (journalisation), identifiant `NT-<uuid>` |

En Semaine 1 les services sont indépendants (pas d'appel inter-services) ; PostgreSQL est
provisionné dans Docker Compose pour les semaines suivantes (le service transaction reçoit
déjà `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, sans les utiliser).

Stack : Java 21, Spring Boot 3.4.1, Maven multi-modules, Actuator + Micrometer Prometheus.

## 2. Matrice des endpoints

| Service | Méthode | Chemin | Succès | Erreurs |
|---|---|---|---|---|
| auth | POST | `/api/auth/login` | 200 | 400 si `username` ou `password` vide/absent |
| auth | GET | `/api/auth/health` | 200 | — |
| transaction | POST | `/api/transactions/transfer` | 200 | 400 si comptes vides ou `amount` ≤ 0 / absent |
| transaction | GET | `/api/transactions/health` | 200 | — |
| notification | POST | `/api/notifications/send` | 200 | 400 si `recipient` ou `message` vide/absent |
| notification | GET | `/api/notifications/health` | 200 | — |
| tous | GET | `/actuator/health`, `/actuator/info`, `/actuator/metrics`, `/actuator/prometheus` | 200 | — |

### 2.1 Auth — `POST /api/auth/login`

```json
// requête
{ "username": "admin", "password": "<mot-de-passe-de-test>" }
// réponse 200
{ "token": "simulated-jwt-<uuid>", "type": "Bearer", "status": "SUCCESS", "username": "admin" }
```

### 2.2 Transaction — `POST /api/transactions/transfer`

```json
// requête
{ "sourceAccount": "FR01", "targetAccount": "FR02", "amount": 150.0 }
// réponse 200
{ "transactionId": "TX-<uuid>", "status": "COMPLETED", "amount": 150.0 }
```

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
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | transaction | injectées par compose | Connexion future à PostgreSQL |

## 4. Observabilité (pour P5)

- Métriques Prometheus : `GET /actuator/prometheus` sur chacun des 3 ports.
- Chaque métrique porte le tag `application=<nom-du-service>`.
- Les pods Helm sont annotés `prometheus.io/scrape|path|port`.

## 5. Exécution locale

### Maven

```bash
mvn clean test                      # compile les 3 modules et lance les tests
mvn -pl services/auth spring-boot:run   # démarre un service (ex. auth sur :8081)
```

### Docker Compose

```bash
cp .env.example .env                # puis choisir un mot de passe local dans .env
docker compose up -d --build
curl http://localhost:8081/api/auth/health
curl -X POST http://localhost:8082/api/transactions/transfer \
  -H "Content-Type: application/json" \
  -d '{"sourceAccount":"FR01","targetAccount":"FR02","amount":150.0}'
docker compose down
```

Les Dockerfiles se construisent depuis la **racine du dépôt** (le POM parent est nécessaire) :
`docker build -f services/auth/Dockerfile -t omnipay/auth-service .`

Durcissement : build multi-stage (Temurin 21 Maven → JRE 21 Alpine), utilisateur non-root
`omniuser` (UID/GID 10001), `HEALTHCHECK` natif, `MaxRAMPercentage=75`.

### Helm

```bash
helm lint helm/omnipay
helm template omnipay helm/omnipay
helm install omnipay helm/omnipay -n omnipay --create-namespace
```

Le chart génère un Deployment + Service par entrée de `services` (`values.yaml`) avec
probes liveness/readiness sur `/api/<service>/health`, `runAsNonRoot`, root filesystem en
lecture seule (`/tmp` en `emptyDir`) et capabilities supprimées. Les images pointent vers
`harbor.omnipay.local/omnipay/<service>:0.1.0` (à surcharger via `--set` ou le dépôt GitOps).
