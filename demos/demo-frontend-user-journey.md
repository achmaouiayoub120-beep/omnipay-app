# Démonstration Frontend — Parcours Client & Robustesse Bancaire

**Durée : 4 minutes · Présentatrice : Amira Adolf (P2) · Support : portail web React 18 (Obsidian & Champagne) · API réelle**

> Les virements, soldes, historiques et rejets passent par l'API réelle (JWT signé par `auth-service`, virements en base PostgreSQL). Deux éléments restent
> des **simulations côté navigateur**, à présenter comme telles : le code MFA (n'importe quel code à 6 chiffres est accepté) et la « panne » du service de notification.

## Comptes de démonstration (soldes réels de la base)

| Compte | Rôle | Compte bancaire | Solde de départ |
|---|---|---|---|
| `alice` | `ROLE_USER` | `ACC-ALICE-001` | **1 000,00 €** |
| `bob` | `ROLE_USER` | `ACC-BOB-002` | **500,00 €** |
| `admin` | `ROLE_ADMIN` + `ROLE_USER` : audit et supervision (historique de tous les comptes, Tour de Contrôle, peut débiter n'importe quel compte) | `ACC-ADMIN-004` | 50 000,00 € |
| `auditor` | `ROLE_AUDITOR` : audit en lecture seule | aucun | — |

> Écart avec le brief initial : alice à 2 500,00 € et bob à 800,00 € sont les valeurs d'une maquette ; les migrations Flyway créent alice à 1 000,00 € et bob à 500,00 €.
> Le guide suit la base. Les mots de passe de démo ne sont pas reproduits ici : voir « Comptes de démonstration » dans `docs/architecture/microservices-spec.md` et les saisir à la main.

## Avant de commencer (hors chrono)

```powershell
docker compose down -v ; docker compose up -d --build      # remet alice à 1 000 € et bob à 500 €
cd services/frontend ; npm ci --legacy-peer-deps ; npm run dev   # portail sur http://localhost:3000 (proxy /api vers les microservices)
```

- Le portail appelle `http://localhost:8082` pour les virements (variable `VITE_API_URL` pour changer la cible) : les microservices doivent tourner sur la même machine.
- Deux onglets : onglet 1 pour `alice`, onglet 2 (fenêtre privée) pour `bob`. Le jeton vit en mémoire : **recharger la page déconnecte**.
- Pour la panne notification, il faut ouvrir la Tour de Contrôle, réservée à `admin` (bouton « Mode Jury » ou `Ctrl+Shift+J`). L'état de la panne est conservé en mémoire tant que
  la page n'est pas rechargée : injectez-la **avant** de vous connecter en `alice` (voir scénario 2, étape 5).

## Scénario 1 — Authentification JWT et rôles RBAC (≈ 1 min)

1. Page de connexion : identifiant `alice`, mot de passe de démo, **Se connecter**. Le serveur renvoie un vrai JWT (HS256, 1 h) conservé **en mémoire** (jamais en `localStorage`).
2. Fenêtre « Double authentification » : saisir un code à 6 chiffres (**simulation** : tout code à 6 chiffres est accepté, il n'y a pas de MFA côté serveur).
3. Tableau de bord : « Client Titulaire de Compte », solde réel **1 000,00 €**, IBAN d'`ACC-ALICE-001`.
4. RBAC en une phrase : se déconnecter puis se connecter en `admin` (historique de **tous** les comptes, bouton « Mode Jury ») et en `auditor` (virements désactivés ; côté API, un `POST` renvoie 403).

> Message clé : le portail ne décide rien. Chaque appel est revérifié par le serveur (signature, émetteur, expiration, rôle) : posture Zero-Trust.

## Scénario 2 — Virement nominal de 250,00 € alice → bob, soldes en direct (≈ 1 min)

1. Alice : onglet **Virements**, bénéficiaire **Bob Martin**, montant `250`, motif « Remboursement », **Vérifier le récapitulatif**, **Authentifier le virement**, code à 6 chiffres, **Confirmer le virement**.
2. Toast **vert** « Virement confirmé » avec le montant, le bénéficiaire et l'**identifiant de transaction** ; le reçu affiche la même référence.
3. Sans recharger la page : retour sur **Vue d'ensemble**, solde d'Alice **750,00 €**, nouvelle ligne `- 250,00 €` dans **Historique** (relecture automatique après chaque virement, puis toutes les 10 s).
4. Onglet 2 (bob, connecté avant) : solde **750,00 €** (500 + 250) au prochain rafraîchissement automatique (≤ 10 s).
5. Panne notification (à préparer en amont) : connectée en `admin`, ouvrir la Tour de Contrôle, section « Console démo applicative », **Injecter Panne Notification** (toast rouge « Panne injectée »), fermer, se déconnecter,
   se reconnecter en `alice` **sans recharger la page** et refaire un petit virement (ex. 10 €) : toast vert « Virement confirmé » **et** toast bleu « Notification indisponible (panne simulée) ».
   Dire clairement que c'est une **simulation** ; la preuve réelle est `docker compose stop notification-service` : le virement reste `SUCCESS` car `transaction-service` n'appelle jamais `notification-service`.
   Rétablir avec **Rétablir le Service Notification**.

## Scénario 3 — Virement rejeté en HTTP 422, message sécurisé (≈ 45 s)

> Changement par rapport à la version précédente du guide : le montant est de **5 000,00 €** et non 10 000,00 €. Le portail plafonne la saisie à 5 000,00 € par jour (contrôle côté client) ;
> 5 000,00 € passe donc le plafond mais dépasse le solde d'Alice : c'est le **serveur** qui refuse.

1. Alice : bénéficiaire Bob, montant `5000`. L'écran Montant affiche un simple avertissement « le serveur refusera ce virement (HTTP 422) » mais ne bloque pas.
2. Poursuivre jusqu'à **Confirmer le virement** : le serveur répond **HTTP 422** ; toast **rouge** « Fonds insuffisants : solde disponible 1 000,00 € vs montant requis 5 000,00 € » (avec le solde d'Alice à cet instant).
3. Le solde et l'historique ne changent pas, aucun reçu n'est émis.
4. Point sécurité : le corps d'erreur du serveur ne contient **aucun message interne** (`{"timestamp","status":422,"error":"Unprocessable Entity","path"}`) ; le texte lisible est construit par le portail à partir du code HTTP et du solde relu.

## Scénario 4 — Triple clic : idempotence sans double débit (≈ 1 min)

1. Alice : montant `100`, motif « Test idempotence », jusqu'à l'étape **Sécurité MFA**. Le récapitulatif montrait la **clé d'idempotence** générée pour cette intention.
2. **Cliquer 3 fois très vite** sur « Confirmer le virement » (le bouton n'est volontairement pas bloqué : il affiche « 3 requêtes, même clé »).
3. Résultat : un toast **vert** « Virement confirmé » et deux toasts **jaunes** « Requête dupliquée interceptée : Transaction déjà enregistrée, pas de double prélèvement » (statut `IDEMPOTENT_REPLAY`).
4. Solde d'Alice : **une seule** ligne de 100,00 € dans l'historique et un seul débit.
5. Si l'écran affiche une erreur réseau ou 5xx : recliquer ; la **même clé** est réutilisée, le serveur ne débitera qu'une fois. Une saisie différente (autre montant, autre motif ou autre bénéficiaire) génère une nouvelle clé.

> Mécanisme : la table `idempotency_keys` (clé primaire = SHA-256 de l'utilisateur et de la clé) est écrite dans la **même transaction SQL** que le débit. La seconde requête
> viole la clé primaire, est annulée, puis rejoue la réponse d'origine.

## Si quelque chose ne va pas

| Symptôme | Cause probable | Action |
|---|---|---|
| « Identifiant ou mot de passe incorrect » | mauvais mot de passe | ressaisir ; 429 = trop d'essais (10/s par IP), patienter |
| Toast rouge « Réseau indisponible » | microservices arrêtés ou mauvaise URL | `docker compose up -d` ; aucun succès n'est jamais simulé |
| Connexion « réussie » avec n'importe quel mot de passe | backend d'authentification injoignable : le portail bascule sur un mode démo hors-ligne | démarrer `auth-service` ; ne pas démontrer dans cet état |
| Soldes différents de 1 000 / 500 | démo déjà jouée | `docker compose down -v ; docker compose up -d` |
| Pas de bouton « Mode Jury » | session non `admin` | se connecter en `admin` ou `Ctrl+Shift+J` |
