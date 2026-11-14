# Registre des Décisions d'Architecture (ADR) — OmniPay Zero-Trust

Ce registre recense l'ensemble des décisions d'architecture (Architecture Decision Records) prises tout au long du cycle de vie du projet OmniPay Zero-Trust.

Chaque décision est documentée de manière immuable afin de préserver le contexte, les arbitrages, les alternatives étudiées et les impacts en matière de sécurité et de résilience.

---

## Registre complet des décisions du projet

| Numéro | Titre de la décision | Porteur | Statut | Date |
|---|---|---|---|---|
| [**ADR-001**](ADR-001.md) | Choix de la distribution Kubernetes légère K3s pour l'hébergement | P3 | Proposé | Semaine 1 |
| [**ADR-002**](ADR-002.md) | Choix du registre d'images privé sécurisé Harbor | P4 | Proposé | Semaine 1 |
| [**ADR-003**](ADR-003.md) | Choix du moteur d'intégration continue : Jenkins JCasC & agents dynamiques | P1 | **Accepté** | Semaine 1 |
| [**ADR-004**](ADR-004.md) | Choix du modèle de déploiement continu GitOps avec ArgoCD | P4 | Proposé | Semaine 2 |
| [**ADR-005**](ADR-005.md) | Sécurisation de la supply chain logicielle : SBOM Syft, Cosign & Kyverno | P4 | Proposé | Semaine 2 |
| [**ADR-006**](ADR-006.md) | Gestion dynamique des secrets avec HashiCorp Vault et Vault Agent | P3 | Proposé | Semaine 2 |
| [**ADR-007**](ADR-007.md) | Stratégie de déploiement progressif Canary avec Argo Rollouts | P4 | Proposé | Semaine 3 |
| [**ADR-008**](ADR-008.md) | Stratégie de branches, Conventional Commits et scan préventif Gitleaks | P1 | **Accepté** | Semaine 1 |
| [**ADR-009**](ADR-009.md) | Politique de micro-segmentation réseau Zero-Trust (NetworkPolicies deny-all) | P3 | Proposé | Semaine 3 |
| [**ADR-010**](ADR-010.md) | Observabilité pilotée par les SLO et alertes de consommation de budget d'erreur | P5 | Proposé | Semaine 2 |
