# 🎙️ Fiche Mémo Oral & Préparation Jury — P1 (Ayoub Achmaoui)
## Rôle : Chef Technique, Architecture Globale & Lead CI/CD DevSecOps
### Projet : OmniPay Zero-Trust (ESTC 2026)
**Créneau Oral :** Minutes 00:00 à 06:00 (6 minutes chrono)  
**Support Associé :** Slides 1 à 4 (`docs/soutenance/slides-soutenance-omnipay.md`) & Démo 3 Live

---

## ⏱️ 1. Découpage Minute par Minute du Passage Oral

```
+---------------------------------------------------------------------------------------+
| 00:00 - 02:00 | INTRODUCTION, CONTEXTE BANCAIRE & POSTURE ZERO-TRUST (Slides 1 - 2)   |
+---------------------------------------------------------------------------------------+
| 02:00 - 05:00 | DÉMONSTRATION 3 LIVE : PIPELINE DEVSECOPS & SUPPLY CHAIN (Slides 3 - 4)|
+---------------------------------------------------------------------------------------+
| 05:00 - 06:00 | CONCLUSION DEVSECOPS & TRANSITION VERS P2 (AMIRA ADOLF)               |
+---------------------------------------------------------------------------------------+
```

---

## 🗣️ 2. Script Textuel de Présentation (Ce que tu dis au Jury)

### [00:00 - 02:00] Introduction & Vision Zero-Trust
> *"Monsieur le Président du jury, chers membres du jury, bonjour.*  
> *Je m'appelle Ayoub Achmaoui, Chef Technique et Lead CI/CD DevSecOps du projet **OmniPay Zero-Trust**.*  
>  
> *Dans le secteur bancaire traditionnel, la sécurité est historiquement un goulot d'étranglement : les comités de validation de release prennent des semaines, et le périmètre réseau est supposé étanche. Or, aujourd'hui, 80% des failles proviennent de compromissions internes ou de vulnérabilités dans la chaîne d'approvisionnement logicielle.*  
>  
> *Notre défi avec OmniPay a été d'adopter la posture **Zero-Trust : 'Never Trust, Always Verify'**. Nous avons conçu une architecture où aucun composant ne fait confiance à un autre par défaut, tout en automatisant un pipeline de livraison continue capable de qualifier et promouvoir une version en production en moins de 15 minutes, dans le respect strict des réglementations **PCI-DSS v4.0** et de la directive européenne **DORA**.*  
>  
> *Pour concrétiser cette vision, nous avons unifié 5 expertises : l'architecture applicative menée par Amira, l'infrastructure cloud et la sécurité runtime par Aïcha, la gouvernance GitOps et l'admission control par Widad, et l'observabilité SRE par Moad."*

---

### [02:00 - 05:00] Démo 3 Live : Pipeline DevSecOps en 11 Stages
*(Tu bascules l'écran sur l'interface Jenkins / Terminal)*

> *"Passons immédiatement à la pratique avec notre **Démo 3 : La Chaîne DevSecOps et Supply Chain de bout en bout**.*  
>  
> *Voici notre `Jenkinsfile` déclaratif en 11 stages. Sa particularité : chaque étape constitue une barrière infranchissable (Quality Gate bloquante).*  
>  
> **1. Démonstration du Shift-Left Immédiat (Scénario A) :**  
> *Imaginons qu'un développeur commette par erreur une clé secrète dans le code source.*  
> *(Tu lances la simulation ou montres le log).*  
> *En exactement **4 secondes**, l'analyseur Gitleaks détecte l'entropie de la clé, refuse le commit et interrompt immédiatement le pipeline. Aucun conteneur n'est construit, aucune fuite n'atteint le registre.*  
>  
> **2. Qualité de Code et Conformité des Conteneurs :**  
> *Sur un commit sain, le code passe les tests JaCoCo avec plus de 80% de couverture de code, puis l'analyse SonarQube avec tolérance zéro sur la dette technique, Hadolint sur les Dockerfiles, et Trivy qui bloque toute CVE critique.*  
>  
> **3. Supply Chain Security (Syft & Cosign) :**  
> *Une fois l'image validée, nous générons son inventaire logiciel immuable (SBOM CycloneDX) avec Syft, et nous **signons cryptographiquement l'image avec Cosign** avant de la pousser sur notre registre privé Harbor.*  
>  
> **4. Promotion GitOps & Audit Dynamique DAST OWASP ZAP :**  
> *Enfin, l'image est déployée en recette où le scanner dynamique **OWASP ZAP** audite les endpoints HTTPS réels contre les attaques XSS, injections SQL et mauvaises configurations d'en-têtes. Seule une version validée par ZAP peut prétendre à la promotion vers la production."*

---

### [05:00 - 06:00] Transition vers P2 (Amira Adolf)
> *"Grâce à cette chaîne hermétique, nous avons la garantie mathématique qu'aucun artefact vulnérable ou non signé ne peut être exécuté dans notre cluster.*  
>  
> *Mais que déploie concrètement cette chaîne ? Je cède immédiatement la parole à **Amira Adolf**, notre responsable Backend et Frontend, qui va vous présenter le cœur fonctionnel d'OmniPay et vous faire vivre le parcours d'un client bancaire en direct sur notre portail web."*

---

## 🎯 3. Top 5 des Questions Pièges du Jury & Réponses Préparées

### Q1 : *"Pourquoi avoir choisi Cosign plutôt que Notary v2 ou une PKI X.509 classique ?"*
- **Ta Réponse :**  
  > *"Cosign (du projet Linux Foundation Sigstore) est devenu le standard de facto de la Cloud Native Computing Foundation (CNCF). Contrairement à Notary v1 ou à une PKI interne complexe à maintenir avec des CRL/OCSP qui ralentissent les builds, Cosign permet de stocker les signatures et les attestations SBOM directement comme des artefacts OCI dans le registre Harbor aux côtés de l'image. De plus, son intégration avec le contrôleur d'admission Kyverno est native et ultra-rapide (< 50ms par requête d'admission)."*

### Q2 : *"Comment gérez-vous les faux-positifs dans OWASP ZAP sans bloquer vos déploiements ?"*
- **Ta Réponse :**  
  > *"Nous appliquons une matrice de sévérité différenciée : seuls les constats de sévérité HIGH et CRITICAL (ex: SQLi, XSS stockée, Remote Code Execution) sont bloquants pour la promotion en production. Les alertes MEDIUM et LOW (en-têtes CSP informatifs, cookies sans flag spécifique) sont archivées dans le rapport JSON/HTML et intégrées automatiquement dans le backlog de sécurité SonarQube sous forme de tickets de remédiation sans bloquer le pipeline."*

### Q3 : *"Que se passe-t-il si votre registre Harbor tombe pendant un déploiement ?"*
- **Ta Réponse :**  
  > *"Dans notre architecture Zero-Trust, Harbor est déployé en haute disponibilité avec stockage répliqué. Si Harbor devient indisponible, les nœuds K3s disposent d'un cache local des images déjà validées (`imagePullPolicy: IfNotPresent`). Pour les nouvelles versions, Kyverno applique la politique Fail-Closed : en l'absence de vérification de signature possible, aucun pod non certifié ne peut être instancié. La sécurité prévaut sur la nouveauté."*

### Q4 : *"Pourquoi séparer le dépôt de code `omnipay-app` et le dépôt GitOps `omnipay-gitops` ?"*
- **Ta Réponse :**  
  > *"C'est une recommandation formelle de sécurité bancaire et des principes GitOps : la séparation des privilèges (Separation of Concerns). Les développeurs ont les droits d'écriture sur `omnipay-app`, mais seul le pipeline CI automatisé (via un compte de service dédié avec clé SSH ou token restreint) possède le droit de write-back sur `omnipay-gitops`. Cela empêche un développeur de modifier directement la configuration de production sans passer par les 11 stages de validation DevSecOps."*

### Q5 : *"Comment mesurez-vous le succès de votre démarche DevSecOps ?"*
- **Ta Réponse :**  
  > *"À travers les 4 métriques DORA que Moad vous présentera sur Grafana : notre fréquence de déploiement est passée de quelques semaines à plusieurs fois par jour, notre Lead Time for Changes est sous les 15 minutes, notre taux d'échec de changement est inférieur à 5% grâce aux Quality Gates, et notre MTTR est sous les 30 secondes grâce au Rollback automatique Canary d'Argo Rollouts."*

---

*Fiche validée par Ayoub Achmaoui (P1) — Prêt pour le Grand Oral.*
