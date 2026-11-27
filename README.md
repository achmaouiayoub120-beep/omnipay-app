# OmniPay Zero-Trust — Dépôt Applicatif & Intégration Continue (`omnipay-app`)

[![DevSecOps](https://img.shields.io/badge/Security-Zero--Trust-blue.svg)](#)
[![CI](https://img.shields.io/badge/CI-Jenkins%20JCasC-orange.svg)](#)
[![Code](https://img.shields.io/badge/Java-21%20LTS-red.svg)](#)
[![Architecture](https://img.shields.io/badge/Architecture-GitOps%20ArgoCD-green.svg)](#)

> **Avertissement de sécurité & simulation :**  
> Ce projet est une réalisation académique menée dans le cadre du module DevOps / DevSecOps à l'ESTC.  
> Il s'agit d'une **simulation purement pédagogique**. Aucune donnée bancaire réelle, aucune clé de production et aucun secret véritable n'y sont stockés ni manipulés.

---

## 1. Présentation du Projet

**OmniPay Zero-Trust** simule l'infrastructure numérique et les microservices critiques d'une néobanque en ligne.

L'objectif central est de **démontrer la maîtrise intégrale du cycle DevOps** :
$$\text{Planifier} \longrightarrow \text{Coder} \longrightarrow \text{Construire} \longrightarrow \text{Déployer} \longrightarrow \text{Surveiller} \longrightarrow \text{Apprendre}$$

Chaque phase intègre des contrôles stricts de sécurité (DevSecOps), des métriques d'observabilité (SRE) et des boucles de rétroaction vers le backlog projet.

---

## 2. Architecture des Microservices

L'application est composée de trois microservices Spring Boot autonomes et légers :

1. **`services/auth`** : Authentification des clients, émission de jetons JWT et validation de session.
2. **`services/transaction`** : Traitement des virements bancaires, persistance PostgreSQL, intégration HashiCorp Vault.
3. **`services/notification`** : Notification asynchrone suite aux transactions et simulation d'envoi d'e-mails.

---

## 3. Matrice des Rôles de l'Équipe

| Rôle | Porteur | Phases | Responsabilités principales |
|---|---|---|---|
| **P1** | Chef technique, planification et CI | Planifier, Coder, Construire | Git/GitHub, Jenkins (JCasC), Gitleaks, Threat Model STRIDE, ADRs 003 & 008 |
| **P2** | Applications, Docker et Helm | Construire, Déployer | Code microservices Java/Spring Boot, Docker multi-stage, Helm charts, Flyway |
| **P3** | Plateforme, IaC, réseau et conformité | Déployer, Surveiller | Terraform, Ansible, K3s, HashiCorp Vault, NetworkPolicies, kube-bench |
| **P4** | Livraison et chaîne d'approvisionnement | Construire, Déployer | Registre Harbor, ArgoCD GitOps, Cosign, Kyverno, Argo Rollouts |
| **P5** | Fiabilité, observabilité et apprentissage | Surveiller, Apprendre | Prometheus, Grafana, Loki, Alertmanager, Falco, Chaos Mesh, DORA |

---

## 4. Organisation du Dépôt `omnipay-app`

```text
omnipay-app/
├── .github/
│   ├── ISSUE_TEMPLATE/       # Modèles d'issues (tâches, bugs, sécurité)
│   └── PULL_REQUEST_TEMPLATE.md
├── ci/
│   ├── Jenkinsfile           # Pipeline déclaratif principal
│   ├── jenkins-casc.yaml     # Configuration as Code pour Jenkins
│   ├── docker-compose-jenkins.yml
│   └── scripts/              # Scripts de vérification CI & détection secrets
├── docs/
│   ├── architecture/         # Spécifications et vues architecturales
│   ├── adr/                  # Architecture Decision Records (ADR-001 à 010)
│   ├── security/             # Threat Model STRIDE & documentation Gitleaks
│   ├── runbooks/             # Fiches de dépannage opérationnel
│   └── project-management/   # Backlog de sprint et suivi
├── helm/
│   └── omnipay/              # Chart Helm paramétré pour K3s
├── infra/
│   ├── terraform/            # Modules de provisionnement
│   └── ansible/              # Rôles d'automatisation
├── services/
│   ├── auth/                 # Microservice d'authentification JWT (port 8081)
│   ├── transaction/          # Microservice de virement & idempotence (port 8082)
│   ├── notification/         # Microservice de notification asynchrone (port 8083)
│   └── frontend/             # Portail Web React 18 TypeScript & Nginx (port 8080)
├── scripts/
│   ├── soutenance.ps1        # Orchestrateur tout-en-un soutenance (Windows)
│   ├── soutenance.sh         # Orchestrateur tout-en-un soutenance (Linux/macOS)
│   ├── bootstrap-all.sh/.ps1 # Bootstrap K3s / Terraform / GitOps (< 15 min)
│   └── release-v1.sh/.ps1    # Validation et tag sémantique v1.0.0
├── tests/
│   ├── unit/                 # Tests unitaires
│   ├── integration/          # Tests d'intégration
│   ├── load/                 # Banc de tests de charge k6 sous JWT
│   └── security/             # Tests de sécurité
├── .gitleaks.toml            # Configuration de détection anti-secrets
├── .gitignore
├── CONTRIBUTING.md           # Règles de collaboration & Conventional Commits
└── LICENSE                   # Licence académique
```

---

## 5. Démarrage Rapide (Soutenance & Développement)

### Prérequis
- Git $\ge 2.40$
- Docker & Docker Compose
- Node.js $\ge 20$ (pour le frontend React 18) et Java JDK $\ge 21$ (optionnel hors Docker)

### Lancement tout-en-un de la stack Soutenance (`postgres`, 3 microservices + `frontend` Nginx)
```powershell
# Windows (PowerShell) :
.\scripts\soutenance.ps1 -Action install
.\scripts\soutenance.ps1 -OpenBrowser
# Mode autonome frontend seul sans Docker (http://localhost:3000) :
.\scripts\soutenance.ps1 -Action frontend
```

```bash
# Linux / macOS / Git Bash :
./scripts/soutenance.sh install
./scripts/soutenance.sh start --open
```

| Service | Port local | URL / Sonde |
|---|---|---|
| Portail Web Bancaire (Nginx / React 18) | **8080** | `http://localhost:8080` (`/health`) |
| Auth Microservice | **8081** | `http://localhost:8081/api/auth/health` |
| Transaction Microservice | **8082** | `http://localhost:8082/api/transactions/health` |
| Notification Microservice | **8083** | `http://localhost:8083/api/notifications/health` |
| Jenkins CI/CD (JCasC, option `-WithJenkins`) | **8088** | `http://localhost:8088` |

### Audit préventif des secrets (Shift-Left)
Avant chaque commit ou en local :
```bash
# Sous Windows PowerShell :
powershell -ExecutionPolicy Bypass -File ci/scripts/audit-secrets.ps1 .

# Sous Linux / macOS / Bash :
chmod +x ci/scripts/audit-secrets.sh && ./ci/scripts/audit-secrets.sh .
```

### Lancement du contrôleur Jenkins local avec JCasC
```bash
cd ci
docker compose -f docker-compose-jenkins.yml up -d
```
L'interface Jenkins sera accessible sur [http://localhost:8088](http://localhost:8088).

---

## 6. Règles de Contribution

Veuillez consulter le document [CONTRIBUTING.md](CONTRIBUTING.md) pour les règles relatives aux :
- Conventions de branches (`main`, `develop`, `feature/*`, `fix/*`, `security/*`).
- Format des commits ([Conventional Commits](https://www.conventionalcommits.org/)).
- Processus de revue de Pull Request et politique de binômes.

---

## 7. État d'Avancement (Release v1.0.0 — Semaines 1 à 4)

- [x] **S1** : Initialisation des deux dépôts (`omnipay-app` & `omnipay-gitops`), Jenkins JCasC, Gitleaks, Terraform K3s, microservices Spring Boot
- [x] **S2** : Pipeline DevSecOps 11 stages (Hadolint, SonarQube, Trivy, Syft SBOM, Cosign), persistance PostgreSQL + Flyway, NetworkPolicies & Ingress TLS, Harbor & ArgoCD
- [x] **S3** : Promotion GitOps multi-env (`dev`/`recette`/`prod`), DAST OWASP ZAP, HashiCorp Vault + ESO, Falco eBPF, Argo Rollouts Canary, Grafana Tempo & Alertmanager
- [x] **S4** : Portail Web React 18 Obsidian & Champagne + tests Vitest/Playwright, test de charge k6 JWT, résilience Vault/Falco & matrice Zero-Trust, scripts des 5 démos jury, orchestrateur soutenance et supports de présentation (`v1.0.0`)
