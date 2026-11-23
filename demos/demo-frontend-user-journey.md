# Démonstration Frontend — Parcours Client & Robustesse Bancaire

**Durée : 4 minutes · Présentatrice : Amira Adolf (P2) · Support : portail web `http://localhost:8080` (Nginx) · API réelle**

> Tout ce qui est montré ici passe par l'API réelle (JWT signé par `auth-service`, virements en base PostgreSQL). Rien n'est simulé côté
> navigateur, sauf le bouton « Injecter Panne Notification », explicitement présenté comme une simulation.

## Comptes de démonstration (soldes réels de la base)

| Compte | Rôle | Compte bancaire | Solde de départ |
|---|---|---|---|
| `alice` | `ROLE_USER` | `ACC-ALICE-001` | **1 000,00 €** |
| `bob` | `ROLE_USER` | `ACC-BOB-002` | **500,00 €** |
| `admin` | `ROLE_ADMIN` + `ROLE_USER` : supervision (historique de tous les comptes, peut débiter n'importe quel compte) | `ACC-ADMIN-004` | 50 000,00 € |
| `auditor` | `ROLE_AUDITOR` : audit en lecture seule | aucun | — |

> Écart avec le brief initial : le brief annonçait alice à 2 500,00 € et bob à 800,00 €. Ce sont les valeurs d'une maquette ; les migrations Flyway
> (`V1`) créent alice à 1 000,00 € et bob à 500,00 €. Le guide suit la base. Les mots de passe de démo ne sont pas reproduits ici : voir la section
> « Comptes de démonstration » de `docs/architecture/microservices-spec.md` et les saisir à la main.

## Avant de commencer (hors chrono)

```powershell
docker compose down -v ; docker compose up -d --build      # remet alice à 1 000 € et bob à 500 €
curl.exe -s http://localhost:8080/health                    # {"status":"UP"}
```

- `.env` doit contenir `OMNIPAY_CHAOS_ENABLED=true` si vous voulez aussi montrer le bouton « Simuler Erreur 500 ».
- Deux onglets : onglet 1 connecté en `alice`, onglet 2 (fenêtre privée) prêt à se connecter en `bob`.
- Ouvrir la console jury (« Outils Jury & Soutenance ») une première fois pour vérifier qu'elle s'affiche, puis la fermer.

## Scénario 1 — Authentification JWT et rôles RBAC (≈ 1 min)

1. Page de connexion : cliquer sur la pastille `alice` (elle pré-remplit l'identifiant), saisir le mot de passe, **Se connecter**.
2. Toast vert « Connexion réussie » avec les rôles. En haut : pastille `ROLE_USER` et compte à rebours du jeton (1 h).
3. Console jury → **Inspecter le Jeton JWT Décodé** : montrer `sub`, `roles`, `iss`, `exp`, algorithme **HS256** (le portail ne fait que décoder : la vérification de la signature est faite par le serveur à chaque appel).
4. RBAC en une phrase : se déconnecter, se connecter en `admin` (historique de **tous** les comptes, rôle `ROLE_ADMIN`), puis en `auditor`
   (bouton de virement désactivé ; côté API, un `POST` renvoie 403). Revenir sur `alice`.

> Message clé : le portail ne décide rien. Chaque appel est revérifié par le serveur (signature, émetteur, expiration, rôle) : posture Zero-Trust.

## Scénario 2 — Virement nominal de 250,00 € alice → bob, soldes en direct (≈ 1 min)

1. Alice : solde affiché **1 000,00 €**. Destinataire `ACC-BOB-002` (clic sur le contact « Bob »), montant `250`, motif « Remboursement », **Confirmer**.
2. Toast **vert** « Virement confirmé » avec l'**identifiant de transaction**, confettis.
3. Sans recharger la page : solde d'Alice **750,00 €**, nouvelle ligne `- 250,00 €` dans l'historique (auto-rafraîchissement après chaque transaction + toutes les 10 s).
4. Onglet 2 (bob) : solde **750,00 €** (500 + 250) et ligne `+ 250,00 €`, mis à jour tout seul au prochain rafraîchissement (≤ 10 s) ou après une action.
5. Bonus 20 s : console jury → **Injecter Panne Notification**, refaire un petit virement (ex. 10 €). Toast vert « Virement confirmé » **et** toast bleu
   « Notification indisponible (panne simulée) » : le paiement n'en dépend pas. Mentionner que la preuve réelle est
   `docker compose stop notification-service` (le virement reste `SUCCESS`, car `transaction-service` n'appelle jamais `notification-service`).

## Scénario 3 — Virement de 10 000,00 € rejeté en HTTP 422, message sécurisé (≈ 45 s)

1. Alice : montant `10000`, **Confirmer**.
2. Le serveur répond **HTTP 422** ; toast **rouge** : « Fonds insuffisants : solde disponible 750,00 € vs montant requis 10 000,00 € ».
3. Montrer dans le journal de la console jury : `HTTP 422 : virement rejeté (fonds insuffisants), aucun débit` ; le solde et l'historique ne changent pas.
4. Point sécurité : le corps d'erreur du serveur ne contient **aucun message interne** (`{"timestamp","status":422,"error":"Unprocessable Entity","path"}`) ; le texte lisible est
   construit par le portail à partir du code HTTP et du solde.

## Scénario 4 — Double-clic : idempotence sans double débit (≈ 1 min)

1. Alice : montant `100`, motif « Test idempotence ». Noter la **clé d'idempotence** affichée sous le formulaire.
2. **Cliquer 3 fois très vite** sur « Confirmer » (le bouton affiche « 3 requêtes, même clé »).
3. Résultat : un toast **vert** « Virement confirmé » et des toasts **jaunes** « Transaction déjà enregistrée, pas de double prélèvement » (statut `IDEMPOTENT_REPLAY`).
4. Solde d'Alice : **650,00 €** (750 − 100) et **une seule** ligne de 100,00 € dans l'historique.
5. Variante en un clic : console jury → **Tester l'Idempotence (double envoi)** : deux requêtes simultanées avec la même clé = un `SUCCESS` et un `IDEMPOTENT_REPLAY`.

> Mécanisme : la table `idempotency_keys` (clé primaire = SHA-256 de l'utilisateur et de la clé) est écrite dans la **même transaction SQL** que le débit. La seconde requête
> viole la clé primaire, est annulée, puis rejoue la réponse d'origine.

## Si quelque chose ne va pas

| Symptôme | Cause probable | Action |
|---|---|---|
| Pied de page « API injoignable » | microservices arrêtés | `docker compose up -d`, recharger |
| Toast rouge « Connexion refusée » | mauvais mot de passe | ressaisir ; 429 = trop d'essais (10/s par IP), patienter |
| « Injection désactivée » sur le bouton 500 | `OMNIPAY_CHAOS_ENABLED=false` ou compte non admin | l'activer dans `.env`, relancer, se connecter en `admin` |
| Soldes différents de 1 000 / 500 | démo déjà jouée | `docker compose down -v ; docker compose up -d` |
