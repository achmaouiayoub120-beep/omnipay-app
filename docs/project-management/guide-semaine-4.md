# 🚀 Guide Détaillé & Planning Opérationnel — Semaine 4 (S4) : Semaine Finale
## Projet : OmniPay Zero-Trust (ESTC)
### Thème S4 : Reproductibilité Totale, Résilience Chaos, Répétition Générale de Soutenance & Clôture v1.0.0

---

## 🎯 Vision & Objectif de la Semaine 4

> **Le Grand Oral & La Livraison Finale :**  
> La Semaine 4 (S4) est l'ultime jalon du projet OmniPay Zero-Trust. Toutes les briques d'infrastructure, de sécurité, de code applicatif, de CI/CD et d'observabilité conçues en S1, S2 et S3 doivent maintenant former un **système bancaire unifié, 100% reproductible, résilient sous chaos et démontrable en direct devant le jury**.

### Les 5 Piliers Stratégiques de S4 :
1. **Reproductibilité Totale ("From Zero to Production in 15 Minutes") :**  
   Validation du test ultime de l'Infrastructure-as-Code : destruction complète du cluster K3s (`terraform destroy`) et réinstanciation automatisée intégrale (`terraform apply` + bootstrap GitOps) sans aucune intervention manuelle.
2. **Chaos Engineering & Résilience Bancaire Globale (GameDay) :**  
   Test de résistance aux pannes croisées : arrêt inopiné de nœud/pods, saturation réseau, révocation de secrets Vault, tentative d'intrusion runtime Falco. Vérification de la continuité de service et de la préservation de l'intégrité des données bancaires.
3. **Répétition Générale des 5 Démonstrations Jury (Dry-Run 100% Outillé) :**  
   Calibrage et automatisation des 5 démonstrations scénarisées en live (Canary Rollback, Kyverno Gate, Pipeline DevSecOps, Vault/Falco Runtime, Tracing & Chaos SRE).
4. **Support de Soutenance & Storyline Captivante :**  
   Finalisation du slide deck de soutenance (20-25 slides, timing strict de 30 minutes + 15 min Q&A). Répartition rigoureuse des temps de parole (6 minutes par membre).
5. **Release Officielle v1.0.0 & Archivage Conforme :**  
   Merge final de `develop` vers `main` sur `omnipay-app`, pose des tags Git sémantiques `v1.0.0` sur les deux dépôts, et consolidation du rapport final de projet.

---

## 👥 Matrice de Répartition des Rôles & Responsabilités (S4)

| Rôle | Membre | Dépôt Principal | Branche S4 | Démo Assignée | Focus Majeur S4 |
|:---:|:---|:---:|:---|:---:|:---|
| **P1** | **Ayoub Achmaoui** | `omnipay-app` | `feature/soutenance-release-v1-s4` | **Démo 3** (Pipeline DevSecOps de bout en bout) | Orchestration globale, script de bootstrap 1-clic, slides soutenance, coordination du dry-run, Release v1.0.0. |
| **P2** | **Amira Adolf** | `omnipay-app` | `feature/e2e-load-polishing-s4` | **Support Live Démo** (Parcours Web Client/Admin) | Tests E2E complets, test de charge k6 (>100 VUs), polishing de l'interface SPA, idempotence des virements. |
| **P3** | **Aïcha El Mahdaoui** | `omnipay-app` | `feature/disaster-recovery-falco-s4` | **Démo 4** (Vault & Falco Runtime Security) | Validation du `terraform destroy && apply`, résilience Vault/ESO, scénarios d'alerte Falco eBPF, matrice Zero-Trust. |
| **P4** | **Widad El Gharzaz** | `omnipay-gitops` | `feature/canary-dryrun-harbor-s4` | **Démo 1 & Démo 2** (Canary Rollback & Kyverno Gate) | Répétition Canary sous charge, admission control Kyverno, validation multi-env ArgoCD, audit du registre Harbor. |
| **P5** | **Moad Helkamel** | `omnipay-gitops` | `feature/gameday-sre-dashboards-s4` | **Démo 5** (Tracing Tempo & GameDay Chaos) | GameDay Chaos live, validation du tracing distribué de bout en bout, alertes webhook en temps réel, dashboard DORA. |

---

## 📋 Fiches Détaillées par Membre d'Équipe

---

### 🛡️ P1 — Ayoub Achmaoui (Chef Technique, Architecture & CI/CD DevSecOps)

#### Mission S4 :
Garantir la livraison finale de la solution, automatiser la reconstruction complète du socle bancaire, orchestrer le déroulement de la soutenance, présenter le Pipeline DevSecOps (Démo 3) et assurer la conformité de la release v1.0.0.

#### Tâches Opérationnelles Détaillées :
1. **TSK-P1-16 : Script de Bootstrap Global Automatisé ("Zero to Hero")**
   - Créer `scripts/bootstrap-all.sh` et `scripts/bootstrap-all.ps1` à la racine de `omnipay-app` :
     - Étape 1 : Vérification des binaires requis (`terraform`, `kubectl`, `helm`, `cosign`, `syft`, `jq`).
     - Étape 2 : Déploiement de l'infrastructure via Terraform (`infra/terraform/envs/dev`, `recette`, `prod`).
     - Étape 3 : Bootstrap de la stack de plateforme (Harbor, Vault, ESO, Falco, Prometheus/Grafana, ArgoCD, Kyverno, Rollouts).
     - Étape 4 : Injection des secrets initiaux dans Vault.
     - Étape 5 : Déploiement des applications via ArgoCD (`ApplicationSet`).
     - Étape 6 : Exécution automatique des smoke-tests HTTP `/actuator/health`.
   - Affichage d'un récapitulatif visuel avec les URL Ingress et NodePorts de tous les services.

2. **TSK-P1-17 : Test de Reproductibilité Totale & Disaster Recovery**
   - Exécuter conjointement avec P3 le test de cycle de vie :
     ```bash
     cd infra/terraform/envs/dev && terraform destroy -auto-approve
     cd infra/terraform/envs/dev && terraform apply -auto-approve
     ```
   - Chronométrer le temps de reconstruction (RTO cible : < 15 minutes).
   - Documenter le protocole et les résultats dans `docs/runbooks/disaster-recovery-test.md`.

3. **TSK-P1-18 : Automatisation & Répétition de la Démo 3 (Pipeline DevSecOps)**
   - Répéter et fiabiliser les 3 scénarios de la Démo 3 pour le jury :
     - **Scénario A (Blocage Gitleaks)** : Injection d'un faux token AWS ou clé privée ➔ Arrêt immédiat en < 5s.
     - **Scénario B (Blocage SonarQube / CVE Trivy)** : Injection d'une dépendance vulnérable ➔ Quality Gate bloquante.
     - **Scénario C (Flux Nominal de Promotion)** : Commit propre ➔ Tests JaCoCo (>80%) ➔ Syft SBOM ➔ Cosign signature ➔ Harbor ➔ Déploiement Dev ➔ DAST OWASP ZAP en Recette ➔ Promotion Prod.
   - Script d'aide à la présentation : `ci/scripts/run-demo-3-live.sh` et `.ps1`.

4. **TSK-P1-19 : Support de Présentation Global (Slides de Soutenance)**
   - Rédiger le slide deck officiel dans `docs/soutenance/slides-soutenance-omnipay.md`.
   - Organiser les 24 slides selon la storyline d'audit et de cyber-résilience bancaire.
   - Définir les transitions de parole millimétrées entre les membres.

5. **TSK-P1-20 : Clôture de Release v1.0.0 & README Vitrine**
   - Fusionner `develop` dans `main` sur `omnipay-app` avec création du tag Git sémantique `v1.0.0`.
   - Apposer le tag `v1.0.0` sur `omnipay-gitops`.
   - Mettre à jour les `README.md` avec badges CI/CD, métriques JaCoCo/SonarQube, diagrammes d'architecture, et cartographie des ports.
   - Rédiger `docs/adr/ADR-014.md` (Reproductibilité Totale & Disaster Recovery).

---

### 💻 P2 — Amira Adolf (Développeuse Backend Spring Boot & Frontend Web)

#### Mission S4 :
Valider la robustesse fonctionnelle de bout en bout, soumettre les microservices à un test de charge k6 réaliste sous authentification JWT, peaufiner l'interface graphique bancaire et piloter le parcours utilisateur interactif lors de la soutenance.

#### Tâches Opérationnelles Détaillées :
1. **TSK-P2-14 : Tests End-to-End (E2E) & Polishing UI/UX**
   - Finaliser l'interface SPA (`services/frontend/src/`) :
     - Vérifier la fluidité des notifications toast (succès, rejet, solde insuffisant).
     - Rendre le tableau des transactions immédiatement réactif (rafraîchissement automatique après virement).
     - Intégrer un bouton de simulation d'attaque / injection de test pour la soutenance.
   - Valider la compatibilité multi-navigateurs et l'affichage plein écran sur vidéoprojecteur.

2. **TSK-P2-15 : Banc de Tests de Charge k6 Automatisé**
   - Développer le script de charge k6 dans `tests/load/k6-transactions-load.js` :
     - Phase 1 (Ramp-up) : 0 à 50 utilisateurs virtuels (VUs) en 30s.
     - Phase 2 (Plateau) : 50 à 150 VUs générant des requêtes de virement avec token JWT pendant 2 minutes.
     - Phase 3 (Ramp-down) : retour à 0 VU en 30s.
   - Scripts d'exécution : `tests/load/run-load-test.sh` et `run-load-test.ps1`.
   - Critères d'acceptation de charge :
     - Taux d'erreurs HTTP < 0.5%.
     - Latence p95 < 200 ms sur `POST /api/transactions`.
     - Intégrité des données vérifiée dans PostgreSQL (pas de solde négatif ni de transaction doublon).

3. **TSK-P2-16 : Validation de la Résilience Applicative & Idempotence**
   - Éprouver le mécanisme d'idempotence (`X-Idempotency-Key`) sous double-clic rapide du client web : une seule transaction doit être débitée.
   - Valider le comportement gracieux lors de la coupure temporaire de `notification-service` : les virements doivent continuer à être traités et mis en file d'attente (résilience découplée).

4. **TSK-P2-17 : Fiche Démo & Parcours Utilisateur Jury**
   - Rédiger `demos/demo-frontend-user-journey.md` :
     - Guide de manipulation en direct pour la soutenance (Comptes de test, identifiants, montants pré-configurés).
     - Démonstration du contrôle d'accès RBAC (ce que voit l'utilisateur `CLIENT` vs `ADMIN`).

---

### 🏗️ P3 — Aïcha El Mahdaoui (Ingénieure Infrastructure Cloud, Vault & Sécurité Runtime)

#### Mission S4 :
Prouver la reproductibilité absolue de l'infrastructure via Terraform, valider la tolérance aux pannes de Vault et de l'External Secrets Operator, et orchestrer la Démo 4 (Sécurité Runtime Falco eBPF et secrets dynamiques).

#### Tâches Opérationnelles Détaillées :
1. **TSK-P3-14 : Validation du Disaster Recovery (Test `terraform destroy && apply`)**
   - Réaliser le test complet de destruction/reconstruction de l'infrastructure :
     - Vérifier que les modules Terraform (`modules/namespaces`, `modules/network`) réappliquent les NetworkPolicies strictes (zéro trafic non autorisé entre namespaces).
     - S'assurer que le contrôleur Ingress NGINX et les certificats TLS autosignés sont régénérés sans erreur.
   - Rédiger la fiche de synthèse dans `docs/runbooks/disaster-recovery-test.md`.

2. **TSK-P3-15 : Test de Résilience HashiCorp Vault & External Secrets**
   - Créer `infra/vault/scripts/verify-vault-resilience.sh` et `.ps1` :
     - Scénario 1 : Simulation de Vault scellé (`vault operator seal`) ➔ Vérifier que les microservices continuent de fonctionner grâce au cache mémoire des secrets.
     - Scénario 2 : Unseal de Vault (`vault operator unseal`) ➔ Vérifier la reconnexion automatique d'External Secrets Operator (ESO).
     - Scénario 3 : Modification d'un mot de passe dans Vault ➔ Propagation automatique dans le Secret Kubernetes sans redémarrage manuel du cluster.

3. **TSK-P3-16 : Automatisation & Répétition de la Démo 4 (Vault & Falco Runtime)**
   - Répéter la Démo 4 pour la soutenance :
     - **Étape 1 (Secrets)** : Afficher la console Vault (`http://localhost:30006`), montrer la génération de secrets dynamiques chiffrés.
     - **Étape 2 (Tentative d'intrusion)** : Lancer un conteneur malveillant ou exécuter un shell interactif non autorisé (`kubectl exec -it <pod> -- /bin/sh`) ou tenter de lire `/etc/shadow`.
     - **Étape 3 (Détection Falco)** : Démontrer l'alerte immédiate levée par Falco eBPF dans les logs K3s et sur Grafana.
   - Script déclencheur : `infra/falco/scripts/trigger-falco-alerts.sh` et `.ps1`.

4. **TSK-P3-17 : Matrice de Conformité Sécurité Zero-Trust**
   - Documenter la matrice finale dans `docs/security/zero-trust-compliance-matrix.md` :
     - Couche Réseau : NetworkPolicies deny-all par défaut, isolation multi-environnements.
     - Couche Données : Chiffrement en transit (TLS) et au repos (Secrets Vault).
     - Couche Identité : RBAC Kubernetes minimal, ServiceAccounts dédiés.
     - Couche Runtime : Surveillance des appels système du noyau Linux via eBPF Falco.

---

### 📦 P4 — Widad El Gharzaz (Ingénieure Plateforme, Supply Chain Security & GitOps)

#### Mission S4 :
Garantir la stabilité de la chaîne de distribution continue GitOps avec ArgoCD, piloter les répétitions de la Démo 1 (Canary Rollout & Rollback) et de la Démo 2 (Gouvernance d'admission Kyverno), et certifier l'intégrité du registre Harbor.

#### Tâches Opérationnelles Détaillées :
1. **TSK-P4-14 : Répétition & Fiabilisation de la Démo 1 (Argo Rollouts Canary & Rollback)**
   - Calibrer le scénario de rollback automatique en production :
     - Déclenchement d'un déploiement Canary de `transaction-service:v2.0.0` (version simulant 50% d'erreurs HTTP 500).
     - Ouverture du dashboard Argo Rollouts (`localhost:3100`) devant le jury.
     - Observation des étapes : 10% de trafic routé vers la version canari.
     - Analyse Prometheus en temps réel : le taux d'erreur dépasse le seuil critique (> 2%).
     - Décision automatique de l'analyseur : avortement immédiat et rollback à 100% sur la version stable v1 en moins de 30 secondes.
   - Script de démonstration : `scripts/run-demo-1-canary-live.sh` et `.ps1`.

2. **TSK-P4-15 : Répétition de la Démo 2 (Admission Control Kyverno & Rejet de Signature)**
   - Fiabiliser le scénario de barrière d'admission :
     - Tentative 1 : Déploiement d'un pod avec une image non signée (`nginx:alpine` ou image forgée) ➔ **Rejet immédiat** par Kyverno avec message explicite au jury.
     - Tentative 2 : Déploiement d'un conteneur en mode `privileged: true` ou `runAsRoot: true` ➔ **Blocage immédiat** par la politique de sécurité des pods.
     - Tentative 3 : Déploiement d'une image signée par Cosign et issue du registre privé Harbor ➔ **Admission validée instantanément**.
   - Script d'exécution live : `scripts/run-demo-2-kyverno-live.sh` et `.ps1`.

3. **TSK-P4-16 : Audit de Santé GitOps & Nettoyage Harbor**
   - Vérifier que toutes les applications ArgoCD (`omnipay-dev`, `omnipay-recette`, `omnipay-prod`) sont à l'état `Synced` et `Healthy`.
   - Effectuer un nettoyage des artefacts temporaires dans Harbor (`harbor.omnipay.local:30002`).
   - S'assurer que le scanner de vulnérabilités Trivy intégré à Harbor est opérationnel.

4. **TSK-P4-17 : Fiche de Présentation GitOps & Supply Chain**
   - Rédiger `docs/gitops/jury-guide-supply-chain.md` : Guide de synthèse pour les membres du jury expliquant le flux Zero-Trust entre le commit, le registre immuable, la signature cryptographique et l'orchestration GitOps.

---

### 📊 P5 — Moad Helkamel (Ingénieur SRE, Observabilité & Chaos Engineering)

#### Mission S4 :
Valider l'observabilité globale en temps réel, piloter le GameDay Chaos live lors de la soutenance (Démo 5), démontrer la corrélation Traces-Logs-Métriques, et présenter les métriques DORA de la néobanque.

#### Tâches Opérationnelles Détaillées :
1. **TSK-P5-14 : Répétition Générale de la Démo 5 (GameDay Chaos & Tracing)**
   - Orchestrer le scénario GameDay live pour la soutenance :
     - **Étape 1 (Trafic nominal)** : Génération de trafic via k6, affichage de la trace distribuée dans Grafana Tempo (`http://localhost:30300`) reliant `frontend ➔ auth ➔ transaction ➔ notification ➔ postgres`.
     - **Étape 2 (Injection Chaos)** : Exécution du script de chaos injectant 300ms de latence et tuant aléatoirement un pod `transaction-service`.
     - **Étape 3 (Alerte & Détection)** : Déclenchement de l'alerte Alertmanager (Burn Rate d'erreur SLO).
     - **Étape 4 (Notification Live)** : Réception instantanée de l'alerte sur le canal de communication (Discord/Telegram).
   - Script d'exécution : `platform/monitoring/scripts/run-demo-5-live.sh` et `.ps1`.

2. **TSK-P5-15 : Finalisation des Dashboards Grafana as Code & DORA Metrics**
   - Valider la complétude et l'esthétique des dashboards Grafana :
     - **Dashboard 1 : OmniPay - Executive Overview & DORA Metrics** (Fréquence de déploiement, Délai de mise en prod, Taux d'échec des changements, RTO).
     - **Dashboard 2 : OmniPay - Golden Signals (RED Metrics)** (Rate, Errors, Duration par microservice).
     - **Dashboard 3 : OmniPay - Zero-Trust Security Dashboard** (Événements Falco, Rejets Kyverno, Audits de secrets).
   - Export des définitions JSON dans `platform/monitoring/dashboards/`.

3. **TSK-P5-16 : Rédaction du Post-Mortem Officiel du GameDay**
   - Finaliser le document d'analyse post-incident `docs/sre/post-mortem-gameday-s4.md` basé sur les résultats du test de chaos :
     - Résumé exécutif de l'incident simulé.
     - Chronologie exacte des événements (T0 détection, T+15s alerte, T+30s auto-guérison K8s).
     - Analyse des causes racines et plan d'actions préventives.

4. **TSK-P5-17 : Kit Graphique & Captures Haute Définition pour la Soutenance**
   - Réaliser un export propre des dashboards et visualisations clés pour intégration directe dans les slides de présentation de P1.

---

## ⏱️ Chronogramme & Scénario du Dry-Run de Soutenance (30 min)

La soutenance dure **30 minutes chrono** (suivie de 15 minutes de questions/réponses avec le jury).  
Chaque membre dispose de **6 minutes précises** combinant discours stratégique et démonstration technique en direct.

```
+----------------------------------------------------------------------------------------------------+
|                                    CHRONOGRAMME SOUTENANCE OMNIPAY (30 MIN)                         |
+-------------------+--------------------+--------------------+--------------------+-----------------+
|   P1 (0 - 6 min)  |   P2 (6 - 12 min)  |  P3 (12 - 18 min)  |  P4 (18 - 24 min)  | P5 (24 - 30 min)|
|                   |                    |                    |                    |                 |
| - Introduction    | - Architecture App | - Socle Infra K3s  | - Supply Chain     | - Observabilité |
|   Vision & Enjeux |   Spring Boot & UI | - Terraform & NetP |   Harbor & Cosign  |   Full-Stack    |
| - Pipeline CI/CD  | - Démo Web Client  | - Secrets Vault    | - GitOps Multi-Env | - Tracing Tempo |
|   DevSecOps       | - Tests de charge  | - Démo 4 : Falco   | - Démo 1 : Canary  | - Démo 5 :      |
| - Démo 3 (Live)   |   k6 (150 VUs)     |   Runtime & eBPF   | - Démo 2 : Kyverno |   GameDay SRE   |
+-------------------+--------------------+--------------------+--------------------+-----------------+
                                      |
                                      v
                 [ 15 MINUTES QUESTIONS / RÉPONSES AVEC LE JURY ]
```

### Déroulement Minute par Minute :

#### 1. P1 — Ayoub Achmaoui (00:00 - 06:00) : Vision Globale & Pipeline DevSecOps
- **00:00 - 02:00 :** Introduction du projet OmniPay Zero-Trust. Problématique bancaire : concilier agilité de livraison et tolérance zéro sur la sécurité.
- **02:00 - 05:00 :** **DÉMO 3 LIVE** : Démonstration du pipeline Jenkins 11 stages. Injection d'une vulnérabilité/secret (blocage immédiat) puis passage d'un commit conforme avec signature Cosign et audit DAST OWASP ZAP.
- **05:00 - 06:00 :** Transition vers l'architecture applicative et passage de parole à Amira (P2).

#### 2. P2 — Amira Adolf (06:00 - 12:00) : Architecture Métier & Expérience Client
- **06:00 - 08:00 :** Présentation de l'architecture microservices (Auth, Transaction, Notification) et de la sécurisation JWT RBAC.
- **08:00 - 10:30 :** **DÉMO FRONTEND LIVE** : Connexion au portail web bancaire (`https://app.omnipay.local`). Exécution d'un virement sécurisé en direct. Démonstration du rejet pour solde insuffisant et de l'idempotence des requêtes.
- **10:30 - 12:00 :** Lancement en arrière-plan du test de charge k6 (150 VUs) pour alimenter le monitoring de P5 et passage de parole à Aïcha (P3).

#### 3. P3 — Aïcha El Mahdaoui (12:00 - 18:00) : Infrastructure Cloud & Sécurité Runtime
- **12:00 - 14:00 :** Présentation du socle d'infrastructure (Terraform, Ingress TLS, micro-segmentation réseau par NetworkPolicies strictes). Preuve de reproductibilité ("Zero to Hero").
- **14:00 - 17:30 :** **DÉMO 4 LIVE** : Console HashiCorp Vault montrant l'injection dynamique des secrets sans stockage statique. Déclenchement d'un événement suspect (tentative de shell / lecture système) et capture instantanée de l'alerte par le capteur Falco eBPF.
- **17:30 - 18:00 :** Conclusion sur la posture Zero-Trust au runtime et passage de parole à Widad (P4).

#### 4. P4 — Widad El Gharzaz (18:00 - 24:00) : Supply Chain Security & Déploiements Continus
- **18:00 - 19:30 :** Présentation de la chaîne d'approvisionnement logicielle sécurisée (Harbor, SBOM CycloneDX, vérification des signatures Cosign).
- **19:30 - 21:30 :** **DÉMO 2 LIVE** : Admission Control Kyverno. Tentative de déploiement d'une image non signée (rejet immédiat par le webhook de validation).
- **21:30 - 23:30 :** **DÉMO 1 LIVE** : Déploiement progressif Canary avec Argo Rollouts. Injection d'une version instable ➔ Détection automatique de la dégradation par Prometheus ➔ Rollback automatique à 100% sans intervention humaine.
- **23:30 - 24:00 :** Présentation de la synchronisation GitOps multi-environnements et passage de parole à Moad (P5).

#### 5. P5 — Moad Helkamel (24:00 - 30:00) : Observabilité, Chaos Engineering & DORA
- **24:00 - 26:00 :** Présentation de la stack d'observabilité unifiée (Prometheus, Grafana, Loki, Tempo). Démonstration du tracing distribué montrant le parcours complet d'une transaction générée par le test k6 d'Amira.
- **26:00 - 28:30 :** **DÉMO 5 LIVE** : GameDay SRE. Injection de latence / panne sous charge. Visualisation en temps réel de l'impact sur le dashboard Golden Signals et réception instantanée de l'alerte critique sur Discord/Telegram.
- **28:30 - 30:00 :** Présentation du Dashboard DORA Metrics (performance opérationnelle de l'équipe) et conclusion générale de la présentation.

---

## 🛠️ Plan d'Action Immédiat (Checklist S4)

### Étape 1 : Initialisation & Création des Branches (Jour 1)
- [ ] P1 : Créer `feature/soutenance-release-v1-s4` sur `omnipay-app`.
- [ ] P2 : Créer `feature/e2e-load-polishing-s4` sur `omnipay-app`.
- [ ] P3 : Créer `feature/disaster-recovery-falco-s4` sur `omnipay-app`.
- [ ] P4 : Créer `feature/canary-dryrun-harbor-s4` sur `omnipay-gitops`.
- [ ] P5 : Créer `feature/gameday-sre-dashboards-s4` sur `omnipay-gitops`.

### Étape 2 : Production des Livrables Techniques (Jours 2 - 3)
- [ ] P1 : Écrire `scripts/bootstrap-all.sh` et `slides-soutenance-omnipay.md`.
- [ ] P2 : Écrire `tests/load/k6-transactions-load.js` et peaufiner le frontend web.
- [ ] P3 : Écrire `verify-vault-resilience.sh` et `trigger-falco-alerts.sh`.
- [ ] P4 : Écrire `run-demo-1-canary-live.sh` et `run-demo-2-kyverno-live.sh`.
- [ ] P5 : Écrire `run-demo-5-live.sh` et finaliser le dashboard DORA Metrics.

### Étape 3 : Tests Croisés & Reproductibilité (Jour 4)
- [ ] Test conjoint P1 & P3 : `terraform destroy && apply` et mesure du RTO.
- [ ] Test croisé P2 & P5 : Test de charge k6 + capture des traces Tempo et métriques Grafana.
- [ ] Test croisé P4 & P5 : Démo Canary sous charge k6 avec métriques Prometheus.

### Étape 4 : Répétition Générale (Dry-Run Soutenance) (Jour 5)
- [ ] Répétition chronométrée de bout en bout (30 minutes strictes).
- [ ] Ajustement des enchaînements et validation du fonctionnement des 5 démonstrations live.
- [ ] Session de questions/réponses pièges entre les membres.

### Étape 5 : Clôture & Release Officielle v1.0.0 (Jour 6)
- [ ] Revue et validation de toutes les PRs S4.
- [ ] Merge final de `develop` vers `main` sur `omnipay-app`.
- [ ] Tag Git `v1.0.0` sur les deux dépôts.
- [ ] Export final des supports de présentation (PDF / PPTX / Markdown).

---

*Document rédigé par Ayoub Achmaoui (P1), Lead CI/CD DevSecOps & Chef Technique — Projet OmniPay Zero-Trust.*
