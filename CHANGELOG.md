# 📜 Changelog Officiel — OmniPay Zero-Trust

Toutes les modifications notables apportées à ce projet sont documentées dans ce fichier.  
Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/) et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

---

## [1.0.0] — 2026-11-23 (Semaine 4 — Final Release & Clôture Soutenance)

### 🎉 Version Majeure de Soutenance Finale (Grand Oral ESTC)
Cette version consolide 4 semaines de développement et d'ingénierie DevSecOps continue par l'équipe d'Ayoub Achmaoui (P1), Amira Adolf (P2), Aïcha El Mahdaoui (P3), Widad El Gharzaz (P4) et Moad Helkamel (P5).

### Ajouté (Added)
- **Reproductibilité & Bootstrap 1-Clic (P1 & P3) :**
  - Script d'orchestration maître `scripts/bootstrap-all.sh` et `scripts/bootstrap-all.ps1` ("Zero to Hero" en < 15 minutes).
  - Validation du test de destruction et reconstruction totale `terraform destroy && apply` avec un RTO mesuré de **8m42s** et un RPO de 0.
  - Runbook officiel de Disaster Recovery (`docs/runbooks/disaster-recovery-test.md`).
- **Outillage & Répétition des 5 Démonstrations Jury :**
  - Démo 1 : Script Canary Rollback automatique (`scripts/run-demo-canary.sh` / `run-demo-1-canary-live.sh` - P4).
  - Démo 2 : Admission Control Kyverno et rejet de signature (`scripts/test-admission-gate.sh` / `run-demo-2-kyverno-live.sh` - P4).
  - Démo 3 : Script interactif du Pipeline DevSecOps complet (`ci/scripts/run-demo-3-live.sh` et `.ps1` - P1).
  - Démo 4 : Injection dynamique de secrets Vault et alertes d'intrusion Falco eBPF (`infra/falco/scripts/trigger-falco-alerts.sh` - P3).
  - Démo 5 : GameDay Chaos Engineering live et tracing distribué Grafana Tempo (`platform/monitoring/scripts/run-demo-5-live.sh` - P5).
- **Supports de Soutenance & Gouvernance :**
  - Slide deck complet de 24 slides minuté pour 30 minutes de présentation (`docs/soutenance/slides-soutenance-omnipay.md`).
  - Fiche mémo oral et réponses préparées aux questions pièges pour le Lead DevSecOps (`docs/soutenance/memo-oral-p1.md`).
  - Architecture Decision Records :
    - `ADR-014` : Stratégie de Reproductibilité Totale & Disaster Recovery ("Zero to Hero").
    - `ADR-015` : Gouvernance de Release v1.0.0 & Traçabilité Réglementaire Bancaire (PCI-DSS, DORA, ISO 27001).
- **Automatisation de Release :**
  - Script de contrôle et de pose de tag sémantique `scripts/release-v1.sh` et `scripts/release-v1.ps1`.

---

## [0.3.0] — 2026-11-21 (Semaine 3 — S3)

### Ajouté (Added)
- **CI/CD & DAST (P1) :**
  - Pipeline de promotion GitOps multi-environnements (`dev` ➔ `recette` ➔ `prod`) dans `ci/Jenkinsfile`.
  - Scan de vulnérabilités dynamiques au runtime OWASP ZAP Baseline (`ci/scripts/scan-dast-zap.sh` et `.ps1`).
  - Smoke-tests HTTP post-déploiement (`ci/scripts/smoke-tests.sh` et `.ps1`).
  - Guide Démo 3 (`demos/demo-3-devsecops-pipeline.md`).
- **Application & Frontend Web (P2) :**
  - Portail Web Bancaire complet (Single Page Application réactive) dans `services/frontend/`.
  - Sécurisation Spring Security RBAC JWT avec rôles `CLIENT` et `ADMIN`.
  - Idempotence bancaire via l'en-tête `X-Idempotency-Key` sur `POST /api/transactions`.
  - Chart Helm `frontend` et intégration NGINX Ingress.
- **Sécurité Runtime & Secrets (P3) :**
  - Déploiement de HashiCorp Vault (NodePort 30006) et External Secrets Operator (ESO).
  - Surveillance noyau Linux en temps réel via le capteur eBPF Falco.
  - Guide Démo 4 (`demos/demo-4-vault-falco-runtime.md`) et `ADR-011`.
- **Déploiements Canary & Admission Control (P4) :**
  - Orchestration de déploiements progressifs Argo Rollouts Canary (10% ➔ 33% ➔ 66% ➔ 100%) avec métriques Prometheus.
  - Politiques d'admission et mutation Kyverno pour la vérification des conteneurs.
  - Guide Démo 1 (`demo-1-canary-rollback.md`) et `ADR-012`.
- **Observabilité & SRE (P5) :**
  - Tracing distribué de bout en bout avec Grafana Tempo et OpenTelemetry.
  - Notifications temps réel Alertmanager via Webhook Discord / Telegram.
  - Scripts de Chaos Engineering (injection de latence et crash de pods).
  - Dashboard DORA Metrics et template de Post-Mortem (`ADR-013`).

---

## [0.2.0] — 2026-11-19 (Semaine 2 — S2)

### Ajouté (Added)
- Pipeline DevSecOps 11 étapes sous Jenkins JCasC (P1).
- Analyse de qualité de code SonarQube avec Quality Gate bloquante (P1 & P4).
- Audits de dépendances OWASP Dependency-Check et scan de conteneurs Trivy (P1).
- Signature cryptographique Cosign et génération SBOM Syft CycloneDX (P1 & P4).
- Persistance relationnelle PostgreSQL avec migrations versionnées Flyway (P2).
- Couverture de tests unitaires JaCoCo supérieure à 80% (P2).
- Modules Terraform K3s (namespaces, network, envs) et micro-segmentation NetworkPolicies (P3).
- Contrôleur Ingress NGINX avec terminaison TLS (P3).
- Registre privé Harbor avec scanner Trivy (NodePort 30002) (P4).
- ApplicationSet ArgoCD multi-environnements (`dev`, `recette`, `prod`) (P4).
- Stack d'observabilité Prometheus, Grafana Dashboards as Code et Loki (P5).

---

## [0.1.0] — 2026-11-15 (Semaine 1 — S1)

### Ajouté (Added)
- Socle CI/CD Jenkins JCasC avec build Maven multi-modules (P1).
- Intégration Shift-Left du scanner de secrets Gitleaks (P1).
- Microservices Spring Boot fondamentaux : `auth-service`, `transaction-service`, `notification-service` (P2).
- Provisioning initial du cluster K3s via Terraform et Ansible (P3).
- Dépôt GitOps `omnipay-gitops` initialisé avec ArgoCD (P4).
- Métriques Prometheus de base et exportateur Node Exporter (P5).
