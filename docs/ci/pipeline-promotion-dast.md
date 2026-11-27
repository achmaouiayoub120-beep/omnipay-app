# Pipeline de Promotion GitOps Multi-Environnements & Audit Dynamique DAST
## Documentation Technique & Guide d'Exploitation (Semaine 3)
### Rôle P1 : Chef Technique, Architecture & Lead Pipeline CI/CD DevSecOps

---

## 1. Vue d'Ensemble & Stratégie de Promotion

Dans l'architecture bancaire OmniPay Zero-Trust, un binaire applicatif ne transite jamais directement d'une machine de développeur vers la production. La livraison logicielle est gouvernée par le principe de **promotion d'artefacts immuables** :

```
                FLUX DE PROMOTION GITOPS MULTI-ENVIRONNEMENTS
  Code Source     Harbor OCI            omnipay-dev          omnipay-recette         omnipay-prod
 ┌───────────┐   ┌────────────┐        ┌─────────────┐        ┌─────────────┐        ┌─────────────┐
 │ Git Push  │──▶│ Image OCI  │───────▶│ ArgoCD      │───────▶│ DAST Scan   │───────▶│ Argo        │
 │ develop   │   │ + Cosign   │        │ Auto-Sync   │        │ OWASP ZAP   │        │ Rollouts    │
 └───────────┘   │ + Syft     │        │ Smoke Tests │        │ Smoke Tests │        │ Canary 10%  │
                 └────────────┘        └─────────────┘        └─────────────┘        └─────────────┘
```

### Principes Clés :
1. **Immuabilité des Images** : La même image certifiée et signée par Cosign en `dev` est promue successivement en `recette` puis en `prod`. Aucun conteneur n'est reconstruit entre les environnements.
2. **Shift-Left & Shift-Right Security** :
   - *Shift-Left (Statique)* : Gitleaks, Hadolint, JaCoCo >80%, SonarQube Quality Gate, OWASP Dependency-Check, Trivy.
   - *Shift-Right (Dynamique)* : OWASP ZAP DAST au runtime contre l'environnement de recette, et contrôles d'admission Kyverno.
3. **Ségrégation des Environnements GitOps** :
   - `envs/dev/` : Synchronisation continue (`automated prune: true, selfHeal: true`).
   - `envs/recette/` : Environnement de qualification et d'audit DAST.
   - `envs/prod/` : Déploiement progressif sous contrôle d'Argo Rollouts avec portes d'approbation et rollback automatique.

---

## 2. Audit Dynamique DAST avec OWASP ZAP

Le scan DAST s'exécute à l'étape 10 du pipeline Jenkinsfile via le script `ci/scripts/scan-dast-zap.sh`.

### Pourquoi un scan DAST en plus du SAST SonarQube ?
- **SonarQube (SAST)** inspecte le code source statique à froid.
- **OWASP ZAP (DAST)** attaque activement l'application en cours d'exécution pour détecter les failles liées à l'infrastructure réseau, à la configuration Ingress NGINX et aux en-têtes HTTP de sécurité.

### Vulnérabilités Auditées au Runtime :
| Identifiant | Règle ZAP | Criticité | Action Zero-Trust OmniPay |
| :--- | :--- | :--- | :--- |
| **10021** | `X-Content-Type-Options Header Missing` | Low / Medium | Forcé à `nosniff` via Ingress NGINX. |
| **10038** | `Content Security Policy (CSP) Not Set` | Medium | Définition d'une directive CSP stricte. |
| **10035** | `Strict-Transport-Security (HSTS)` | Medium / High | Forcé à `max-age=31536000; includeSubDomains`. |
| **40018** | `SQL Injection / Parameter Tampering` | High / Critical | **Build immédiatement avorté**. |
| **40012** | `Cross-Site Scripting (XSS)` | High / Critical | **Build immédiatement avorté**. |

### Commandes d'Exécution Manuelle :
```bash
# Sur Linux / Bash :
./ci/scripts/scan-dast-zap.sh http://api.omnipay.local/api/transactions HIGH

# Sur Windows / PowerShell :
.\ci\scripts\scan-dast-zap.ps1 -TargetUrl "http://api.omnipay.local/api/transactions" -FailOn "HIGH"
```

Les rapports sont consultables dans `build/reports/zap/zap-report.html` et `zap-report.json`.

---

## 3. Smoke-Tests Automatisés Post-Déploiement

À chaque étape de promotion, les smoke-tests valident en moins de 30 secondes que les pods répondent correctement :

1. **Sondes de santé Actuator** : `GET /actuator/health` sur chaque microservice (`auth`, `transaction`, `notification`).
2. **Métriques RED Prometheus** : `GET /actuator/prometheus` (contrôle que le collecteur Micrometer fonctionne pour P5).
3. **Flux Bancaire Nominal** : `POST /api/auth/login` (validation de l'émission du jeton JWT de session).

### Commandes d'Exécution Manuelle :
```bash
# Tester l'environnement de dev :
./ci/scripts/smoke-tests.sh http://api.omnipay.local dev 30

# Tester l'environnement de recette en PowerShell :
.\ci\scripts\smoke-tests.ps1 -BaseUrl "http://api.omnipay.local" -TargetEnv recette -TimeoutSec 30
```

---

## 4. Script de Promotion GitOps (`promote-release.sh`)

Le script `ci/scripts/promote-release.sh` automatise la mise à jour des versions dans le dépôt `omnipay-gitops`.

### Syntaxe :
```bash
./ci/scripts/promote-release.sh --env <dev|recette|prod> --tag <image-tag> [--service <svc>]
```

### Logique Interne :
1. Clone ou met à jour `omnipay-gitops`.
2. Modifie atomiquement les tags d'images dans :
   - `envs/<env>/kustomization.yaml`
   - `envs/<env>/<service>.yaml`
   - Si `<env> == prod` et `<service> == transaction-service` : met à jour `envs/prod/transaction-service-rollout.yaml` pour activer la stratégie Canary progressive.
3. Vérifie la conformité syntaxique Kustomize.
4. Crée un commit conventionnel traçable : `feat(gitops): promote <service> to <tag> in <env>`.

---

## 5. Matrice des Quality Gates par Environnement

| Contrôle de Sécurité | Environnement Dev | Environnement Recette | Environnement Prod |
| :--- | :---: | :---: | :---: |
| **Shift-Left Gitleaks** | Bloquant (0 secret) | Bloquant (0 secret) | Bloquant (0 secret) |
| **Hadolint Docker Lint** | Bloquant (0 warning) | Bloquant (0 warning) | Bloquant (0 warning) |
| **Tests JaCoCo** | Bloquant (> 80%) | Bloquant (> 80%) | Bloquant (> 80%) |
| **SonarQube Quality Gate**| Bloquant (Note A) | Bloquant (Note A) | Bloquant (Note A) |
| **Trivy Container Scan** | Bloquant (0 Crit/High) | Bloquant (0 Crit/High) | Bloquant (0 Crit/High) |
| **Signature Cosign** | Obligatoire (validée) | Obligatoire (validée) | **Obligatoire (Kyverno Enforce)** |
| **Smoke-Tests HTTP** | Bloquant (HTTP 200) | Bloquant (HTTP 200) | Bloquant (HTTP 200) |
| **DAST OWASP ZAP** | Optionnel | **Bloquant (0 High/Crit)** | Non audité au runtime direct |
| **Stratégie Déploiement**| ArgoCD Auto-Sync | ArgoCD Auto-Sync | **Argo Rollouts Canary (10%)** |
| **Gate d'Approbation** | Automatique | Automatique | **Tag Git sémantique ou Input Manuelle** |

---

## 6. Procédure de Rollback d'Urgence

Si une anomalie critique survient après la promotion en production :
1. **Canary Rollback Automatique** : Argo Rollouts surveille les métriques d'erreurs 5xx via Prometheus (`AnalysisTemplate`). Si le taux d'erreur dépasse 1%, le rollback à 100% sur l'ancienne version stable s'exécute automatiquement en moins de 30 secondes.
2. **Rollback GitOps Manuel (si nécessaire)** :
   ```bash
   cd omnipay-gitops
   git revert HEAD
   git push origin main
   ```
   ArgoCD synchronisera immédiatement la révision précédente sans intervention manuelle sur le cluster K3s.
