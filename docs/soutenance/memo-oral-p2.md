# 🎙️ Fiche Mémo Oral & Préparation Jury — P2 (Amira Adolf)
## Rôle : Développeuse Backend Spring Boot & Lead Frontend Web (UI Client)
### Projet : OmniPay Zero-Trust (ESTC 2026)
**Créneau Oral :** Minutes 06:00 à 12:00 (6 minutes chrono)  
**Supports Associés :** Slides 5 à 8 (`docs/soutenance/slides-soutenance-omnipay.md`) & Démo Frontend Live

---

## ⏱️ 1. Découpage Minute par Minute du Passage Oral

```
+---------------------------------------------------------------------------------------+
| 06:00 - 07:30 | ARCHITECTURE MICROSERVICES SPRING BOOT & RBAC JWT (Slides 5 - 6)      |
+---------------------------------------------------------------------------------------+
| 07:30 - 10:30 | DÉMONSTRATION FRONTEND REACT 18 LIVE (Slide 7)                        |
|               | - Parcours Alice -> Bob (Virement 50 € + Confettis)                   |
|               | - Test Solde Insuffisant (HTTP 422)                                   |
|               | - Démonstration de l'Idempotence (X-Idempotency-Key)                  |
+---------------------------------------------------------------------------------------+
| 10:30 - 11:30 | TEST DE CHARGE K6 ARRIÈRE-PLAN & ANALYTICS (Slide 8)                  |
+---------------------------------------------------------------------------------------+
| 11:30 - 12:00 | CONCLUSION APPLICATIVE & TRANSITION VERS P3 (AÏCHA EL MAHDAOUI)       |
+---------------------------------------------------------------------------------------+
```

---

## 🗣️ 2. Script Textuel de Présentation (Ce que tu dis au Jury)

### [06:00 - 07:30] Architecture Microservices & Sécurité Applicative
> *"Merci Ayoub.*  
> *Monsieur le Président, chers membres du jury, je suis **Amira Adolf**, responsable de l'architecture backend Spring Boot et du portail web d'OmniPay.*  
>  
> *Notre métier bancaire repose sur 3 microservices autonomes conçus sous **Spring Boot 3 et Java 21** :*  
> *1. **`auth-service` (Port 8081)** : Génère et valide les jetons JWT asymétriques signés avec l'algorithme ECDSA ES256, garantissant un modèle stateless haute performance sans session serveur.*  
> *2. **`transaction-service` (Port 8082)** : Gère le grand livre bancaire, les soldes et les transferts, adossé à une base PostgreSQL dont le schéma évolue de manière strictement versionnée grâce à Flyway.*  
> *3. **`notification-service` (Port 8083)** : Assure la traçabilité asynchrone des confirmations d'opérations.*  
>  
> *Côté front-end, nous avons fait le choix d'une **Single Page Application construite sous React 18 Ultra**, sans aucune dépendance externe afin de garantir un fonctionnement parfait en environnement isolé et étanche."*

---

### [07:30 - 10:30] Démonstration Live du Portail Web
*(Tu partages l'écran sur `https://app.omnipay.local`)*

> *"Voici notre portail client en direct.*  
>  
> **1. Connexion et Zero-Trust Telemetry :**  
> *Je me connecte en 1 clic avec le profil d'Alice. Notez le badge Zero-Trust vert qui pulse dans la barre supérieure : un clic dessus révèle en direct la latence de nos microservices et le chiffrement TLS 1.3 strict.*  
>  
> **2. Carte 3D & Virement Réaliste :**  
> *Notre carte bancaire virtuelle réagit au curseur avec un effet de parallaxe 3D et un reflet holographique. En un clic, je la retourne pour visualiser le CVV dynamique et copier l'IBAN.*  
> *Dans notre carrousel de bénéficiaires fréquents, je sélectionne Bob Martin, j'ajoute 50 € et je valide.*  
> *(Les confettis éclatent, le carillon fintech retentit).*  
> *Le solde d'Alice passe instantanément de 2 500 € à 2 450 €, et la ligne apparaît dans le grand livre.*  
>  
> **3. Robustesse Financière & Idempotence :**  
> *Si je tente maintenant de transférer 10 000 €, le serveur me rejette immédiatement avec une alerte rouge explicite : aucun découvert non autorisé n'est permis.*  
> *Et si le client double-clique frénétiquement en cas de micro-coupure réseau ? Grâce à l'en-tête `X-Idempotency-Key` (UUIDv4) généré pour chaque opération, le serveur intercepte la répétition : le second appel est servi depuis le cache sans jamais débiter deux fois le compte."*

---

### [10:30 - 11:30] Test de Charge k6 en Arrière-Plan
> *"Pour prouver la résistance de notre backend, je lance notre script de charge k6 via la console de soutenance.*  
> *Ce script simule 50 à 150 utilisateurs virtuels envoyant des centaines de virements simultanés sous authentification JWT.*  
> *Pendant que ce trafic alimente en continu notre architecture, je cède la parole à **Aïcha**, qui va vous expliquer comment notre infrastructure sous-jacente et HashiCorp Vault protègent ces flux au niveau du système et du réseau."*

---

## 🎯 3. Top 5 des Questions Pièges du Jury & Réponses Préparées

### Q1 : *"Comment garantissez-vous la cohérence des données lors d'un virement entre deux comptes sans bloquer la base ?"*
- **Ta Réponse :**  
  > *"Nous utilisons le niveau d'isolation transactionnelle de Spring `@Transactional` avec requêtes de verrouillage pessimiste (`SELECT ... FOR UPDATE`) sur les lignes des deux comptes concernés, ordonnées par identifiant de compte pour éviter tout interblocage (Deadlock). Les soldes et l'écriture dans l'audit trail sont validés dans une transaction atomique unique."*

### Q2 : *"Pourquoi avoir choisi React sans framework lourd (Next.js/Remix) pour ce projet bancaire ?"*
- **Ta Réponse :**  
  > *"Dans une architecture bancaire Zero-Trust avec politique de sécurité Content Security Policy (CSP) stricte ('self'), un serveur de rendu côté serveur (SSR) comme Node.js augmenterait la surface d'attaque en exposant un runtime JavaScript supplémentaire en zone Ingress. En servant une SPA React statique compilée directement depuis un conteneur NGINX non-root allégé (alpine:3.20), nous réduisons la surface de vulnérabilité au strict minimum tout en offrant une réactivité instantanée de 60 images/seconde."*

### Q3 : *"Comment l'idempotence est-elle stockée côté backend ?"*
- **Ta Réponse :**  
  > *"Chaque transaction entrante vérifie la table relationnelle `idempotency_records` indexée sur la clé `idempotency_key` (UUIDv4) avec contrainte d'unicité `UNIQUE`. Si la clé existe déjà, le service retourne immédiatement la réponse précédemment enregistrée avec le code HTTP 200/201 sans réexécuter les débits/crédits en base."*

### Q4 : *"Où est stocké le jeton JWT côté navigateur et comment évitez-vous les attaques XSS ?"*
- **Ta Réponse :**  
  > *"Le jeton JWT est stocké en `sessionStorage` (qui s'autodétruit à la fermeture de l'onglet). Pour neutraliser tout risque XSS, l'intégralité du rendu dynamique React utilise des propriétés sécurisées (`textContent`), sans jamais recourir à `dangerouslySetInnerHTML`. De plus, notre NGINX injecte l'en-tête `Content-Security-Policy: default-src 'self'` qui bloque toute injection de script externe ou exécution inline non autorisée."*

### Q5 : *"Que se passe-t-il si le service de notification est en panne lors d'un virement ?"*
- **Ta Réponse :**  
  > *"Notre architecture applique le principe de résilience par découplage : `transaction-service` valide le transfert comptable dans la base PostgreSQL puis émet un événement de notification de manière asynchrone (non-bloquante). Si `notification-service` est indisponible, le virement financier réussit tout de même et la notification est mise en file d'attente pour réessai sans bloquer le client bancaire."*

---

*Fiche validée par Amira Adolf (P2) — Prête pour la soutenance.*
