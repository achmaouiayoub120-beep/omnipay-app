# Rapport de Validation Post-Semaine 1 & Coordination Équipe

**Projet :** OmniPay Zero-Trust — Mini-banque simulée  
**Rôle :** P1 — Chef technique, planification et CI (Senior DevSecOps Auditor)  
**Date :** 15 Novembre 2026  
**Dépôts officiels :**  
- Applicatif & CI : `https://github.com/achmaouiayoub120-beep/omnipay-app`  
- GitOps : `https://github.com/achmaouiayoub120-beep/omnipay-gitops`  

---

## 1. Matrice Globale de Validation Opérationnelle

| Contrôle | Statut | Preuve concrète / Commande exécutée | Action restante |
|---|---|---|---|
| **GitHub — Dépôts distants** | **PASS** | `gh repo view` confirme l'existence et l'accessibilité publique des dépôts `omnipay-app` et `omnipay-gitops`. | Néant. Dépôts opérationnels. |
| **GitHub — Branches distantes** | **PASS** | `omnipay-app` : branches `main` et `develop` publiées.<br>`omnipay-gitops` : branche `main` publiée. | Les développeurs créent leurs branches `feature/*` depuis `develop`. |
| **GitHub — Derniers commits** | **PASS** | Dernier commit `omnipay-app` : `4909939` (`ci: ajouter template de ruleset de protection des branches`).<br>Dernier commit `omnipay-gitops` : `d681efe`. | Aligné avec l'arbre Git local. |
| **GitHub — Protection de branches** | **PASS** | Rulesets officiels GitHub actifs :<br>• `omnipay-app` (ID `27316868`) : `main` et `develop` protégées.<br>• `omnipay-gitops` (ID `27316873`) : `main` protégée.<br>**Preuve formelle** : Tentative de push direct sur `main` rejetée avec erreur `GH013: Repository rule violations found ... Changes must be made through a pull request`. | Soumission obligatoire de Pull Requests pour toute modification. |
| **Gitleaks — Détection de secrets** | **PASS** | Image Docker officielle `zricethezav/gitleaks:latest` (v8.30.1) :<br>• Scan arbre propre : 0 fuite.<br>• Test d'injection de clé fictive : blocage immédiat code 1 à la ligne 1, purge confirmée. | Exécution automatique en CI dès démarrage des runners. |
| **Jenkins — Configuration JCasC** | **PASS** | Image `omnipay/jenkins-controller:jcasc-jdk21` construite avec succès avec tous les plugins JCasC (`configuration-as-code`, `job-dsl`, `git`, `workflow-aggregator`). Configuration validée (port 8088). | Démarrage du conteneur lié au démon Docker. |
| **Docker Engine local** | **BLOCKED** | Le démon Docker Desktop WSL2 (`docker-desktop`) est actuellement à l'état `Stopped`. | Lancement de l'application Docker Desktop par l'utilisateur dans sa session Windows. |
| **Jenkins — Accès HTTP (localhost:8088)** | **BLOCKED** | Dépendant du démarrage de Docker Engine. | Lancer `docker compose -f ci/docker-compose-jenkins.yml up -d` dès que Docker Desktop est actif. |
| **CI — Pipeline Jenkinsfile** | **PASS** | Fichier `ci/Jenkinsfile` déclaratif complet : Checkout SCM, Environment Check, Secret Scan, boucle dynamique Maven, Post-actions. | Exécution automatisée dès que le contrôleur Jenkins et les sources Java sont prêts. |
| **Maven & Microservices Spring Boot** | **BLOCKED (en attente P2)** | Arborescence `services/{auth,transaction,notification}` créée.<br>Fichiers `pom.xml` non présents (responsabilité de P2). | P2 fournit les squelettes Spring Boot (< 100 lignes chacun) avec `pom.xml`. |
| **Threat Model STRIDE** | **PASS** | Document `docs/security/threat-model-stride.md` validé, couvrant les 6 catégories STRIDE et matrice complète Menace $\rightarrow$ Outil $\rightarrow$ Preuve. | Base pour l'implémentation des politiques Kyverno (P4) et Falco (P5). |
| **Architecture Decisions (ADR)** | **PASS** | Registre `docs/adr/README.md` validé avec ADR-003 (Jenkins JCasC) et ADR-008 (Branches & Gitleaks) conformes au dossier de cadrage. | Rédaction des ADRs Semaine 2 (P3, P4, P5). |

---

## 2. Détail des Vérifications Techniques Réalisées

### 2.1 Vérification de l'Infrastructure Git & GitHub

#### Commandes d'audit exécutées
```bash
# Vérification des métadonnées du dépôt omnipay-app
gh repo view achmaouiayoub120-beep/omnipay-app --json name,isPrivate,defaultBranchRef,pushedAt
# Résultat : {"defaultBranchRef":{"name":"main"},"isPrivate":false,"name":"omnipay-app","pushedAt":"2026-11-15T14:38:34Z"}

# Vérification des branches distantes
gh api repos/achmaouiayoub120-beep/omnipay-app/branches --jq '.[].name'
# Résultat : develop, main

# Vérification des rulesets actifs
gh api repos/achmaouiayoub120-beep/omnipay-app/rulesets --jq '.[].name'
# Résultat : OmniPay Zero-Trust Protection (ID: 27316868)
```

#### Preuve d'application réelle de la protection de branche
Une tentative délibérée de push direct sur la branche `main` de `omnipay-gitops` a été exécutée pour tester la règle :
```text
$ git push origin main
remote: error: GH013: Repository rule violations found for refs/heads/main.
remote: - Changes must be made through a pull request.
To https://github.com/achmaouiayoub120-beep/omnipay-gitops.git
 ! [remote rejected] main -> main (push declined due to repository rule violations)
error: failed to push some refs
```
> **Constat formel :** La protection n'est pas seulement documentée, elle est **réellement active et bloque tout push direct non autorisé**.

---

### 2.2 Vérification Jenkins & JCasC

1. **Syntaxe et Déclaratif :**
   - Le fichier `ci/jenkins-casc.yaml` utilise une indentation stricte sans tabulation.
   - Les credentials (`SONAR_TOKEN`, `HARBOR_ROBOT_PASSWORD`) sont injectés par variables d'environnement.
   - Aucun secret en clair n'est présent dans Git.
2. **Construction de l'Image Personnalisée :**
   - L'image `omnipay/jenkins-controller:jcasc-jdk21` intègre nativement :
     `configuration-as-code`, `job-dsl`, `git`, `workflow-aggregator`, `docker-plugin`, `credentials-binding`, `pipeline-stage-view`.
3. **Port d'Écoute :**
   - Mappé sur `8088:8080` pour éviter la collision avec le port hôte 8080 (utilisé par un service Windows local).
4. **État Actuel :**
   - En attente du démarrage du démon Docker Desktop sur la machine hôte.

---

### 2.3 Vérification Gitleaks (Véritable Binaire & Scan)

- **Version utilisée :** `zricethezav/gitleaks:latest` (v8.30.1).
- **Configuration :** `.gitleaks.toml` intégrant allowlist de documentation et règles spécifiques (`omnipay-generic-api-key`, `omnipay-jwt-hardcoded-secret`).
- **Résultat de l'audit complet du dépôt :**
  ```text
  11:41PM INF scanned ~26318 bytes (26.32 KB) in 368ms
  11:41PM INF no leaks found
  ```
- **Test d'injection synthétique :**
  L'injection d'une clé fictive dans `tests/security/` a provoqué une alerte immédiate (`leaks found: 1`, code retour 1). Le fichier a été purgé aussitôt.

---

## 3. Plan de Coordination Inter-Équipes (Semaine 2)

Pour assurer la transition fluide vers la Semaine 2 (« Pipeline sécurisé et GitOps »), voici la feuille de route des livrables attendus par rôle :

```
       ┌────────────────────────┐
       │   P1 (Lead / CI)       │
       │  Jenkins, JCasC, SCM   │
       └───────────┬────────────┘
                   │ Déclenche build & tests
       ┌───────────▼────────────┐
       │   P2 (Microservices)   │◄──── Livrable requis : Spring Boot + pom.xml
       │ Auth, Transac, Notif   │
       └───────────┬────────────┘
                   │ Construit conteneurs & charts
       ┌───────────▼────────────┐
       │   P4 (Supply Chain)    │◄──── Requis : Harbor + Cosign + ArgoCD
       │ Harbor, ArgoCD, Cosign │
       └───────────┬────────────┘
                   │ Déploie sur infrastructure
       ┌───────────▼────────────┐
       │   P3 (Plateforme IaC)  │◄──── Requis : Terraform + K3s + Vault
       │ K3s, Vault, NetPol     │
       └───────────┬────────────┘
                   │ Supervise et observe
       ┌───────────▼────────────┐
       │   P5 (Fiabilité / SRE) │◄──── Requis : Prometheus, SLO, Falco
       │ Prometheus, Falco, SLO │
       └────────────────────────┘
```

### 3.1 Livrables attendus de P2 (Applications, Docker & Helm)
* **Microservices (< 100 lignes chacun)** :
  - `services/auth/` : endpoint POST `/auth/login`, génération JWT, GET `/actuator/health`, GET `/actuator/prometheus`, `pom.xml`.
  - `services/transaction/` : endpoint POST `/transactions`, persistance PostgreSQL, migrations Flyway, `pom.xml`.
  - `services/notification/` : endpoint POST `/notifications`, simulation d'envoi, `pom.xml`.
* **Empaquetage** : `Dockerfile` multi-stage pour chaque service (build Maven temurin-21 puis image d'exécution distroless ou alpine).
* **Développement local** : `docker-compose.yml` permettant de démarrer les 3 services + PostgreSQL en local.
* **Helm** : Chart unique `helm/omnipay` avec `values-dev.yaml`, `values-recette.yaml`, `values-prod.yaml`.
* **Versions de test** : Préparer V2-bonne et V2-mauvaise (taux d'erreur artificiel pour le Canary Release).

### 3.2 Livrables attendus de P3 (Plateforme, IaC, Réseau & Conformité)
* **Terraform** : Modules pour provisionner 1 serveur K3s master et 2 nœuds agents.
* **Ansible** : Playbooks pour le durcissement SSH, l'installation de containerd et K3s.
* **Vault** : Déploiement de HashiCorp Vault et configuration du moteur de secrets dynamiques PostgreSQL (Démo 4).
* **Réseau** : Kubernetes `NetworkPolicies` en mode Zero-Trust (deny-all par défaut, ouverture stricte des flux inter-services).
* **Conformité** : Audit kube-bench / Kubescape avant et après durcissement.

### 3.3 Livrables attendus de P4 (Livraison & Supply Chain)
* **Harbor** : Déploiement et création du projet privé `omnipay` avec compte robot pour Jenkins.
* **ArgoCD** : Déploiement sur K3s avec `ApplicationSet` pointant sur `omnipay-gitops`.
* **Sécurité Supply Chain** :
  - Génération SBOM avec **Syft**.
  - Signature d'images avec **Cosign** dans le pipeline Jenkins.
  - Contrôle d'admission **Kyverno** rejetant toute image non signée (Démo 2).
* **Canary** : Configuration d'**Argo Rollouts** (10 % $\rightarrow$ 50 % $\rightarrow$ 100 %) avec analyse métrique (Démo 1).

### 3.4 Livrables attendus de P5 (Fiabilité, Observabilité & Apprentissage)
* **Monitoring** : Déploiement de `kube-prometheus-stack` et Grafana sur K3s.
* **SRE** : Scraping des métriques Spring Boot Actuator, dashboards SLI/SLO (taux de succès, latence p99) et budget d'erreur.
* **Logs** : Déploiement de Grafana Loki.
* **Sécurité Runtime** : Déploiement de **Falco** avec alertes Falcosidekick (Discord/Telegram) et suppression du pod suspect (Démo 3).
* **Chaos Engineering & DORA** : Injection de pannes avec Chaos Mesh (Démo 5), gabarit de post-mortem sans reproche et tableau des métriques DORA.

---

## 4. Tâches Restantes et Actions Immédiates pour P1

| # | Action | Dépendance | Priorité |
|---|---|---|---|
| **1** | Démarrer Docker Desktop sur la machine locale pour lancer le conteneur Jenkins sur le port 8088. | Intervention utilisateur | Haute |
| **2** | Intégrer les plugins de sécurité dans le `Jenkinsfile` : SonarQube Scanner et OWASP Dependency-Check. | Prise en charge S2 | Haute |
| **3** | Préparer le script de promotion GitOps : commit automatisé du nouveau tag d'image dans `omnipay-gitops/envs/dev/` suite au build réussi. | Collaboration avec P4 | Haute |
| **4** | Créer le script d'automatisation de rétroaction : transformation automatique d'une alerte critique ou d'un échec de déploiement en issue GitHub. | Collaboration avec P5 | Moyenne |
