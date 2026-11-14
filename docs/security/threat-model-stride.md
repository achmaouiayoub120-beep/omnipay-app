# Modélisation des Menaces STRIDE — OmniPay Zero-Trust

**Projet :** OmniPay Zero-Trust  
**Auteur :** P1 — Chef technique, planification et CI  
**Statut :** Validé — Baseline Semaine 1  
**Référentiel :** Méthodologie Microsoft STRIDE  

---

## 1. Périmètre et Architecture analysée

La plateforme OmniPay simule une infrastructure bancaire hautement résiliente soumise à des exigences strictes de sécurité.
L'analyse couvre l'ensemble du cycle de vie logiciel et de la chaîne de livraison :
- **Composants applicatifs :** `auth-service`, `transaction-service`, `notification-service`.
- **Persistance :** base de données relationnelle PostgreSQL.
- **Gestion des secrets :** HashiCorp Vault (identifiants dynamiques).
- **Plateforme d'intégration et livraison :** GitHub, Jenkins (JCasC), Harbor (registre d'images), ArgoCD (GitOps).
- **Cluster d'orchestration :** Kubernetes (K3s), Ingress NGINX, Kyverno (admission control), Falco (détection runtime).

---

## 2. Décomposition des Menaces par Catégorie STRIDE

### 2.1 S — Spoofing (Usurpation d'identité)

| ID | Composant | Scénario d'attaque | Impact | Niveau de risque | Mesure de mitigation | Outil / Mécanisme | Preuve de vérification |
|---|---|---|---|---|---|---|---|
| **STRIDE-S1** | Auth Service | Rejeu ou falsification de jetons de session d'un utilisateur bancaire. | Accès illégitime aux comptes et transactions frauduleuses. | **Élevé** | Signature cryptographique asymétrique des tokens (JWT RS256) avec rotation des clés et courte durée de vie. | Spring Security / JJWT | Test unitaire rejetant un token falsifié ou expiré. |
| **STRIDE-S2** | Communications inter-services | Un conteneur compromis usurpe l'identité de `transaction-service` pour appeler `notification-service`. | Envoi de fausses notifications ou exfiltration de métadonnées. | **Moyen** | Authentification mutuelle (mTLS) ou jetons de service éphémères validés systématiquement. | Service Mesh / NetworkPolicy | Test de rejet d'une requête inter-service non authentifiée. |
| **STRIDE-S3** | Registre d'images (Harbor) | Déploiement d'une image conteneur malveillante usurpant le nom d'un microservice OmniPay officiel. | Exécution de code hostile dans le cluster en production. | **Critique** | Signature obligatoire de toutes les images lors du build avec Cosign ; vérification cryptographique avant admission par Kyverno. | Cosign + Kyverno | **Démo 2** : rejet immédiat à l'admission d'une image non signée ou falsifiée. |
| **STRIDE-S4** | Jenkins (CI) | Usurpation de l'identité d'un agent Jenkins pour injecter des binaires corrompus. | Altération de la supply chain logicielle. | **Critique** | Agents Jenkins éphémères exécutés dans des pods dédiés avec jetons mTLS/JCasC stricts. | Jenkins Kubernetes Plugin | Logs d'audit de connexion d'agent et révocation automatique du pod agent à la fin du build. |

---

### 2.2 T — Tampering (Altération / Modification non autorisée)

| ID | Composant | Scénario d'attaque | Impact | Niveau de risque | Mesure de mitigation | Outil / Mécanisme | Preuve de vérification |
|---|---|---|---|---|---|---|---|
| **STRIDE-T1** | Code source (GitHub) | Modification directe du code sur la branche `main` sans revue (backdoor). | Déploiement de code malveillant en production. | **Critique** | Protection stricte des branches `main` et `develop` : PR obligatoire, au moins 1 approbation, commits signés. | GitHub Branch Protection | Tentative de push direct rejetée par GitHub (`protected branch hook declined`). |
| **STRIDE-T2** | Base de données (PostgreSQL) | Injection SQL via l'API de `transaction-service` modifiant les soldes ou l'historique. | Perte d'intégrité des soldes et fraude financière. | **Critique** | Utilisation exclusive de requêtes préparées (JPA / Hibernate Parameterized Queries), pas de concaténation SQL. | Spring Data JPA / SonarQube | Règle SAST SonarQube bloquant toute concaténation SQL ; tests unitaires d'injection. |
| **STRIDE-T3** | Manifestes GitOps | Modification directe de la configuration du cluster via `kubectl edit` sans passer par Git. | Dérive de configuration (configuration drift) et modifications non tracées. | **Élevé** | ArgoCD configuré avec synchronisation automatique et auto-remediation (`selfHeal: true`). | ArgoCD Self-Healing | Modification manuelle d'un déploiement écrasée et réalignée automatiquement par ArgoCD. |
| **STRIDE-T4** | Binaire / Image conteneur | Injection d'un malware dans l'image conteneur après le build CI. | Exécution d'un conteneur altéré. | **Critique** | Génération du SBOM (Software Bill of Materials) et signature Cosign attachée au digest immuable (SHA256). | Syft + Cosign | Vérification de digest d'image par Kyverno lors du déploiement. |

---

### 2.3 R — Repudiation (Répudiation d'une action)

| ID | Composant | Scénario d'attaque | Impact | Niveau de risque | Mesure de mitigation | Outil / Mécanisme | Preuve de vérification |
|---|---|---|---|---|---|---|---|
| **STRIDE-R1** | Transaction Service | Un utilisateur ou un opérateur nie avoir initié un virement d'argent. | Litige financier et impossibilité d'audit légal. | **Élevé** | Journalisation immuable de chaque transaction avec timestamp UTC, identifiant demandeur, montant et IP source. | Loki + PostgreSQL Audit | Requête LogQL dans Loki retrouvant l'entrée de journalisation associée à la transaction. |
| **STRIDE-R2** | Actions d'administration K8s | Un opérateur effectue une modification destructrice (`kubectl delete`) puis nie son action. | Manque de traçabilité lors d'un incident de production. | **Moyen** | Activation des Kubernetes Audit Logs transmis à une cible d'observabilité centralisée et protégée. | K3s Audit Log + Loki | Consultation des logs d'audit Kubernetes filtrés par utilisateur et verbe. |
| **STRIDE-R3** | Déploiement CI/CD | Contestation de l'origine d'une version logicielle mise en production. | Incapacité à identifier l'auteur ou le commit responsable d'une régression. | **Moyen** | Traçabilité Git complète (GitOps) : chaque déploiement correspond exactement à un commit SHA dans `omnipay-gitops`. | Git Commit History + ArgoCD UI | Affichage du commit Git source directement dans l'interface ArgoCD. |

---

### 2.4 I — Information Disclosure (Divulgation d'informations sensibles)

| ID | Composant | Scénario d'attaque | Impact | Niveau de risque | Mesure de mitigation | Outil / Mécanisme | Preuve de vérification |
|---|---|---|---|---|---|---|---|
| **STRIDE-I1** | Dépôt Git | Commit accidentel d'un mot de passe de base de données ou d'une clé API privée. | Compromission immédiate des ressources exposées. | **Critique** | Scan préventif des commits en local (pre-commit hook) et blocage systématique dans le pipeline CI. | Gitleaks | **Preuve Phase 6** : Gitleaks bloque la CI lorsqu'un faux secret synthétique est présent. |
| **STRIDE-I2** | Base de données (PostgreSQL) | Fuite d'identifiants de connexion statiques stockés dans des fichiers de configuration. | Accès non autorisé à l'ensemble des données financières. | **Critique** | Génération d'identifiants dynamiques à durée de vie limitée (TTL) sans mot de passe statique dans le code. | HashiCorp Vault | **Démo 4** : rotation dynamique du mot de passe dans Vault sans interruption de service. |
| **STRIDE-I3** | Trafic réseau inter-pods | Écoute passive du trafic non chiffré entre microservices au sein du cluster. | Interception de tokens d'authentification et de données transactionnelles. | **Élevé** | Chiffrement mTLS et segmentation réseau stricte par défaut. | NetworkPolicies (deny-all) | Tentative de communication non autorisée bloquée au niveau réseau. |
| **STRIDE-I4** | Logs applicatifs | Écriture de données sensibles (mots de passe, numéros de carte) dans les logs standard. | Divulgation de données confidentielles aux opérateurs d'observabilité. | **Élevé** | Masquage systématique des champs sensibles dans la couche de sérialisation et journalisation. | Logback Pattern Masking | Examen des logs dans Grafana/Loki montrant le masquage des champs confidentiels. |

---

### 2.5 D — Denial of Service (Déni de service)

| ID | Composant | Scénario d'attaque | Impact | Niveau de risque | Mesure de mitigation | Outil / Mécanisme | Preuve de vérification |
|---|---|---|---|---|---|---|---|
| **STRIDE-D1** | API Gateway / Ingress | Inondation de requêtes HTTP sur l'endpoint de connexion (Brute Force / DDoS). | Indisponibilité du service bancaire pour les utilisateurs légitimes. | **Élevé** | Rate limiting au niveau Ingress NGINX et allocation de quotas de requêtes stricts. | Ingress NGINX Rate Limiting | Test de charge k6 démontrant le rejet HTTP 429 au-delà du seuil fixé. |
| **STRIDE-D2** | Pods microservices | Saturation mémoire ou CPU d'un pod entraînant l'épuisement des ressources du nœud Kubernetes. | Effet domino et crash de nœuds complets (OOMKilled en cascade). | **Élevé** | Définition obligatoire de `requests` et `limits` CPU/mémoire sur tous les conteneurs dans les manifests Helm. | Helm / ResourceQuotas | Validation Conftest / kube-linter vérifiant la présence des limites de ressources. |
| **STRIDE-D3** | Déploiement d'une version instable | Une mise à jour buggée fait crasher l'ensemble des réplicas en production simultanément. | Panne totale du service bancaire. | **Critique** | Déploiement progressif en Canary Release avec rollback automatique en cas de hausse du taux d'erreur. | Argo Rollouts + Prometheus | **Démo 1** : rollback automatique déclenché par une anomalie métrique sur la version V2-mauvaise. |

---

### 2.6 E — Elevation of Privilege (Élévation de privilèges)

| ID | Composant | Scénario d'attaque | Impact | Niveau de risque | Mesure de mitigation | Outil / Mécanisme | Preuve de vérification |
|---|---|---|---|---|---|---|---|
| **STRIDE-E1** | Conteneur applicatif | Évasion de conteneur (container escape) via un conteneur exécuté en tant que `root`. | Prise de contrôle de l'hôte Linux sous-jacent. | **Critique** | Exécution systématique en non-root (`runAsNonRoot: true`), système de fichiers en lecture seule, interdiction du mode privilégié. | Pod Security Standards (Restricted) | Rejet par le contrôleur d'admission de tout pod avec `privileged: true`. |
| **STRIDE-E2** | Accès interactif non autorisé | Un attaquant ou un utilisateur non autorisé exécute `kubectl exec` dans un pod en production. | Injection d'outils d'attaque et vol de jetons internes. | **Critique** | Détection en temps réel des appels système anormaux (spawn de shell interactif) et kill automatique du pod. | Falco + Falcosidekick + Talon | **Démo 3** : alerte Falco immédiate sur téléphone et suppression du pod pirate en direct. |
| **STRIDE-E3** | ServiceAccounts Kubernetes | Utilisation abusive des privilèges du token ServiceAccount monté par défaut dans les pods. | Mouvements latéraux et requêtes vers l'API Kubernetes. | **Élevé** | Désactivation du montage automatique du token (`automountServiceAccountToken: false`) et RBAC au strict minimum. | Kubernetes RBAC | Tentative d'accès à l'API Server depuis l'intérieur d'un pod bloquée par un code 403 Forbidden. |

---

## 3. Matrice de Correspondance Globale

| Menace | Mesure de sécurité principale | Outil mis en œuvre | Preuve concrète / Démo associée |
|---|---|---|---|
| **Fuite de secret dans Git** | Détection shift-left avant push et en CI | Gitleaks | Pipeline CI bloqué sur fausse clé de test |
| **Exécution d'image falsifiée** | Signature cryptographique et vérification d'admission | Cosign + Kyverno | **Démo 2** : rejet d'image non signée |
| **Intrusion / Shell interactif** | Détection des appels système anormaux | Falco + Talon | **Démo 3** : alerte Discord et suppression du pod |
| **Vol d'identifiants de base** | Identifiants dynamiques à durée de vie courte | HashiCorp Vault | **Démo 4** : rotation dynamique sans coupure |
| **Déploiement défaillant** | Canary release avec analyse métrique automatique | Argo Rollouts + Prometheus | **Démo 1** : rollback automatique sur erreur |
| **Panne d'infrastructure non anticipée** | Injection de chaos et vérification du budget d'erreur | Chaos Mesh + Alertmanager | **Démo 5** : game day et post-mortem automatique |
