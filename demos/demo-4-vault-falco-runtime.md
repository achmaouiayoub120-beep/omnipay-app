# Démonstration 4 — Secrets Dynamiques au Runtime (Vault) & Détection d'Intrusion Kernel (Falco)
## OmniPay Zero-Trust | Rôle P3 — Infrastructure K3s, Sécurité Runtime & Conformité (Semaine 3)

---

### 🎯 Objectif pour le Jury (Durée : 10 à 15 minutes)
Démontrer que même **après** la compromission d'un conteneur, OmniPay reste défendu :
> *"Aucun secret ne vit dans Git, un secret change sans redéploiement, et toute action suspecte dans un pod bancaire est détectée au niveau du noyau Linux."*

Deux scénarios :
1. **A — Secrets dynamiques** : on change un secret dans Vault, External Secrets Operator (ESO) le propage dans Kubernetes sans commit ni redéploiement.
2. **B — Intrusion** : un attaquant obtient un shell dans un pod ; Falco lève `[ZERO-TRUST INTRUSION]` et l'alerte part vers Alertmanager.

---

## 🏗️ Architecture

```
  Vault UI :30006 ─┐
                   ▼
           ┌───────────────┐   auth Kubernetes    ┌──────────────────────┐
           │  Vault (ns    │◀─────────────────────│ External Secrets Op. │
           │  vault)       │   lecture seule      │ (ns external-secrets)│
           │  KV v2 secret/│   secret/data/       └──────────┬───────────┘
           └───────────────┘   omnipay/*                     │ écrit des Secrets natifs
                                                              ▼
              omnipay-dev | recette | prod :  omnipay-postgres-credentials, omnipay-jwt-secret

  Pods omnipay-* ──syscalls──▶ Falco (eBPF, ns falco) ──▶ Falcosidekick ──▶ Alertmanager
```

---

## ✅ Préparation (avant le passage devant le jury)

Ordre d'installation, une seule fois (scripts `.sh` sous Linux/CI, `.ps1` sous Windows PowerShell 7+) :

```bash
./infra/vault/install-vault.sh              # Vault scellé, NodePort 30006
./infra/vault/init-vault.sh                 # init, unseal, KV v2, auth K8s, secrets aléatoires
./infra/external-secrets/install-eso.sh     # ESO + ClusterSecretStore + ExternalSecrets
./infra/falco/install-falco.sh              # Falco + règles bancaires + Falcosidekick
```

Prérequis : namespaces `omnipay-*` créés par Terraform (`infra/terraform/envs/*`), stack de monitoring de P5 dans `monitoring`.

Vérifications rapides la veille :

```bash
kubectl get externalsecret -A                                   # STATUS = SecretSynced (3 namespaces)
kubectl get pods -n falco                                       # falco + falcosidekick Running
./infra/scripts/test-falco-detection.sh                         # [OK] Intrusion interceptée
```

Récupérer le **token Vault** avant la démo, sans l'afficher à l'écran (le coller dans le presse-papiers) :

```bash
kubectl get secret vault-unseal-keys -n vault -o jsonpath='{.data.init\.json}' | base64 -d | sed -n 's/.*"root_token": *"\([^"]*\)".*/\1/p'
```

Déployer le pod de démonstration « victime » (Secret monté en **volume**, labels d'un vrai service pour hériter des NetworkPolicies) :

```bash
kubectl apply -n omnipay-dev -f - <<'EOF'
apiVersion: v1
kind: Pod
metadata:
  name: demo-victim
  labels:
    app.kubernetes.io/name: transaction
    app.kubernetes.io/part-of: omnipay
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 10001
    seccompProfile: { type: RuntimeDefault }
  containers:
    - name: demo-victim
      image: busybox:1.36
      command: ["sleep", "3600"]
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities: { drop: ["ALL"] }
      resources:
        requests: { cpu: 10m, memory: 16Mi }
        limits: { cpu: 50m, memory: 32Mi }
      volumeMounts:
        - { name: jwt, mountPath: /secrets/jwt, readOnly: true }
  volumes:
    - name: jwt
      secret: { secretName: omnipay-jwt-secret }
EOF
```

---

## 🎬 Déroulé

### Scénario A — Secrets dynamiques (≈ 5 min)

| # | Action | Ce que le jury voit |
|---|---|---|
| 1 | Ouvrir `http://<IP_NODE>:30006`, se connecter avec le token, aller dans `secret/omnipay/jwt` | Les secrets vivent dans Vault, pas dans Git. Rappeler : `git grep -i password` ne retrouve aucun secret |
| 2 | Empreinte du secret actuel dans le pod (on n'affiche jamais la valeur) :<br>`kubectl exec -n omnipay-dev demo-victim -- cat /secrets/jwt/JWT_SECRET \| sha256sum \| cut -c1-12` | Une empreinte, ex. `3f9a…` |
| 3 | Dans l'UI Vault : **Create new version** de `secret/omnipay/jwt`, nouvelle valeur du champ `secret` | Version 2 créée |
| 4 | Forcer la synchronisation (sinon elle a lieu au prochain intervalle, 1 h) :<br>`kubectl annotate externalsecret omnipay-jwt-secret -n omnipay-dev force-sync=$(date +%s) --overwrite` | `kubectl get externalsecret -n omnipay-dev` → `SecretSynced` |
| 5 | Refaire l'étape 2 (après ≈ 1 minute, le kubelet rafraîchit le volume) | **Empreinte différente**, pod jamais redémarré (`RESTARTS 0`) |

À dire : *« Une fuite ou un départ d'équipe se corrige en changeant la valeur dans Vault, sans commit, sans pipeline, sans downtime. »*
Limite à assumer si le jury la soulève : une **variable d'environnement** n'est relue qu'au redémarrage du conteneur ; avec plusieurs réplicas, un `rollout restart` reste sans interruption. Un Secret monté en volume, comme ici, se met à jour à chaud.

### Scénario B — Attaque et détection Falco (≈ 6 min)

Ouvrir **deux terminaux** : à gauche l'attaquant, à droite les alertes Falco.

Terminal « défenseur » :

```bash
kubectl logs -n falco -l app.kubernetes.io/name=falco -c falco -f | grep --line-buffered 'ZERO-TRUST INTRUSION'
```

Terminal « attaquant » :

```bash
# 1. L'attaquant obtient un shell dans le pod (RCE simulée par kubectl exec)
kubectl exec -it -n omnipay-dev demo-victim -- /bin/sh

# 2. Il tente de voler l'identité du pod
cat /var/run/secrets/kubernetes.io/serviceaccount/token | head -c 20

# 3. Il tente de lire la base de données et de sortir sur Internet
echo | nc -w 2 postgresql 5432       # NON : bloqué par la NetworkPolicy (ADR-009)
echo | nc -w 2 1.1.1.1 443           # NON : egress bloqué
```

| Étape attaquant | Défense | Preuve |
|---|---|---|
| Lancement de `/bin/sh` | **Falco règle 1** (CRITICAL) | `[ZERO-TRUST INTRUSION] Shell interactif lancé dans le pod bancaire demo-victim (Utilisateur: …, Commande: sh)` |
| Lecture du token ServiceAccount | **Falco règle 2** (CRITICAL) | `[ZERO-TRUST INTRUSION] Lecture de fichier sensible …/serviceaccount/token …` |
| `nc` | **Falco règle 3** (WARNING) + **NetworkPolicy** | Alerte Falco ; la connexion est rejetée par le réseau |
| `cat /etc/shadow` | **PSS restricted** : le conteneur tourne en non-root | « Permission denied » : l'ouverture échoue, donc rien à détecter |

Montrer ensuite l'alerte dans **Alertmanager** :

```bash
kubectl port-forward -n monitoring svc/kube-prometheus-stack-alertmanager 9093:9093
# puis ouvrir http://localhost:9093 : alertes portant le nom des règles Falco
```

Filet de sécurité si l'enchaînement manuel échoue en direct : `./infra/scripts/test-falco-detection.sh` (ou `.ps1`) rejoue l'intrusion et affiche `[OK] Intrusion interceptée par Falco en … ms` avec la ligne d'alerte.

À dire : *« Le pare-feu réseau limite ce que l'attaquant atteint, PSS limite ce qu'il peut faire, et Falco nous prévient immédiatement. Trois couches indépendantes. »*

---

## 🧹 Nettoyage

```bash
kubectl delete pod demo-victim -n omnipay-dev
```

---

## 📊 Preuves de Conformité PCI-DSS

| Exigence | Preuve présentée |
|---|---|
| 3.5 / 3.6 — protection et cycle de vie des secrets | Secret changé dans Vault sans commit ; aucun secret dans Git (scan Gitleaks) ; clés d'unseal en 2 parts sur 3 |
| 10.2 — journalisation des accès privilégiés | Alertes Falco horodatées (pod, utilisateur, commande) |
| 10.5 — protection des journaux | Alertes relayées vers Alertmanager ; collecte vers un stockage append-only à compléter (limite documentée, ADR-011) |

---

## ❓ Questions probables du jury

| Question | Réponse |
|---|---|
| « Que se passe-t-il si Vault redémarre ? » | Il redémarre scellé. `init-vault.sh` (idempotent) le déverrouille. En production : auto-unseal via un KMS. |
| « Falco bloque-t-il l'attaque ? » | Non, il détecte et alerte. Le blocage est assuré par PSS, les NetworkPolicies et Kyverno ; une réponse automatique (Falco Talon) est une évolution possible. |
| « Où sont les clés d'unseal ? » | Dans le Secret `vault/vault-unseal-keys`, acceptable en laboratoire. En production : coffre hors cluster, détenteurs distincts (PCI-DSS 3.6). |
| « Pourquoi pas Sealed Secrets ? » | Le secret chiffré reste dans Git et statique : pas de rotation ni de révocation immédiate (ADR-011). |
| « Pourquoi les pods ne parlent pas à Vault ? » | Seul ESO s'authentifie ; un pod compromis n'a donc aucun chemin vers Vault. |
