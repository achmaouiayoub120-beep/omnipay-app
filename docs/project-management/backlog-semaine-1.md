# Backlog Semaine 1 — OmniPay Zero-Trust

Tableau de suivi Kanban : **Backlog** | **Todo** | **In Progress** | **Review** | **Done**

---

## Synthèse des tâches Semaine 1

| ID | Titre | Responsable | Priorité | Estimation | Dépendances | Statut |
|---|---|---|---|---|---|---|
| **TSK-P1-01** | Initialisation des 2 dépôts Git, arborescences et `.gitignore` | P1 | P1 (Socle) | 2h | Aucune | Done |
| **TSK-P1-02** | Définition de la stratégie de branches et templates GitHub (PR, Issues) | P1 | P1 (Socle) | 2h | TSK-P1-01 | Done |
| **TSK-P1-03** | Modélisation des menaces STRIDE (`docs/security/threat-model-stride.md`) | P1 | P1 (Socle) | 4h | Aucune | Done |
| **TSK-P1-04** | Rédaction des ADR d'architecture CI & Git (ADR-003, ADR-008) | P1 | P1 (Socle) | 3h | TSK-P1-02 | Done |
| **TSK-P1-05** | Configuration de Gitleaks et script de détection des secrets | P1 | P1 (Socle) | 2h | TSK-P1-01 | Done |
| **TSK-P1-06** | Configuration Jenkins en tant que code (JCasC) et docker-compose CI | P1 | P1 (Socle) | 4h | TSK-P1-05 | Done |
| **TSK-P1-07** | Création du Jenkinsfile initial (checkout, audit secrets, build, test) | P1 | P1 (Socle) | 4h | TSK-P1-06, TSK-P2-01 | Done |
| **TSK-P2-01** | Spécification et squelette des 3 microservices Spring Boot (<100 lignes) | P2 | P1 (Socle) | 4h | TSK-P1-01 | Done |
| **TSK-P2-02** | Endpoints `/health` et métriques `/actuator/prometheus` sur chaque service | P2 | P1 (Socle) | 2h | TSK-P2-01 | Done |
| **TSK-P2-03** | Dockerfiles multi-stage optimisés pour chaque microservice | P2 | P1 (Socle) | 3h | TSK-P2-01 | Done |
| **TSK-P2-04** | Environnement local Docker Compose (services + PostgreSQL) | P2 | P1 (Socle) | 3h | TSK-P2-03 | Done |
| **TSK-P2-05** | Premier chart Helm unifié avec templates de base | P2 | P1 (Socle) | 4h | TSK-P2-03 | Done |
| **TSK-P3-01** | Définition des modules Terraform pour le provisionnement des machines | P3 | P1 (Socle) | 4h | Aucune | Done |
| **TSK-P3-02** | Playbooks Ansible : durcissement SSH et prérequis conteneurs | P3 | P1 (Socle) | 4h | TSK-P3-01 | Done |
| **TSK-P3-03** | Déploiement du cluster K3s (1 Master, 2 Agents) via Ansible | P3 | P1 (Socle) | 5h | TSK-P3-02 | Done |
| **TSK-P4-01** | Déploiement et sécurisation du registre privé Harbor | P4 | P1 (Socle) | 4h | TSK-P3-03 | Done |
| **TSK-P4-02** | Déploiement de SonarQube pour l'analyse statique SAST | P4 | P1 (Socle) | 3h | TSK-P3-03 | Done |
| **TSK-P4-03** | Installation d'ArgoCD sur K3s et liaison avec `omnipay-gitops` | P4 | P1 (Socle) | 4h | TSK-P3-03, TSK-P1-01 | Done |
| **TSK-P5-01** | Déploiement de kube-prometheus-stack et Grafana sur K3s | P5 | P1 (Socle) | 4h | TSK-P3-03 | Done |
| **TSK-P5-02** | Définition des SLI initiaux et scraping des endpoints Actuator | P5 | P1 (Socle) | 3h | TSK-P5-01, TSK-P2-02 | Done |

---

## Fiches détaillées des tâches P1

### TSK-P1-01 : Initialisation des dépôts et structures
- **Responsable** : P1
- **Priorité** : P1 (Socle obligatoire)
- **Estimation** : 2h
- **Critères d'acceptation** :
  - `omnipay-app` et `omnipay-gitops` créés et initialisés avec Git.
  - `.gitignore` complet excluant les fichiers de build, caches, secrets et certificats.
  - Arborescences conformes au dossier d'architecture.

### TSK-P1-03 : Modélisation des menaces STRIDE
- **Responsable** : P1
- **Priorité** : P1 (Socle obligatoire)
- **Estimation** : 4h
- **Critères d'acceptation** :
  - Document `docs/security/threat-model-stride.md` rédigé.
  - Les 6 catégories STRIDE couvertes pour tous les composants clés (microservices, PostgreSQL, Jenkins, Harbor, Kubernetes, Vault).
  - Tableau de correspondance Menace → Mesure → Outil → Preuve.

### TSK-P1-04 : Rédaction des ADR d'architecture (ADR-003, ADR-008)
- **Responsable** : P1
- **Priorité** : P1 (Socle obligatoire)
- **Estimation** : 3h
- **Critères d'acceptation** :
  - Registre `docs/adr/README.md` listant les ADRs du projet (15 ADRs consolidés de S1 à S4).
  - `ADR-003` complet sur le choix du moteur d'intégration continue (Jenkins JCasC).
  - `ADR-008` complet sur la politique de branches, conventions de commit et détection de secrets.

### TSK-P1-05 : Configuration Gitleaks
- **Responsable** : P1
- **Priorité** : P1 (Socle obligatoire)
- **Estimation** : 2h
- **Critères d'acceptation** :
  - Fichier `.gitleaks.toml` configuré.
  - Guide opérationnel `docs/security/gitleaks.md`.
  - Commande de validation testée avec détection effective d'un faux secret synthétique de test.

### TSK-P1-06 : Jenkins Configuration as Code (JCasC)
- **Responsable** : P1
- **Priorité** : P1 (Socle obligatoire)
- **Estimation** : 4h
- **Critères d'acceptation** :
  - Fichier `ci/jenkins-casc.yaml` définissant la sécurité, les exécuteurs, les credentials et les plugins.
  - Fichier `ci/docker-compose-jenkins.yml` permettant un lancement local reproductible.
  - Aucun secret en clair dans le code.

### TSK-P1-07 : Pipeline CI Declaratif Jenkinsfile
- **Responsable** : P1
- **Priorité** : P1 (Socle obligatoire)
- **Estimation** : 4h
- **Critères d'acceptation** :
  - Fichier `ci/Jenkinsfile` déclaratif multi-stages (Checkout, Environment, Secret Scan, Build Maven, Tests).
  - Gestion des microservices avec vérification de présence des `pom.xml`.
  - Notifications et gestion d'erreurs en bloc `post`.
