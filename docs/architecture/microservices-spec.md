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
| transaction-service | `services/transaction` | 8082 | Virement atomique entre comptes (JDBC + Flyway), identifiant UUID |
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
| auth | GET | `/api/auth/health` | 200 | — |
| transaction | POST | `/api/transactions/transfer` | 200 | 400 si comptes vides/identiques, `amount` ≤ 0, absent ou > 2 décimales ; 404 si compte introuvable ; 422 si solde insuffisant |
| transaction | GET | `/api/transactions/health` | 200 | — |
| notification | POST | `/api/notifications/send` | 200 | 400 si `recipient` ou `message` vide/absent |
| notification | GET | `/api/notifications/health` | 200 | — |
| tous | GET | `/actuator/health`, `/actuator/info`, `/actuator/metrics`, `/actuator/prometheus` | 200 | — |

### 2.1 Auth — `POST /api/auth/login`

Les identifiants sont vérifiés dans la table `users` (mots de passe en BCrypt). La migration
`V1` crée 3 comptes de **démonstration** : `admin` (ADMIN), `alice` et `bob` (USER).
Mots de passe de démo : `<utilisateur>-demo-pass` — à ne jamais réutiliser hors simulation.

```json
// requête
{ "username": "admin", "password": "admin-demo-pass" }
// réponse 200
{ "token": "simulated-jwt-<uuid>", "type": "Bearer", "status": "SUCCESS", "username": "admin" }
```

### 2.2 Transaction — `POST /api/transactions/transfer`

Le virement est **atomique** (`@Transactional`) : les deux comptes sont verrouillés dans l'ordre
des identifiants, puis débit, crédit et ligne `transactions` (statut `SUCCESS`) sont validés ensemble.
Comptes de démonstration (migration `V1`) : `ACC-ALICE-001` (1000.00 EUR), `ACC-BOB-002` (500.00 EUR).

```json
// requête
{ "sourceAccount": "ACC-ALICE-001", "targetAccount": "ACC-BOB-002", "amount": 150.00 }
// réponse 200 (transactionId = UUID enregistré dans la table transactions)
{ "transactionId": "<uuid>", "status": "SUCCESS", "amount": 150.00 }
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
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | transaction | injectées par compose | Réservées (non lues par l'application) |
| `SPRING_DATASOURCE_URL` | auth, transaction, notification | `jdbc:h2:mem:omnipay;...;MODE=PostgreSQL` | URL JDBC (PostgreSQL en environnement réel) |
| `SPRING_DATASOURCE_DRIVER` | idem | `org.h2.Driver` | Driver JDBC (`org.postgresql.Driver`) |
| `SPRING_DATASOURCE_USERNAME` / `SPRING_DATASOURCE_PASSWORD` | idem | `sa` / vide | Identifiants de base (jamais commités : Secret Kubernetes / `.env`) |
| `LOGGING_LEVEL_COM_OMNIPAY` | tous | `INFO` (Spring) | Niveau de logs, positionné par `logLevel` du chart Helm |

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
k6 run tests/k6/load-test-transactions.js                              # 10 VUs, 1 min, http://localhost:8082
k6 run -e BASE_URL=http://<noeud>:<nodePort> tests/k6/load-test-transactions.js
```

Seuils : `http_req_duration` p95 < 200 ms, `http_req_failed` < 1 %. Les virements alternent
Alice → Bob / Bob → Alice pour que les soldes restent stables pendant la minute de test.
