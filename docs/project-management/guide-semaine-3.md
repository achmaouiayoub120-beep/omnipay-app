# 🚀 Guide Détaillé & Planning Opérationnel — Semaine 3 (S3)
## Projet : OmniPay Zero-Trust (ESTC)
### Thème S3 : Sécurité Runtime, Secrets Dynamiques (Vault), Déploiement Canary, Front-end Bancaire & Tracing SRE

---

## 🎯 Vision & Objectif de la Semaine 3

> **Jalon Démontrable S3 (Fin de semaine) :**  
> 1. Un utilisateur bancaire accède au **Portail Web Front-end OmniPay** (`https://app.omnipay.local`), s'authentifie et effectue un virement en direct.
> 2. Les microservices consomment des **secrets dynamiques émis par HashiCorp Vault** (ou injectés via External Secrets) sans aucun mot de passe statique dans Git.
> 3. En production, une nouvelle version applicative est déployée via **Argo Rollouts (Canary)**. Une défaillance injectée est détectée par Prometheus, déclenchant un **Rollback automatique immédiat à 100% sans coupure de service (Démo 1)**.
> 4. **Falco** surveille le runtime K3s et lève une alerte de sécurité en cas de tentative de violation de conteneur.
> 5. Une requête bancaire est tracée de bout en bout (**Tracing distribué**) corrélant Métriques, Logs Loki et Traces sur Grafana.
> 6. L'alerte critique Alertmanager est reçue en temps réel sur le **canal de notification de l'équipe (Discord/Telegram)**.

---

## 👥 Matrice de Répartition des Tâches (P1 à P5)

| Rôle | Membre | Dépôt | Livrables Majeurs S3 | Branche de Travail |
|:---:|:---|:---:|:---|:---|
| **P1** | **Ayoub Achmaoui** | `omnipay-app` | Pipeline de promotion GitOps (dev/recette/prod), DAST OWASP ZAP, Démo 3 DevSecOps, ADR-008 versioning | `feature/pipeline-promotion-dast-s3` |
| **P2** | **Amira Adolf** | `omnipay-app` | Portail Web Front-end Bancaire (UI/SPA), Spring Security JWT RBAC, transactions idempotentes, Helm frontend | `feature/frontend-security-rbac-s3` |
| **P3** | **Aïcha El Mahdaoui** | `omnipay-app` & `omnipay-gitops` | Déploiement HashiCorp Vault / External Secrets, intégration secrets DB, sécurité runtime Falco, ADR-011 | `feature/vault-runtime-falco-s3` |
| **P4** | **Widad El Gharzaz** | `omnipay-gitops` | Orchestration Argo Rollouts Canary en Prod, script Démo 1 (Rollback auto), politiques Kyverno mutation/runtime | `feature/canary-rollouts-runtime-s3` |
| **P5** | **Moad Helkamel** | `omnipay-gitops` | Tracing distribué Tempo/OpenTelemetry, notifications Discord/Telegram Alertmanager, Chaos Engineering, Démo 5 | `feature/tracing-chaos-sre-s3` |

---

## 📋 Fiches Détaillées par Membre d'Équipe

---

### 🛡️ P1 — Ayoub Achmaoui (Chef Technique, Architecture & CI/CD DevSecOps)

#### Mission
Piloter la gouvernance des versions, automatiser la promotion des artefacts entre environnements (Promotion Pipeline GitOps), intégrer l'audit dynamique de sécurité applicative (DAST OWASP ZAP), et orchestrer la Démonstration 3 pour le jury.

#### Tâches Opérationnelles
1. **TSK-P1-12 : Automatisation de la Promotion GitOps Inter-Environnements**
   - Implémenter le script et le stage Jenkins permettant la promotion contrôlée :
     - Validation continue en `omnipay-dev`.
     - Promotion vers `omnipay-recette` après exécution réussie des tests d'intégration et smoke tests.
     - Promotion vers `omnipay-prod` déclenchée par la création d'un tag Git sémantique (`v1.x.x`) ou validation manuelle contrôlée.
   - Mise à jour automatique des `kustomization.yaml` cibles dans `omnipay-gitops`.

2. **TSK-P1-13 : Scan Dynamique DAST avec OWASP ZAP**
   - Intégrer un conteneur officiel OWASP ZAP Baseline Scan dans la chaîne CI.
   - Analyser au runtime les endpoints de `recette` pour détecter :
     - Faiblesses dans les en-têtes de sécurité HTTP (Content-Security-Policy, X-Frame-Options, HSTS).
     - Vulnérabilités de session, injections et failles CSRF.
   - Génération automatique des rapports `zap-report.html` et `zap-report.json` archivés dans Jenkins.

3. **TSK-P1-14 : Conception de la Démo 3 (Pipeline DevSecOps de Bout en Bout pour le Jury)**
   - Rédiger `demos/demo-3-devsecops-pipeline.md` détaillant la présentation du pipeline :
     - Scénario Échec 1 : Push d'un secret -> Bloqué par Gitleaks dès l'étape 1.
     - Scénario Échec 2 : Push d'une CVE critique -> Bloqué par Trivy / SonarQube.
     - Scénario Nominal : Build, tests JaCoCo >80%, SBOM Syft, signature Cosign, push Harbor et déploiement ArgoCD en < 3 minutes.

---

### 💻 P2 — Amira Adolf (Développeuse Backend, Microservices & Front-end Bancaire)

#### Mission
Développer le portail Web Front-end Bancaire pour la soutenance, renforcer la sécurité des microservices avec Spring Security et rôles RBAC, et implémenter la clé d'idempotence des transactions bancaires.

#### Tâches Opérationnelles
1. **TSK-P2-09 : Développement du Portail Web Front-end Client (`services/frontend/`)**
   - Créer une interface web moderne, élégante et responsive (HTML5, TailwindCSS, JavaScript moderne) :
     - **Écran de Connexion** : Authentification via l'API `/api/auth/login`.
     - **Tableau de Bord Bancaire** : Affichage du solde, des comptes et de l'historique des virements.
     - **Formulaire de Virement** : Envoi de transactions en temps réel vers `/api/transactions`.
     - **Boîte à Outils Soutenance (Jury Tools)** :
       - Bouton « Injecter 100 transactions de charge » pour animer les dashboards Grafana en direct.
       - Bouton « Simuler incident 500 » pour provoquer le rollback Argo Rollouts sous les yeux du jury.
   - Packaging dans un conteneur Nginx léger et durci (non-root, port 8080).

2. **TSK-P2-10 : Sécurisation RBAC & Validation JWT dans Spring Boot**
   - Sécuriser les microservices via Spring Security :
     - Rôles stricts : `ROLE_USER`, `ROLE_ADMIN`, `ROLE_AUDITOR`.
     - Validation cryptographique des jetons JWT sur chaque appel d'API.
     - Endpoints d'administration bancaire protégés contre les élévations de privilèges.

3. **TSK-P2-11 : Idempotence & Résilience des Transactions Bancaires**
   - Intégrer l'en-tête `X-Idempotency-Key` sur l'API de virement : en cas de timeout réseau ou de double-clic de l'utilisateur, la transaction n'est exécutée qu'une seule fois dans PostgreSQL.
   - Ajout des tests unitaires et d'intégration correspondants sous MockMvc.

---

### 🏛️ P3 — Aïcha El Mahdaoui (Ingénieure Infrastructure K3s, Secrets Vault & Falco)

#### Mission
Déployer et configurer HashiCorp Vault (ou External Secrets Operator) pour la rotation dynamique des secrets bancaires, durcir la plateforme K3s et installer le capteur de sécurité runtime Falco.

#### Tâches Opérationnelles
1. **TSK-P3-09 : Déploiement et Initialisation de HashiCorp Vault sur K3s**
   - Déployer Vault sur le cluster K3s via Helm dans le namespace `vault`.
   - Fournir un script d'automatisation `init-vault.sh` : initialisation, déverrouillage (unseal), activation du moteur `kv-v2` et de l'authentification `kubernetes`.
   - Création des rôles et politiques de sécurité pour `auth-service` et `transaction-service`.

2. **TSK-P3-10 : External Secrets Operator (ESO) ou Vault Agent**
   - Connecter Kubernetes à Vault pour injecter automatiquement les secrets sensibles (mot de passe PostgreSQL, secret JWT) sous forme de Secrets K8s natifs sans aucune intervention manuelle.
   - Bannissement définitif des secrets statiques en clair dans les manifests Git.

3. **TSK-P3-11 : Surveillance Runtime avec Falco (Intrusion Detection)**
   - Déployer Falco sur K3s (`platform/falco/` ou via Helm).
   - Configurer les règles de détection spécifiques à la conformité bancaire :
     - Alerte immédiate si un conteneur exécute un binaire inattendu (ex: `sh`, `bash`, `curl`, `netcat`).
     - Alerte en cas de lecture suspecte de répertoires sensibles (`/etc`, `/root`).
   - Rédiger **ADR-011** (Gestion dynamique des secrets au runtime et détection runtime Falco).

---

### 📦 P4 — Widad El Gharzaz (Ingénieure Supply Chain, Argo Rollouts & Kyverno Runtime)

#### Mission
Finaliser la stratégie de déploiement progressif Canary en production avec Argo Rollouts, automatiser la Démo 1 (Canary Rollback) pour la soutenance, et enrichir les politiques Kyverno au runtime.

#### Tâches Opérationnelles
1. **TSK-P4-09 : Orchestration Argo Rollouts Canary en Production**
   - Valider la stratégie Canary déclarative sur `transaction-service` dans `envs/prod/` :
     - Étape 1 : 10% du trafic dirigé vers la version Canary pendant 2 minutes.
     - Analyse Prometheus continue (`AnalysisTemplate` mesurant le taux d'erreur 5xx).
     - Étape 2 : Montée à 33%, puis 66%, puis 100% si l'analyse est au vert (`error-rate < 0.5%`).
     - **Rollback automatique** si le taux d'erreur dépasse le seuil critique (1%).

2. **TSK-P4-10 : Automatisation & Script de la Démo 1 pour le Jury**
   - Finaliser le script d'exécution `scripts/run-demo-canary.sh` :
     - Déploiement de la version saine `v1.0.0`.
     - Injection de la version régressée `v2-bad`.
     - Lancement du générateur de trafic et observation du Rollback automatique sur le dashboard Argo Rollouts (`localhost:3100`).

3. **TSK-P4-11 : Politiques Kyverno Runtime & Mutation**
   - Déployer une politique Kyverno de mutation injectant automatiquement les annotations de sécurité et labels Zero-Trust sur les nouveaux déploiements.
   - Politique bloquant formellement les `hostPath` et les capacités Linux dangereuses (`CAP_SYS_ADMIN`).
   - Rédiger **ADR-012** (Déploiement progressif Canary et stratégie de résilience en production).

---

### 📊 P5 — Moad Helkamel (Ingénieur SRE, Fiabilité, Tracing Distribué & Chaos)

#### Mission
Mettre en place le tracing distribué (Tempo / OpenTelemetry), connecter les webhooks Alertmanager aux canaux de notification réels (Discord / Telegram), et préparer les scénarios de Chaos Engineering pour le GameDay (Démo 5).

#### Tâches Opérationnelles
1. **TSK-P5-09 : Tracing Distribué de Bout en Bout (OpenTelemetry / Tempo)**
   - Activer le traçage des requêtes bancaires traversant :
     `Frontend UI` ➔ `Ingress NGINX` ➔ `Auth Service` ➔ `Transaction Service` ➔ `PostgreSQL`.
   - Visualiser sur Grafana le cheminement complet d'une transaction avec les durées d'exécution détaillées par service (détection instantanée des goulots d'étranglement).

2. **TSK-P5-10 : Raccordement Réel des Webhooks Alertmanager**
   - Configurer l'URL de webhook Discord ou Telegram dans `values-prometheus.yaml`.
   - Valider la réception d'alertes enrichies (nom du service, criticité, description, lien direct vers le dashboard Grafana) sur smartphone et PC lors d'un incident.

3. **TSK-P5-11 : Chaos Engineering & Validation Démo 5 (GameDay SRE)**
   - Préparer les scripts d'injection de perturbations :
     - Simulation de dégradation réseau (latence de 500ms sur la base de données).
     - Kill aléatoire de pods sous une charge continue générée par k6.
   - Démontrer au jury la résilience du système et la tenue du contrat SLO (99.5% de disponibilité garantie).
   - Dashboard exécutif Grafana consolidant les 4 métriques DORA.

---

## 📅 Planning Prévisionnel de la Semaine 3

```
  Jours      P1 (CI/CD)          P2 (App & UI)         P3 (Infra & Vault)   P4 (Rollouts)         P5 (SRE)
 ─────────  ─────────────────   ────────────────────  ───────────────────  ───────────────────   ───────────────────
  Jour 1     Promotion GitOps    Frontend UI (Maquette) Vault Setup (K3s)    Argo Rollouts Prod    Tracing Tempo Init
  Jour 2     DAST OWASP ZAP      Connexion API & Auth   Init Vault / Secrets Test Canary Traffic   Webhook Alertmanager
  Jour 3     Pipeline complet    Virement & Idempotence ESO / Kubernetes     Script Démo 1         Tests Chaos k6
  Jour 4     Démo 3 (DevSecOps)  Conteneur Nginx UI     Falco Runtime        Kyverno Mutation      GameDay Démo 5
  Jour 5     Revue & Merges PRs  Revue & Merges PRs    Revue & Merges PRs   Revue & Merges PRs    Revue & Merges PRs
```

---

## 🎯 Définition de Terminé (DoD) pour la Semaine 3

- [ ] Le portail Web Bancaire OmniPay est accessible via Ingress et permet de réaliser des transactions en direct.
- [ ] Aucun mot de passe statique n'est présent dans les manifests : Vault ou External Secrets gère les credentials dynamiques.
- [ ] La Démo 1 (Canary Rollback automatique) est testée et reproductible en une commande.
- [ ] La Démo 3 (Pipeline DevSecOps bloquant sur failles) est documentée et validée.
- [ ] La Démo 5 (GameDay SRE avec alerte instantanée Discord/Telegram) est prête pour le jury.
- [ ] 100% des Pull Requests sont revues et fusionnées sur `develop` et `main` avec zéro secret détecté.
