# Fiche mémo oral — P2 (Amira Adolf)
## Rôle : développement backend Spring Boot et lead frontend web — OmniPay Zero-Trust (ESTC 2026)

**Créneau : 06:00 → 12:00 (6 minutes).** Passage de relais reçu d'Ayoub (P1, fin à 06:00), relais donné à Aïcha (P3, à 12:00).
Supports : slides 5 à 8 (`docs/soutenance/slides-soutenance-omnipay.md`), guide de démo `demos/demo-frontend-user-journey.md`.

> Ce mémo décrit ce que le code fait **réellement** (relu le 23/11/2026). Les écarts avec d'anciennes formulations (jeton ES256, file asynchrone de
> notifications, table `idempotency_records`) sont corrigés : ne dis rien de plus fort que ce qui est écrit ici.

---

## 0. Avant de monter (à faire avant 06:00)

```powershell
docker compose up -d                                        # stack déjà démarrée et saine
$env:K6_ALICE_PASSWORD = Read-Host -MaskInput 'alice'       # mots de passe saisis à la main, jamais commités
$env:K6_BOB_PASSWORD   = Read-Host -MaskInput 'bob'
./tests/load/run-load-test.ps1 -Check                       # vérifie k6/Docker et la santé des services
```

- Terminal prêt avec le lanceur k6 (une ligne à valider au moment voulu). Soldes à vérifier : alice **1 000,00 €**, bob **500,00 €** (sinon `docker compose down -v ; docker compose up -d`).
- Onglet 1 : portail sur la page de connexion. Onglet 2 (privé) : portail pour `bob`. Console jury fermée.
- Avec Moad (P5) : Grafana/Tempo ouverts sur le tableau de bord des API ; confirmer l'origine du trafic.

## 1. Timing minute par minute

| Heure | Durée | Action | Support |
|---|---|---|---|
| **06:00** | 0:15 | Reprise de parole : « Merci Ayoub. » Se présenter en une phrase | — |
| 06:15 | 1:15 | **Discours d'architecture** (3 services, découplage, JWT stateless, résilience) | slides 5-6 |
| 07:30 | 0:20 | Démo, scénario 1 : connexion `alice` (JWT décodé, rôles) | portail |
| 07:50 | 1:00 | Scénario 2 : virement de 250 € alice → bob, soldes mis à jour sans recharger | portail |
| 08:50 | 0:50 | Scénario 3 : virement de 10 000 € rejeté, HTTP 422, toast rouge | portail |
| 09:40 | 1:00 | Scénario 4 : triple clic = une seule exécution, toasts jaunes | portail |
| 10:40 | 0:20 | **Panne notification** (console jury) : le virement reste validé | console jury |
| 11:00 | 0:30 | **Lancer k6 en arrière-plan** et l'annoncer | terminal |
| 11:30 | 0:20 | Bilan applicatif en trois points | — |
| **11:50** | 0:10 | **Phrase de transition vers Aïcha (P3)** | — |

Si tu prends du retard : coupe le scénario 1 (déjà montré par Ayoub si besoin) et la panne notification, **jamais** la transition. Cible de sortie : 12:00 pile.

## 2. Script — discours d'architecture (06:00 → 07:30)

> « Merci Ayoub. Je suis Amira Adolf, j'ai écrit le backend Spring Boot et le portail web d'OmniPay.
>
> Notre cœur bancaire est découpé en **trois microservices Spring Boot 3, Java 21**, chacun déployable seul.
> **auth-service**, port 8081 : vérifie les identifiants en base avec BCrypt et émet un jeton **JWT signé, avec les rôles**.
> **transaction-service**, port 8082 : les comptes, les virements et l'historique, dans PostgreSQL dont le schéma est versionné par Flyway.
> **notification-service**, port 8083 : l'envoi de notifications, simulé par journalisation.
>
> Trois choix d'architecture. **Premier : le JWT est stateless.** auth-service signe, transaction-service vérifie signature, émetteur et expiration à chaque appel, sans session
> ni appel à auth-service : on peut multiplier les réplicas sans partager d'état. Les rôles voyagent dans le jeton, ce qui donne notre RBAC : USER, ADMIN, AUDITOR en lecture seule.
> **Deuxième : le virement est atomique et idempotent.** Débit, crédit et historique sont validés dans une seule transaction SQL, et un en-tête `X-Idempotency-Key` empêche tout double débit.
> **Troisième : le découplage.** transaction-service n'appelle pas notification-service : une panne de la notification ne peut pas bloquer un paiement.
>
> Côté portail : une application React 18 servie par Nginx non-root, sans aucune ressource externe, avec une politique CSP stricte. Je vous la montre en direct. »

## 3. Script — guidage de la démo (07:30 → 10:40)

Suivre `demos/demo-frontend-user-journey.md`. Phrases d'appui, scénario par scénario :

1. **Connexion (07:30).** « Je me connecte en alice. Le serveur me renvoie un vrai JWT ; le portail le décode juste pour l'afficher : algorithme HS256, rôle USER, expiration dans une heure. »
2. **Virement nominal (07:50).** « Alice a 1 000 euros. J'envoie 250 euros à Bob. Toast vert avec l'identifiant de transaction. Sans recharger : 750 euros côté Alice, et dans l'autre onglet Bob est passé à 750 aussi. »
3. **Rejet (08:50).** « Maintenant 10 000 euros. Le serveur répond 422, rien n'est débité, et le message est volontairement sobre : aucun détail interne ne sort du serveur. »
4. **Idempotence (09:40).** « Je clique trois fois. Même clé d'idempotence, trois requêtes ; le serveur en exécute une, et rejoue la réponse pour les deux autres : toast jaune. Une seule ligne dans l'historique, un seul débit. »
5. **Panne notification (10:40).** « Je coupe le service de notification, ici en simulation dans l'interface ; pour une vraie coupure, `docker compose stop notification-service`. Je refais un virement : il passe. Le paiement ne dépend pas de la notification. »

Gestes : toujours annoncer ce que tu cliques avant de cliquer ; laisser 2 secondes sur chaque toast ; ne jamais saisir de mot de passe à voix haute (le saisir avant la démo ou masquer l'écran).

## 4. Lancement de k6 en arrière-plan (11:00)

> « Pour prouver la tenue en charge, je lance maintenant notre test k6 : de 0 à 150 utilisateurs virtuels qui s'authentifient avec alice et bob, consultent solde et historique, et envoient des virements
> avec une clé d'idempotence unique. Ce trafic réel alimente les traces Tempo et les tableaux Grafana de Moad, qu'il vous montrera. »

```powershell
./tests/load/run-load-test.ps1          # PowerShell 7+ ; ajouter & en Bash : tests/load/run-load-test.sh &
```

- Durée du profil complet : **2 min 10** (20 s de montée à 50 VUs, 1 min 30 jusqu'à 150, 20 s de descente). Lancé à 11:00, il se termine vers 13:10.
- **Pour que les graphiques de Moad (24:00 → 30:00) soient vivants, relance-le vers 22:30** (même commande, dans le même terminal) ; Grafana conserve l'historique des deux passes.
- L'export vers Prometheus/Grafana se branche avec `K6_OUT=experimental-prometheus-rw` et `K6_PROMETHEUS_RW_SERVER_URL` (à convenir avec Moad). Sans cela, les traces Tempo viennent des appels HTTP eux-mêmes.
- Résultat mesuré le 23/11 sur le poste de développement (Docker Desktop, stack locale) : **0 % d'erreurs, 100 % des vérifications réussies, mais p(95) des virements ≈ 1,5 s**, donc le seuil
  « p95 < 250 ms » **n'est pas atteint** sous 150 VUs (voir Q5). Ne dis jamais « le seuil est respecté ».

## 5. Transition exacte vers Aïcha (11:50)

> « Tout ce trafic circule dans un cluster qu'il faut protéger : je cède la parole à **Aïcha El Mahdaoui**, ingénieure Infrastructure et Sécurité Runtime, qui va vous montrer comment K3s, Vault et Falco isolent et surveillent ces flux. »

Rester sur l'écran du portail jusqu'à ce qu'Aïcha prenne la main. Ne pas arrêter k6.

## 6. Top 5 des questions pièges (réponses fidèles au code)

### Q1. « Comment gérez-vous les transactions distribuées ? Pourquoi pas une Saga ? »
> « Aujourd'hui nous n'avons pas de transaction distribuée, donc pas de Saga, et c'est un choix. Un virement ne touche qu'**une** base : `accounts`, `transactions` et `idempotency_keys` sont dans
> transaction-service. Débit, crédit et historique sont validés dans une seule transaction SQL ACID, avec verrouillage `SELECT … FOR UPDATE` des deux comptes dans l'ordre de leurs identifiants,
> ce qui évite les interblocages. Le service d'authentification a sa propre base et n'est jamais dans le chemin d'écriture. Si demain un virement devait appeler un autre service (notification fiable, antifraude),
> nous passerions à un **outbox transactionnel** (événement écrit dans la même transaction, publié après commit) et à une Saga avec compensation. »

*Limite à assumer si on insiste :* il n'y a pas de clé étrangère entre `transactions` et `accounts` ; l'intégrité repose sur le code et les verrous.

### Q2. « Pourquoi le JWT est-il côté client ? Et en HS256 ? »
> « Parce que nous voulons des services sans session : le jeton porte l'identité et les rôles, signés, et chaque service le revérifie. Le portail le garde en `sessionStorage` : il disparaît à la fermeture de l'onglet,
> et la politique CSP `script-src 'self'` avec zéro `innerHTML` dans notre code réduit le risque XSS. Le jeton expire en **1 heure**. Limites connues : pas de révocation ni de refresh token, et un XSS reste le scénario à craindre ;
> l'alternative serait un cookie HttpOnly avec protection CSRF. Ensuite, la signature est **HS256, donc symétrique** : auth-service et transaction-service partagent le secret `OMNIPAY_JWT_SECRET`
> (jamais dans Git ; Secret Kubernetes, Vault et External Secrets en cluster). Le service refuse de démarrer s'il fait moins de 32 octets. L'évolution naturelle est une signature asymétrique (ES256/RS256) avec clé publique
> distribuée aux services, pour qu'un service qui vérifie ne puisse pas fabriquer un jeton. »

### Q3. « Comment l'idempotence est-elle garantie en base ? »
> « La table `idempotency_keys` a pour clé primaire le **SHA-256 de l'utilisateur et de la clé reçue** : une clé est donc propre à son utilisateur et sa taille est bornée. Le virement et l'insertion de la clé sont validés dans
> **la même transaction SQL** : soit les deux, soit aucun. Une requête qui arrive avec une clé connue reçoit la réponse d'origine (même `transactionId`, statut `IDEMPOTENT_REPLAY`, HTTP 200) sans rien réexécuter.
> Si deux requêtes identiques arrivent **en même temps**, c'est la base qui arbitre : la seconde échoue sur la clé primaire (`DuplicateKeyException`), est annulée, puis relit et rejoue la réponse de la première. C'est ce que le triple clic montre en direct. »

*Limites à assumer :* seuls les succès sont mémorisés (un 422 peut être retenté avec la même clé) ; la réponse rejouée n'est pas comparée au corps de la nouvelle requête ; la table n'est pas purgée automatiquement (index prêt sur `created_at`).

### Q4. « Que se passe-t-il si le notification-service tombe pendant un virement ? »
> « Rien pour le client : transaction-service n'appelle jamais notification-service. Il n'y a pas de file ni de réessai : la notification est un service indépendant, simulé par journalisation. Le bouton de la console jury
> simule la panne dans l'interface ; la vraie preuve est `docker compose stop notification-service`, après quoi le virement reste `SUCCESS`. Ce que nous n'avons pas : une notification garantie après coup. C'est là que l'outbox de la question 1 s'appliquerait. »

*Ne dis pas* « asynchrone » ni « mise en file d'attente » : ce n'est pas implémenté.

### Q5. « Vos tests de charge passent-ils vos seuils ? Qu'est-ce qui limite ? »
> « Le test tient la charge sans une seule erreur : 150 utilisateurs virtuels, 0 % d'échec, toutes les vérifications réussies. En revanche, sur notre poste, la latence p95 des virements est d'environ 1,5 seconde,
> au-dessus de notre objectif de 250 millisecondes. La cause identifiée : notre scénario fait passer tous les virements par les **deux mêmes comptes**, alice et bob, et le verrouillage pessimiste les exécute l'un après l'autre.
> À un seul utilisateur, le p95 est de 38 millisecondes. Les pistes : répartir la charge sur davantage de comptes, mesurer sur le cluster plutôt que sur un portable, et indexer l'historique. »

*Chiffres :* profil complet 23/11 : 16 435 requêtes, 126 req/s, 5 428 itérations, p95 global 1,46 s, p95 virements 1,48 s ; profil `--smoke` (1 VU) : p95 virements 38 ms. Mesures locales : à présenter comme telles.

### Questions de réserve (une ligne chacune)
- *Pourquoi React sans framework ?* Pas de serveur Node en production, une application statique sous Nginx non-root, CSP stricte, tout fonctionne hors ligne.
- *Où sont les mots de passe ?* BCrypt en base ; aucun mot de passe de démo dans le code du portail ni dans les scripts k6 (variables d'environnement).
- *Pourquoi un 422 et pas un 400 ?* La requête est valide mais l'état du compte (solde) interdit l'opération.
- *Il n'y a pas d'entités JPA ?* Exact : accès SQL explicite par `JdbcClient`, schéma versionné par Flyway.

---

*Dernière relecture : 23/11/2026 — comportements vérifiés dans le code et sur la stack locale.*
