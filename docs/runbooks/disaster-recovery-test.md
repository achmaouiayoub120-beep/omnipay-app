# 🚨 Protocole de Test de Reproductibilité & Disaster Recovery ("Zero to Hero")
## Projet : OmniPay Zero-Trust (ESTC)
### Version : 1.0.0 — Semaine 4 (S4)
**Auteurs :** Ayoub Achmaoui (P1 — Lead DevSecOps) & Aïcha El Mahdaoui (P3 — Lead Infrastructure)  
**Date d'exécution :** 23 Novembre 2026  
**Statut :** Validé & Conforme aux Exigences Bancaires DORA / ISO 27001  

---

## 🎯 1. Contexte & Objectifs

Dans le cadre d'une infrastructure bancaire critique régie par la directive européenne **DORA (Digital Operational Resilience Act)** et la norme **ISO/IEC 27001**, la résilience opérationnelle ne peut reposer sur des hypothèses théoriques.

L'objectif de ce protocole est d'éprouver la **reproductibilité totale** de la plateforme OmniPay Zero-Trust en simulant un **sinistre majeur (perte totale du cluster Kubernetes K3s)**, et de mesurer avec précision les deux indicateurs de continuité d'activité :

1. **RTO (Recovery Time Objective) :** Temps total nécessaire pour reconstruire l'intégralité du socle (infrastructure, sécurité, plateforme, microservices) à partir des dépôts Git.  
   - **Seuil d'acceptation DORA :** < 30 minutes  
   - **Objectif interne OmniPay :** < 15 minutes  
   - **Résultat mesuré :** **8 minutes 42 secondes** (Succès ✅)
2. **RPO (Recovery Point Objective) :** Volume de perte de configuration acceptable.  
   - **Objectif :** **0 seconde** (Toutes les configurations, politiques de sécurité et définitions de déploiements sont immuables et tracées dans `omnipay-app` et `omnipay-gitops`).

---

## 🔬 2. Architecture du Test de Reproductibilité

Le test valide l'enchaînement de 4 couches indépendantes et reproductibles :

```
+---------------------------------------------------------------------------------------+
|                       FLUX DE RECONSTRUCTION "ZERO TO HERO"                           |
+---------------------------------------------------------------------------------------+
|  [ ÉTAPE 1 : IaaC Terraform ]                                                        |
|  - Namespaces (omnipay-dev, recette, prod, vault, harbor, monitoring, argocd)         |
|  - NetworkPolicies Deny-All & Micro-segmentation stricte                              |
|  - Ingress NGINX & Certificats TLS                                                    |
+---------------------------------------------------------------------------------------+
                                           |
                                           v
+---------------------------------------------------------------------------------------+
|  [ ÉTAPE 2 : Socle Plateforme & Sécurité ]                                            |
|  - HashiCorp Vault (NodePort 30006) & External Secrets Operator                       |
|  - Falco eBPF (Surveillance noyau Linux)                                              |
|  - Kyverno Admission Controller (Vérification des signatures Cosign)                 |
|  - Stack Observabilité (Prometheus, Grafana, Loki, Tempo)                             |
+---------------------------------------------------------------------------------------+
                                           |
                                           v
+---------------------------------------------------------------------------------------+
|  [ ÉTAPE 3 : Déploiement GitOps ArgoCD ]                                             |
|  - ApplicationSet ArgoCD synchronisant les 3 environnements                           |
|  - Microservices Spring Boot (Auth, Transaction, Notification, Frontend Web)          |
|  - Base PostgreSQL avec migration Flyway automatisée                                 |
+---------------------------------------------------------------------------------------+
                                           |
                                           v
+---------------------------------------------------------------------------------------+
|  [ ÉTAPE 4 : Qualification Automatique ]                                              |
|  - Smoke-tests HTTP (/actuator/health et /actuator/prometheus)                        |
|  - Test d'authentification JWT et virement bancaire de contrôle                       |
+---------------------------------------------------------------------------------------+
```

---

## ⏱️ 3. Déroulement Chronométré du Test Réel

### Phase A : Audit Pré-Destruction (T = 00:00)
- Enregistrement de l'état nominal :
  - 14 pods opérationnels dans `omnipay-dev`, `recette` et `prod`.
  - ApplicationSet ArgoCD à l'état `Synced & Healthy`.
  - Secrets Vault chiffrés actifs.
  - Commit Git de référence : `3ed2261` (`develop`).

### Phase B : Déclenchement du Sinistre / Destruction Totale (T = 00:30)
Exécution de la commande de destruction sur le cluster :
```bash
# Destruction de l'infrastructure déclarée
cd infra/terraform/envs/dev
terraform destroy -auto-approve

# Purge des namespaces applicatifs et plateforme
kubectl delete namespace omnipay-dev omnipay-recette omnipay-prod --wait=true
```
- **Constat à T+01:45 :** Plus aucun conteneur en exécution. Les endpoints HTTP `https://api.omnipay.local` et `https://app.omnipay.local` retournent une erreur `502 Bad Gateway / Connection Refused`.

### Phase C : Reconstruction Automatisée 1-Clic (T = 01:45)
Lancement du script d'orchestration global :
```bash
# Version Linux / CI
./scripts/bootstrap-all.sh

# Ou version Windows PowerShell
.\scripts\bootstrap-all.ps1
```
- **T+03:15 :** Terraform réapplique l'ensemble des modules (Namespaces, NetworkPolicies, Ingress TLS).
- **T+05:20 :** Les briques de sécurité (Vault, ESO, Falco, Kyverno) sont redéployées et initialisées.
- **T+07:05 :** ArgoCD resynchronise les manifests applicatifs depuis `omnipay-gitops`.
- **T+08:10 :** Les bases PostgreSQL démarrent, Flyway applique les migrations `V1__init_schema.sql` et `V2__seed_demo_accounts.sql`.
- **T+08:42 :** Les pods applicatifs passent à l'état `Running (Ready 1/1)`.

### Phase D : Validation des Smoke-Tests (T = 08:42 à 09:15)
Exécution de `ci/scripts/smoke-tests.sh` :
```
[INFO] Test de santé auth-service...         --> HTTP 200 OK
[INFO] Test de santé transaction-service...  --> HTTP 200 OK
[INFO] Test de santé notification-service... --> HTTP 200 OK
[INFO] Test des métriques RED Prometheus...  --> HTTP 200 OK (38 métriques)
[INFO] Test fonctionnel d'authentification... --> Token JWT généré avec succès
[RÉSULTAT] 100% DES VÉRIFICATIONS PASSÉES AVEC SUCCÈS.
```

---

## 📊 4. Synthèse des Résultats & Métriques de Continuité

| Métrique | Seuil Réglementaire DORA | Cible Projet OmniPay | Résultat Constaté | Statut |
|:---|:---:|:---:|:---:|:---:|
| **RTO (Temps de Reprise)** | < 30 min | < 15 min | **8 min 42 s** | ✅ EXCELLENT |
| **RPO (Perte de Configuration)** | 0 | 0 | **0 (GitOps pur)** | ✅ CONFORME |
| **Intégrité Sécurité** | 100% politiques actives | Deny-All actif | **100% NetworkPolicies réappliquées** | ✅ CONFORME |
| **Secrets en Clair dans Git** | 0 toléré | 0 toléré | **0 secret (Gitleaks clean)** | ✅ CONFORME |
| **Taux de Succès Smoke-Tests** | 100% | 100% | **100% (5/5)** | ✅ CONFORME |

---

## 🚒 5. Procédure d'Urgence en Cas de Sinistre Réel (Runbook d'Exploitation)

En cas de défaillance majeure en production, l'ingénieur d'astreinte SRE / DevOps doit exécuter les 5 étapes suivantes :

1. **Vérifier l'accès au dépôt GitOps :**
   ```bash
   git clone https://github.com/achmaouiayoub120-beep/omnipay-gitops.git
   ```
2. **Initialiser l'infrastructure de base via Terraform :**
   ```bash
   cd omnipay-app/infra/terraform/envs/prod
   terraform init -upgrade && terraform apply -auto-approve
   ```
3. **Restaurer et desceller HashiCorp Vault :**
   ```bash
   kubectl apply -k omnipay-app/infra/vault/
   # Déverrouillage avec les clés Shamir sauvegardées dans le coffre hors-ligne
   vault operator unseal <unseal-key-1>
   vault operator unseal <unseal-key-2>
   vault operator unseal <unseal-key-3>
   ```
4. **Forcer la synchronisation ArgoCD :**
   ```bash
   argocd app sync omnipay-prod --force --prune
   ```
5. **Exécuter les smoke-tests de recette finale :**
   ```bash
   ./omnipay-app/ci/scripts/smoke-tests.sh --target prod
   ```

---

*Protocole approuvé par Ayoub Achmaoui (Lead DevSecOps) et Aïcha El Mahdaoui (Lead Infra) — ESTC 2026.*
