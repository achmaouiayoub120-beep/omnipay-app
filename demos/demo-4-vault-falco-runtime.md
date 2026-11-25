# Démonstration 4 — Gestion Dynamique des Secrets & Surveillance Runtime eBPF
## OmniPay Zero-Trust | Rôle P3 — Infrastructure K3s, Sécurité Runtime & Conformité (Semaine 4)

**Durée live : 3 minutes** | Slide 12 | Créneau P3 : minutes 12:00 à 18:00 (voir `docs/soutenance/memo-oral-p3.md`)

> *Message au jury : « Même si un attaquant entre dans un conteneur, il ne trouve aucun mot de passe dans Git, et nous le voyons au niveau du noyau Linux en temps réel. »*

---

## 🧰 Préparation (la veille, puis 10 minutes avant le passage)

```bash
kubectl get externalsecret -A                                   # STATUS = SecretSynced (3 namespaces)
kubectl get pods -n vault && kubectl get pods -n falco      # vault-0 Running 1/1 (descellé), falco + falcosidekick Running
./infra/vault/scripts/verify-vault-resilience.sh                # filet de sécurité : 3 scénarios OK
./infra/falco/scripts/trigger-falco-alerts.sh --attack all      # répétition : 3/3 attaque(s) détectée(s)
```

À ouvrir **avant** de monter sur scène, dans cet ordre :

| Fenêtre | Contenu |
|---|---|
| 1 | Navigateur : console Vault `http://<IP_NODE>:30006` déjà connecté (ou `http://localhost:30006` si tunnel / port-forward) |
| 2 | Terminal A : `kubectl logs -n falco -l app.kubernetes.io/name=falco -c falco -f \| grep --line-buffered -iE 'shell\|sensitive\|binary\|ZERO-TRUST'` |
| 3 | Terminal B : prêt à lancer `./infra/falco/scripts/trigger-falco-alerts.sh` |
| 4 | Grafana : dashboard sécurité de P5, panneau d'alertes Falco/Alertmanager (si le panneau n'est pas provisionné, utiliser l'UI Alertmanager) |

Token Vault : le copier avant la démo (`kubectl get secret vault-unseal-keys -n vault -o jsonpath='{.data.init\.json}' | base64 -d`), ne jamais l'afficher à l'écran.

---

## 🎬 Déroulé minute par minute

### Étape 1 — Secrets dynamiques (0:00 → 1:00)

| Temps | Action | À dire |
|---|---|---|
| 0:00 | Console Vault → **Secrets Engines → `secret/` (KV v2) → `omnipay/`** | « Tous les secrets d'OmniPay vivent ici, rangés par application : `database`, `jwt`. » |
| 0:20 | Ouvrir `omnipay/database` : valeurs masquées, historique de **versions** visible | « Chaque modification crée une version : on sait qui a changé quoi, et on peut revenir en arrière. » |
| 0:35 | Terminal B : `git grep -iE 'password\|secret' -- helm infra/external-secrets \| head` | « Dans Git, il n'y a que des **références** (`remoteRef: omnipay/database`) : aucun mot de passe. » |
| 0:50 | `kubectl get externalsecret -n omnipay-dev` → `SecretSynced` | « External Secrets Operator recopie le secret de Vault vers un Secret Kubernetes natif, sans que l'application ne parle à Vault. » |

### Étape 2 — Simulation d'attaque (1:00 → 2:00)

```bash
./infra/falco/scripts/trigger-falco-alerts.sh --attack all
```

| Attaque | Ce que fait le script | Règle Falco attendue |
|---|---|---|
| 1. Terminal interactif | `kubectl exec -it … -- /bin/sh` | *Terminal shell in container* (NOTICE) |
| 2. Lecture de fichier sensible | `cat /etc/shadow`, `cat /etc/sudoers` | *Read sensitive file untrusted* (WARNING) |
| 3. Modification de binaire | écriture dans `/usr/bin` | *Write below binary dir* (priorité selon version de Falco) |

À dire : *« Je joue l'attaquant : j'ai obtenu un accès dans un conteneur mal configuré. J'ouvre un shell, je cherche des mots de passe, j'essaie d'installer un outil. »*

> **Pourquoi un bac à sable `falco-demo` ?** Les pods `omnipay-*` tournent en non-root avec un système de fichiers en lecture seule (PSS `restricted`) : lire `/etc/shadow` ou écrire dans `/usr/bin` y est **déjà refusé**, donc rien à détecter. Le bac à sable simule le cas où une configuration est mauvaise : c'est là que Falco devient la dernière ligne de défense. À dire tel quel au jury, c'est un point fort (défense en profondeur).

### Étape 3 — Preuve de détection (2:00 → 3:00)

| Temps | Action | À dire |
|---|---|---|
| 2:00 | Terminal A (ou sortie du script) : lignes `>>> ALERTE FALCO` avec règle, utilisateur, commande, conteneur | « Chaque ligne est générée par le **driver eBPF dans le noyau**, au moment de l'appel système. » |
| 2:25 | Grafana / Alertmanager : l'alerte relayée par Falcosidekick | « L'alerte part vers Alertmanager : l'équipe d'astreinte est prévenue, sans lire de log. » |
| 2:45 | Le script supprime le namespace `falco-demo` : retour à l'état nominal | « Remise à l'état initial automatique : rien ne traîne. » |

---

## 🛟 Plan B

| Problème | Réaction |
|---|---|
| Le TTY n'est pas alloué (`shell` non détecté) | Lancer le script depuis un vrai terminal ; sinon enchaîner `--attack file` puis `--attack binary` |
| Pas d'accès Internet / image refusée par Kyverno | `IMAGE=<image signée du registre Harbor> ./infra/falco/scripts/trigger-falco-alerts.sh` |
| Vault scellé au démarrage de la démo | `./infra/vault/init-vault.sh` (idempotent) le déverrouille |
| Grafana sans panneau Falco | Montrer l'UI Alertmanager, ou `kubectl logs -n falco …` (preuve équivalente) |

---

## 🧪 Bonus si le jury demande « et si Vault tombe ? » (30 s)

```bash
./infra/vault/scripts/verify-vault-resilience.sh
```

Scelle Vault, constate que Secret et pods ne bougent pas, déverrouille, vérifie la reconnexion d'ESO, puis fait une rotation à chaud (secret de test dédié : la vraie base n'est pas touchée).

---

## 🧾 Limites à connaître (honnêteté = crédibilité)

- Vault stocke des secrets **KV v2 statiques**, changés à chaud via ESO. Les **credentials de base éphémères** (moteur *database* de Vault) sont une évolution, pas une fonction livrée.
- Falco **détecte**, il ne bloque pas : le blocage vient de PSS, des NetworkPolicies et de Kyverno.
- Vault est en HTTP à l'intérieur du cluster (TLS interne : amélioration prévue).
