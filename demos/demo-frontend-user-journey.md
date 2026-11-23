# 📱 Guide de Démonstration Live : Parcours Utilisateur Bancaire & Frontend React
## Projet : OmniPay Zero-Trust (ESTC 2026)
### Rôle Démo : Amira Adolf (P2 — Lead Backend & Frontend)
**Durée de Démonstration :** 4 minutes chrono (Créneau : minutes 07:30 à 11:30 de la soutenance)  
**Accès Portail Web :** `https://app.omnipay.local` ou `http://localhost:8080`  

---

## 🎯 1. Objectifs de la Démonstration pour le Jury

Prouver devant le jury d'évaluation que la plateforme bancaire OmniPay combine :
1. **Une expérience utilisateur moderne et fluide** (React 18 Ultra, Glassmorphism 2.0, carte bancaire 3D interactive, retour sonore fintech, confettis de célébration).
2. **Une conformité Zero-Trust intégrale** : Chaque appel est authentifié par jeton JWT signé (ES256) transmis au format Bearer, contrôlé par RBAC (`CLIENT` vs `ADMIN`).
3. **Une robustesse financière absolue** :
   - Rejet immédiat de toute tentative de virement avec solde insuffisant (HTTP 422).
   - Garantie anti-double débit via la clé d'idempotence obligatoire (`X-Idempotency-Key` au format UUIDv4).
4. **L'alimentation en direct de la stack d'observabilité de Moad (P5)** via le lancement du test de charge k6.

---

## 👥 2. Données d'Essai & Comptes de Soutenance

| Identifiant | Rôle RBAC | Solde Initial | Rôle dans la Démo |
|:---|:---|:---:|:---|
| **`alice`** | `ROLE_USER` | **2 500,00 €** | Compte émetteur principal des virements de démonstration. |
| **`bob`** | `ROLE_USER` | **800,00 €** | Compte destinataire des virements. |
| **`admin`** | `ROLE_ADMIN` | **15 420,50 €** | Superviseur : accès à la console d'audit et aux outils d'injection jury. |
| **`auditor`** | `ROLE_AUDITOR` | — | Auditeur externe : accès en lecture seule stricte (formulaire désactivé). |

*(Mot de passe universel de démonstration : `password`)*

---

## 🎬 3. Déroulement Chronométré du Scénario Live (4 Minutes)

```
+---------------------------------------------------------------------------------------+
| 07:30 - 08:30 | ÉTAPE 1 : CONNEXION SÉCURISÉE & DÉCOUVERTE DU COFFRE-FORT REACT 18    |
+---------------------------------------------------------------------------------------+
| 08:30 - 09:30 | ÉTAPE 2 : CARTE 3D HOLOGRAPHIQUE & VIREMENT RÉALISTE AVEC CÉLÉBRATION |
+---------------------------------------------------------------------------------------+
| 09:30 - 10:30 | ÉTAPE 3 : TEST DU SOLDE INSUFFISANT & DÉMONSTRATION DE L'IDEMPOTENCE   |
+---------------------------------------------------------------------------------------+
| 10:30 - 11:30 | ÉTAPE 4 : CONTRÔLE RBAC & LANCEMENT DU TEST DE CHARGE K6 ARRIÈRE-PLAN  |
+---------------------------------------------------------------------------------------+
```

### Étape 1 : Connexion Sécurisée & Télémétrie Zero-Trust (07:30 - 08:30)
1. Ouvrir le navigateur en plein écran sur `https://app.omnipay.local`.
2. Cliquer sur le raccourci rapide `👤 Alice (2 500 €)`.
3. Constater l'authentification instantanée via `POST /api/auth/login` et l'affichage du jeton avec minuteur d'expiration.
4. Cliquer sur le badge **"Zero-Trust Active"** dans l'en-tête pour ouvrir le **Security HUD Modal** :
   - Montrer les latences des microservices en millisecondes (`Auth: 12ms`, `Tx: 18ms`, `Notif: 8ms`).
   - Souligner l'utilisation du protocole **TLS 1.3 Strict** et du capteur **Falco eBPF**.

### Étape 2 : Carte 3D Interactive & Virement Réaliste (08:30 - 09:30)
1. Passer la souris sur la carte bancaire virtuelle : montrer l'effet de **parallaxe 3D** et le reflet holographique changeant d'angle.
2. Cliquer sur la carte pour la retourner : révéler la bande magnétique, le cryptogramme dynamique (CVV 842) et cliquer sur *"📋 Copier l'IBAN"*.
3. Dans la section *"Bénéficiaires Fréquents"*, cliquer sur **Bob Martin (ACC-BOB-002)** :
   - L'IBAN se remplit automatiquement avec feedback sonore.
4. Cliquer sur le bouton montant rapide `+ 50 €` et saisir le motif *"Remboursement déjeuner équipe"*.
5. Cliquer sur **"Confirmer le virement sécurisé"** :
   - **Effet WOW :** Explosion de confettis néon sur tout l'écran + carillon sonore fintech.
   - Le solde passe instantanément de **2 500,00 €** à **2 450,00 €**.
   - La transaction apparaît en tête de liste dans l'historique avec le badge *"✔ Validé Zero-Trust"*.

### Étape 3 : Résilience Financière & Idempotence Anti-Doublon (09:30 - 10:30)
1. **Simulation de Dépassement de Solde :**
   - Saisir un montant de **10 000,00 €** et valider.
   - Constat : Notification toast rouge immédiate *"Solde insuffisant : disponible 2 450,00 € vs requis 10 000,00 €"*. Aucun appel erroné n'altère la base de données.
2. **Démonstration de l'Idempotence (`X-Idempotency-Key`) :**
   - Ouvrir la console Jury (`⚡ Outils Jury & Soutenance`).
   - Cliquer sur le bouton **"🛡️ Tester l'Idempotence (Double-Clic Simultané)"**.
   - Le système envoie deux requêtes POST rigoureusement identiques avec le même UUID :
     - La 1ère requête est exécutée et débitée.
     - La 2nde requête est interceptée par le middleware d'idempotence : réponse immédiate sans double débit.
   - Montrer la trace dans le terminal de log intégré.

### Étape 4 : Bascule de Rôle RBAC & Lancement du Tir de Charge k6 (10:30 - 11:30)
1. Dans la console Jury, cliquer sur **"Admin"** :
   - Déconnexion et reconnexion en 200ms. Le badge de rôle passe en `ROLE_ADMIN` doré, révélant le solde de trésorerie (15 420,50 €).
2. Cliquer sur l'onglet **"📊 Graphique"** au-dessus des transactions :
   - Montrer le diagramme SVG Donut interactif ventilant les dépenses par catégorie (Virements 45%, Services 30%, Assurances 25%).
3. Cliquer sur **"🚀 Injecter 50 Transactions k6"** :
   - Lancement du tir de charge k6 en arrière-plan pour alimenter en continu les dashboards Prometheus/Grafana et le tracing Tempo de Moad (P5).
4. Passer la parole à Aïcha (P3) pour la présentation de l'infrastructure Cloud et de HashiCorp Vault.

---

*Guide conçu et testé par Amira Adolf (P2) — ESTC 2026.*
