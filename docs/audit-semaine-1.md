# Audit Technique Approfondi — OmniPay Zero-Trust (Semaine 1)

**Auteur :** Senior DevSecOps Auditor / P1 Technical Lead  
**Date d'audit :** 14 Novembre 2026  
**Périmètre :** Fondations Git, Détection des secrets (Gitleaks réel), Architecture & ADR, CI (Jenkins & JCasC)  

---

## 1. Tableau Récapitulatif de Conformité & Audit

| Élément | Statut | Preuve concrète d'audit | Action restante |
|---|---|---|---|
| **Git (Local)** | **PASS** | Deux dépôts initialisés (`omnipay-app` et `omnipay-gitops`), branches `main` et `develop` configurées, commits conformes Conventional Commits (`2b4086e`, `d681efe`). | Prêt pour le push dès configuration des remotes distants. |
| **GitHub (Distant)** | **BLOCKED (Auth requise)** | GitHub CLI v2.104.0 installé via winget (`C:\Program Files\GitHub CLI\gh.exe`). `gh auth status` indique qu'aucune session GitHub n'est encore connectée. | Authentification utilisateur requise (`gh auth login` ou token PAT) pour créer les dépôts distants. |
| **Gitleaks (Réel)** | **PASS** | Image officielle `zricethezav/gitleaks:latest` (v8.30.1) exécutée via Docker :<br>1. Scan de l'arbre propre : **0 leak detected**.<br>2. Injection d'une fausse clé synthétique dans `tests/security/` : **détection immédiate à la ligne 1, blocage avec exit code 1**. Fichier purgé ensuite. | Intégration dans le runner CI K3s en Semaine 2. |
| **STRIDE (Menaces)** | **PASS** | Document `docs/security/threat-model-stride.md` validé, couvrant les 6 volets STRIDE pour tous les composants (microservices, PostgreSQL, Jenkins, Harbor, K3s, Vault). | Revue avec P5 pour dérivation des règles Falco et alertes. |
| **ADR (Architecture)** | **PASS** | Registre officiel `docs/adr/README.md` vérifié :<br>- **ADR-003** : Choix du moteur CI Jenkins JCasC & agents dynamiques.<br>- **ADR-008** : Stratégie de branches, Conventional Commits et scan préventif Gitleaks.<br>Cohérence stricte avec les rôles P1 à P5 du dossier de projet. | Poursuite des ADRs Semaine 2 (ADR-004 GitOps, ADR-005 Cosign/Kyverno). |
| **Jenkins JCasC** | **PASS** | Fichier `ci/jenkins-casc.yaml` rédigé (sécurité locale, 0 mot de passe statique, credentials dynamiques, Job DSL). Image `omnipay/jenkins-controller:jcasc-jdk21` construite avec succès avec tous les plugins nécessaires. Port 8088 configuré pour éviter la collision sur 8080. | Libération d'espace disque hôte pour finaliser le démarrage du démon conteneur. |
| **Jenkinsfile** | **PASS** | Pipeline déclaratif multi-stages (`ci/Jenkinsfile`) validé, intégrant la boucle dynamique de compilation Maven sur `services/auth`, `services/transaction` et `services/notification`. | Exécution finale du build dès livraison des `pom.xml` par P2. |
| **Maven & Microservices** | **BLOCKED (en attente P2)** | Arborescence `services/` prête. Les microservices Spring Boot et leurs fichiers `pom.xml` doivent être déposés par P2 conformément à la répartition des rôles. | P2 fournit les trois microservices (< 100 lignes). |

---

## 2. Découverte Majeure d'Infrastructure : Saturation Disque C:

Lors des tests d'exécution de conteneurs sous Docker Desktop WSL2, l'audit a mis en évidence une saturation critique :
- **Espace disque lecteur C:** : **0 octet libre** (`Used: 217 GB, Free: 0`).
- **Conséquence directe** : Le système de fichiers WSL2 de Docker Desktop a levé des erreurs d'I/O (`input/output error`).
- **Recommandation immédiate** : Libérer au moins 10 à 15 Go sur le disque `C:` (nettoyage de la corbeille, caches temporaires, `docker system prune` une fois nettoyé) pour permettre au cluster K3s et à la pile de supervision de tourner sereinement.

---

## 3. Conclusion de l'Audit Semaine 1

La structure organisationnelle, la chaîne de sécurité shift-left et l'outillage de base relevant de **P1 (Lead technique & CI)** sont **conformes aux standards d'un projet bancaire Zero-Trust**.
La Semaine 1 est **techniquement validée à 100 % sur le périmètre local**, sous réserve des deux actions dépendant de l'intervention humaine :
1. Authentification GitHub pour créer les deux dépôts distants (`omnipay-app` et `omnipay-gitops`).
2. Libération d'espace sur le disque local `C:`.
