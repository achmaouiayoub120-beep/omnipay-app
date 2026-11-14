# Rapport de Fin de Semaine 1 — Rôle P1 : Technical Lead & CI

**Module :** DevOps / DevSecOps — ESTC  
**Projet :** OmniPay Zero-Trust  
**Auteur :** P1 — Chef technique, planification et CI  
**Date :** 14 Novembre 2026  
**Statut du Jalon S1 :** Validé — Fondations et Socle Opérationnels  

---

## 1. Résumé du Travail Réalisé

Durant cette première semaine, l'ensemble des fondations organisationnelles, méthodologiques et techniques a été posé pour le projet **OmniPay Zero-Trust** :
- **Audit de l'environnement local** : identification précise des outils présents (`git` v2.50.1, `java` 25 LTS, `docker` client 29.9.3) et des prérequis à ajuster.
- **Organisation Git & GitHub** : structuration des deux dépôts distincts (`omnipay-app` et `omnipay-gitops`), initialisation des arbres de fichiers conformes aux standards professionnels, rédaction du guide [CONTRIBUTING.md](../CONTRIBUTING.md) et des gabarits GitHub (Pull Requests et Issues).
- **Planification & Backlog** : élaboration du tableau de bord sprint Semaine 1 couvrant les responsabilités des rôles P1 à P5, avec critères d'acceptation et estimations dans [backlog-semaine-1.md](project-management/backlog-semaine-1.md).
- **Sécurité Shift-Left (STRIDE & Gitleaks)** :
  - Rédaction de la modélisation complète des menaces dans [threat-model-stride.md](security/threat-model-stride.md) couvrant les 6 volets STRIDE et l'ensemble des composants de la plateforme.
  - Configuration de la détection de secrets via [.gitleaks.toml](../../.gitleaks.toml) et script d'audit multi-environnement, validé par un test d'injection de fausse clé synthétique avec échec immédiat.
- **Architecture & ADRs** : initialisation du registre [docs/adr/README.md](adr/README.md), rédaction complète de [ADR-003](adr/ADR-003.md) (Jenkins JCasC et agents dynamiques) et [ADR-008](adr/ADR-008.md) (Stratégie de branches et détection de secrets).
- **Intégration Continue (Jenkins & JCasC)** : formalisation de l'infrastructure as code pour Jenkins dans [ci/jenkins-casc.yaml](../../ci/jenkins-casc.yaml), `docker-compose-jenkins.yml`, et implémentation du pipeline déclaratif [ci/Jenkinsfile](../../ci/Jenkinsfile) supportant le scan anti-secrets et la compilation multi-microservices.

---

## 2. Inventaire des Livrables Produits

| Fichier / Dossier | Description & Rôle |
|---|---|
| `omnipay-app/.gitignore` | Exclusion stricte des binaires, logs, caches, fichiers d'IDE et secrets |
| `omnipay-app/LICENSE` | Licence d'usage académique et clause de simulation |
| `omnipay-app/CONTRIBUTING.md` | Guide de contribution, stratégie de branches et Conventional Commits |
| `omnipay-app/.github/PULL_REQUEST_TEMPLATE.md` | Modèle de PR avec checklist de sécurité et revue par les pairs |
| `omnipay-app/.github/ISSUE_TEMPLATE/*.md` | Modèles d'issues standardisés (`task`, `bug_report`, `security_issue`) |
| `omnipay-app/.gitleaks.toml` | Règles de détection de secrets et gestion de l'allowlist |
| `omnipay-app/ci/scripts/audit-secrets.ps1` | Script d'audit de secrets (PowerShell) avec fallback regex interne |
| `omnipay-app/ci/scripts/audit-secrets.sh` | Script d'audit de secrets POSIX pour agents Jenkins Linux |
| `omnipay-app/ci/jenkins-casc.yaml` | Configuration as Code déclarative pour contrôleur Jenkins (numExecutors: 0) |
| `omnipay-app/ci/docker-compose-jenkins.yml` | Déploiement reproductible du contrôleur Jenkins avec volume JCasC |
| `omnipay-app/ci/Jenkinsfile` | Pipeline CI déclaratif (Checkout, Env, Gitleaks, Build & Test Maven, Clean) |
| `omnipay-app/docs/architecture/project-overview.md` | Vue d'ensemble de l'architecture fonctionnelle et technique |
| `omnipay-app/docs/security/threat-model-stride.md` | Modélisation des menaces STRIDE et matrice de remédiation |
| `omnipay-app/docs/security/gitleaks.md` | Guide de référence et procédures opérationnelles de Gitleaks |
| `omnipay-app/docs/adr/README.md` | Registre global des 10 ADRs du projet |
| `omnipay-app/docs/adr/ADR-003.md` | Décision d'architecture : Choix du moteur CI Jenkins JCasC |
| `omnipay-app/docs/adr/ADR-008.md` | Décision d'architecture : Gestion de branches et détection de secrets |
| `omnipay-app/docs/runbooks/ci-troubleshooting.md` | Guide de dépannage opérationnel pour le pipeline CI |
| `omnipay-app/docs/project-management/backlog-semaine-1.md` | Backlog détaillé pour les rôles P1 à P5 |
| `omnipay-app/README.md` | Documentation principale du dépôt applicatif |
| `omnipay-gitops/.gitignore` | Configuration d'exclusion pour le dépôt GitOps |
| `omnipay-gitops/README.md` | Documentation de l'état désiré du cluster et topologie GitOps |
| `README.md` (racine) | Point d'entrée général de l'espace de travail |

---

## 3. État Git et GitHub

- **Dépôts locaux initialisés** :
  - `omnipay-app` : branche active `develop`, branche `main` créée. Premier commit `2b4086e` conforme au format Conventional Commits.
  - `omnipay-gitops` : branche active `main`. Premier commit `d681efe`.
- **Règles de branches documentées** :
  - `main` : miroir de production, fusions directes interdites, PR requise.
  - `develop` : intégration continue principale.
  - `feature/*`, `fix/*`, `security/*`, `docs/*` : branches éphémères.
- **Opérations distantes nécessitant validation humaine** :
  - Création des dépôts sur l'organisation GitHub (`https://github.com/omnipay-org/omnipay-app` et `omnipay-gitops`).
  - Configuration des règles de protection de branches dans GitHub Settings (Require PR reviews, Require status checks).
  - Ajout du secret `HARBOR_ROBOT_PASSWORD` et credentials Jenkins.

---

## 4. Sécurité : STRIDE & Gitleaks

### Synthèse Threat Model STRIDE
L'ensemble des composants a été évalué face aux 6 vecteurs d'attaque :
1. **Spoofing** : Rejeté via signature Cosign sur Harbor (STRIDE-S3) et validation de tokens (STRIDE-S1).
2. **Tampering** : Prévention via protection des branches Git (STRIDE-T1), requêtes paramétrées JPA (STRIDE-T2) et self-healing ArgoCD (STRIDE-T3).
3. **Repudiation** : Traçabilité assurée par journalisation Loki et immuabilité des commits GitOps (STRIDE-R3).
4. **Information Disclosure** : Zéro secret statique dans Git via Gitleaks (STRIDE-I1) et rotation Vault (STRIDE-I2).
5. **Denial of Service** : Rate limiting Ingress (STRIDE-D1), limites Helm (STRIDE-D2) et rollback automatique Canary (STRIDE-D3).
6. **Elevation of Privilege** : Pod Security Standards Restricted (STRIDE-E1) et détection runtime Falco (STRIDE-E3).

### Validation pratique de la détection de secrets
- Audit sur l'arbre complet du dépôt : **0 secret détecté** (`audit-secrets.ps1` exit code 0).
- Injection d'une chaîne synthétique fictive (`api_key = "1234...[SYNTHETIC_TEST_KEY]..."`) dans `tests/security/` :
  - **Résultat** : Détection immédiate du pattern à la ligne 2.
  - **Code retour** : 1 (blocage immédiat de la CI).
  - **Nettoyage** : Fichier supprimé et historique vérifié propre.

---

## 5. Configuration Jenkins & Pipeline

- **JCasC (`ci/jenkins-casc.yaml`)** :
  - `numExecutors: 0` sur le contrôleur (renforcement DevSecOps, pas d'exécution locale de code non contrôlé).
  - Déclaration du template d'agent Docker (`maven:3.9-eclipse-temurin-21`).
  - Gestion des credentials via variables d'environnement (`SONAR_TOKEN`, `HARBOR_ROBOT_PASSWORD`).
  - Configuration automatique du job `omnipay-app-ci` pointant sur `ci/Jenkinsfile`.
- **Pipeline Declaratif (`ci/Jenkinsfile`)** :
  - Stage 1 : Checkout SCM avec traçabilité du hash de commit.
  - Stage 2 : Vérification de l'environnement d'exécution de l'agent.
  - Stage 3 : Audit de secrets Gitleaks bloquant.
  - Stage 4 : Itération dynamique sur les 3 microservices (`services/auth`, `services/transaction`, `services/notification`) pour compiler et exécuter les tests dès présence de `pom.xml`.
  - Notifications standardisées en bloc `post` (success / failure / always).

---

## 6. Tableau Récapitulatif des Vérifications

| Vérification | Statut | Preuve & Observations |
|---|---|---|
| **Git & Conventions** | **PASS** | `git status` propre, commits initiaux conformes Conventional Commits sur les 2 dépôts. |
| **Gitleaks (Audit clean)** | **PASS** | Exécution de `audit-secrets.ps1 omnipay-app` : code de sortie 0, aucun secret. |
| **Gitleaks (Blocage test)** | **PASS** | Détection d'un faux secret synthétique de test : alerte levée et arrêt avec code 1. |
| **Jenkins JCasC** | **PASS** | Fichier `jenkins-casc.yaml` conforme aux spécifications JCasC (0 tabulations, indentation stricte). |
| **Docker Compose CI** | **PASS** | Fichier `docker-compose-jenkins.yml` prêt pour déploiement local. |
| **Maven Build** | **BLOCKED (en attente P2)** | L'arborescence des services est prête ; les fichiers `pom.xml` applicatifs doivent être livrés par P2. Le pipeline gère cette attente gracieusement. |
| **Maven Tests** | **BLOCKED (en attente P2)** | Suite de tests à implémenter par P2 lors de la livraison des services. |

---

## 7. Interfaces et Points de Dépendance avec les Autres Rôles

1. **Rôle P2 (Microservices Spring Boot & Helm)** :
   - P2 peut immédiatement déposer le code des services dans `services/auth`, `services/transaction` et `services/notification`.
   - Chaque service devra contenir son propre `pom.xml` et exposer `/actuator/health` pour s'intégrer nativement dans le `Jenkinsfile` de P1.
2. **Rôle P3 (Terraform, Ansible & K3s)** :
   - P3 utilisera les dossiers réservés `infra/terraform` et `infra/ansible`.
   - Les clés SSH et fichiers d'inventaire sensibles sont d'ores et déjà exclus par le `.gitignore` mis en place.
3. **Rôle P4 (Harbor, ArgoCD & Supply Chain)** :
   - P4 assurera la liaison avec le dépôt `omnipay-gitops`.
   - Les credentials Harbor déclarés dans `jenkins-casc.yaml` (`harbor-registry-creds`) seront alimentés lors du déploiement de Harbor.
4. **Rôle P5 (Prometheus, Grafana & Falco)** :
   - P5 s'appuiera sur les SLI et le Threat Model STRIDE documenté pour configurer les alertes Alertmanager et les règles Falco.

---

## 8. Prochaines Étapes : Transition vers la Semaine 2

1. **Publication GitHub** : Pousser les dépôts locaux vers les dépôts distants dès validation des accès par l'administrateur de l'équipe.
2. **Intégration SonarQube & Dependency-Check** : Enrichir le `Jenkinsfile` en Semaine 2 avec les Quality Gates SAST et SCA.
3. **Automatisation de la promotion GitOps** : Ajouter le stage de mise à jour automatique du tag d'image dans `omnipay-gitops` à la suite de la signature Cosign.
