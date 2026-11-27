# 🛡️ Pipeline CI/CD DevSecOps — OmniPay Zero-Trust
## Documentation Technique & Guide d'Exploitation (Semaine 2)
> **Rôle :** P1 — Chef Technique & Architecte CI/CD  
> **Composant :** Jenkins Configuration as Code (`ci/Jenkinsfile`)  
> **Cible :** `omnipay-app` ➔ `harbor.omnipay.local:30002` ➔ `omnipay-gitops`

---

## 1. Vue d'Ensemble & Philosophie Zero-Trust

Le pipeline d'intégration continue d'OmniPay Zero-Trust n'est pas un simple outil de compilation : c'est un **système de vérification cryptographique et de portes de qualité automatisées**. 

### Principes Clés
1. **Shift-Left Security :** La détection des vulnérabilités commence dès le commit développeur (Gitleaks, Hadolint) avant même la compilation des binaires.
2. **Quality Gates Bloquantes :** Aucune image ne peut être construite ou déployée si elle contient une vulnérabilité critique, un mot de passe en clair ou une couverture de test insuffisante (<80%).
3. **Software Supply Chain Security :** Chaque image poussée dans le registre privé Harbor est certifiée par un inventaire logiciel complet (**SBOM Syft**) et une signature cryptographique immuable (**Cosign**).
4. **GitOps Write-Back :** Jenkins n'a aucun accès administrateur direct sur Kubernetes. Il met à jour l'état désiré dans Git (`omnipay-gitops`), et **ArgoCD** se charge de la réconciliation.

---

## 2. Déroulement des 11 Étapes du Pipeline

```
  ┌────────────────────────────────────────────────────────────────────────┐
  │                           PIPELINE DEVSECOPS                           │
  └───────────────────────────────────┬────────────────────────────────────┘
                                      │
  [1. Checkout SCM] ───────────────▶ [2. Gitleaks Secret Scan] (Bloquant)
                                      │
  [3. Hadolint Dockerfile Lint] ───▶ [4. Maven Build & JUnit Tests]
                                      │
  [5. SonarQube SAST Analysis] ────▶ [5b. SonarQube Quality Gate] (Bloquant)
                                      │
  [6. OWASP Dependency-Check] ────▶ [7. Docker Multi-Stage Build]
                                      │
  [8. Trivy Vulnerability Scan] ──▶ [9. Syft SBOM & Cosign Signature]
                                      │
  [10. Push to Harbor (30002)] ────▶ [11. GitOps Write-Back (envs/dev/)]
                                      │
                                      ▼
                      [Post: Webhook Notifications]
```

### Détail des Étapes

| Étape | Outil / Moteur | Type de Contrôle | Seuil d'Acceptation | Conséquence en cas d'échec |
|---|---|---|---|---|
| **1. Checkout SCM** | Git | Intégrité & Métadonnées | Commit SHA et auteur valides | Pipeline arrêté |
| **2. Secret Scan** | **Gitleaks** | Audit de secrets Shift-Left | **0 secret toléré** | Build rouge immédiat |
| **3. Dockerfile Lint** | **Hadolint** | Bonnes pratiques conteneurs | Pas de `USER root`, versions figées | Build rouge |
| **4. Build & Tests** | **Maven (JDK 21)** | Compilation & Tests JUnit 5 | 100% des tests unitaires passants | Build rouge |
| **5. SAST Analysis** | **SonarQube** | Analyse statique de code | Couverture > 80%, 0 bug bloquant | Quality Gate failed |
| **6. SCA Scan** | **Dependency-Check** | Vulnérabilités dépendances | CVSS < 8.0 | Avertissement ou échec |
| **7. Docker Build** | Docker Multi-Stage | Construction légère Alpine | Non-root UID 10001 | Échec de build |
| **8. Container Scan** | **Trivy** | Failles OS & packages image | 0 vulnérabilité `CRITICAL` | Build rouge |
| **9. Supply Chain** | **Syft + Cosign** | SBOM SPDX & Signature ECDSA | Signature valide générée | Build rouge |
| **10. Registry Push** | **Harbor (30002)** | Stockage immuable OCI | Push image, signature & SBOM | Échec réseau |
| **11. Write-Back** | Git / Kustomize | Déclenchement automatique CD | Commit sur `omnipay-gitops` | Échec Git |

---

## 3. Scripts d'Automatisation Locaux (`ci/scripts/`)

Tous les contrôles du pipeline peuvent être testés localement par les développeurs avant de pousser leur code :

### 1. Audit Hadolint (Dockerfiles)
```bash
# Sous Linux / macOS / WSL2 :
./ci/scripts/scan-hadolint.sh

# Sous Windows PowerShell :
powershell -ExecutionPolicy Bypass -File ./ci/scripts/scan-hadolint.ps1
```

### 2. Scan Trivy (Conteneurs)
```bash
# Scanner une image locale :
./ci/scripts/scan-trivy.sh harbor.omnipay.local:30002/omnipay/auth-service:latest
```

### 3. Signature Cosign & Génération SBOM
```bash
./ci/scripts/syft-cosign-pipeline.sh build-42
```

### 4. GitOps Write-Back (Test de mise à jour)
```bash
./ci/scripts/gitops-writeback.sh build-42
```

---

## 4. Prérequis d'Exécution sur Jenkins

Pour que le pipeline s'exécute avec l'ensemble des modules connectés :
1. **Credentials Jenkins (JCasC) :**
   * `harbor-registry` : Compte robot Harbor avec droits `push/pull` sur le projet `omnipay`.
   * `github-omnipay-gitops` : Token GitHub (`repo` scope) pour le push sur `omnipay-gitops`.
   * `cosign-signing-key` : Clé privée de signature protégée par mot de passe.
2. **Serveurs Externes :**
   * **SonarQube :** `http://sonarqube.omnipay.local:30003` (avec webhook vers `http://jenkins.omnipay.local:8088/sonarqube-webhook/`).
   * **Harbor :** `harbor.omnipay.local:30002`.
