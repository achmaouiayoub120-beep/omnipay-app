# Présentation de l'Architecture — OmniPay Zero-Trust

## 1. Vision et Objectifs

OmniPay Zero-Trust est une plateforme de démonstration simulant le système d'information d'une néobanque en ligne.
Le projet a pour vocation d'illustrer la **maîtrise du cycle de vie DevOps complet** :
- **Planifier** : Définition des critères d'acceptation, traçabilité des décisions d'architecture (ADR) et modélisation des menaces STRIDE.
- **Coder** : Conventional Commits, revues de code obligatoires, validation pre-commit anti-secrets avec Gitleaks.
- **Construire & Tester** : Intégration continue avec Jenkins (JCasC), analyse statique SonarQube, SBOM (Syft), audit des dépendances et signature cryptographique (Cosign).
- **Déployer** : Déploiement continu GitOps (ArgoCD), contrôle d'admission strict (Kyverno), déploiement progressif (Argo Rollouts Canary) et isolation réseau (NetworkPolicies).
- **Surveiller** : Observabilité unifiée (Prometheus, Grafana, Loki), détection runtime d'intrusions (Falco) et pilotage SRE par les SLO et budgets d'erreur.
- **Apprendre** : Post-mortems sans reproche, tests de résilience (Chaos Mesh) et amélioration continue via les métriques DORA.

---

## 2. Découpage Applicatif (Microservices)

Les microservices sont volontairement concis (<100 lignes) afin de concentrer l'effort sur la chaîne DevOps et DevSecOps :

1. **Auth Service (`services/auth/`)** :
   - Fournit l'authentification des clients bancaires.
   - Émet des jetons de session (JWT).
   - Expose `/actuator/health` et `/actuator/prometheus`.

2. **Transaction Service (`services/transaction/`)** :
   - Gère les virements et l'état des comptes.
   - Persiste les données dans PostgreSQL.
   - S'authentifie à PostgreSQL via des credentials dynamiques émis par Vault.

3. **Notification Service (`services/notification/`)** :
   - Notifie les utilisateurs lors de l'exécution d'un virement.
   - Simule l'envoi de mails et journaux d'audit.

---

## 3. Topologie des Dépôts Git

L'organisation repose sur deux dépôts distincts conformément aux standards GitOps :

- **`omnipay-app`** (Dépôt applicatif & CI) :
  - Code source des microservices
  - Fichiers de build Maven
  - Dockerfiles
  - Pipelines Jenkins & scripts CI
  - Code d'infrastructure Terraform & Ansible
  - Charts Helm
  - Documentation, ADR et runbooks

- **`omnipay-gitops`** (Dépôt d'état désiré du cluster) :
  - Manifestes déclaratifs K8s par environnement (`dev`, `recette`, `prod`)
  - Déclarations d'ApplicationSets ArgoCD
  - Politiques d'admission Kyverno
  - Définitions d'alertes et dashboards de monitoring

---

## 4. Matrice de Sécurité Zero-Trust

Le principe fondamental est : **« Ne jamais faire confiance, toujours vérifier »**.
- Tout commit doit respecter les Quality Gates.
- Toute image conteneur doit être signée et vérifiée à l'admission.
- Tout trafic réseau interne est refusé par défaut (`deny-all`).
- Aucun secret statique n'est toléré dans le code ni dans les configurations.
