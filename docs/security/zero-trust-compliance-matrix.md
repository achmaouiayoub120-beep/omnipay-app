# Matrice de Conformité Sécurité Zero-Trust — OmniPay
**Périmètre :** socle infrastructure et sécurité runtime (P3) | **Version :** Semaine 4 | **Références :** ADR-009, ADR-011, `docs/security/threat-model-stride.md`

Légende : ✅ implémenté et vérifiable dans le dépôt · 🟡 partiel ou limite connue · 🔲 non implémenté (évolution)

## Synthèse

| Pilier | Objectif | Contrôles ✅ | 🟡 | 🔲 |
|---|---|:-:|:-:|:-:|
| 1. Micro-segmentation réseau | Aucun flux non déclaré | 5 | 1 | 0 |
| 2. Chiffrement et données | Aucun secret statique, données protégées | 4 | 2 | 1 |
| 3. Identité et moindre privilège | Chaque composant n'a que ses droits | 4 | 1 | 1 |
| 4. Surveillance runtime | Voir tout comportement anormal | 4 | 1 | 0 |

---

## Pilier 1 — Micro-segmentation réseau

| # | Contrôle | Implémentation | Vérification | État |
|---|---|---|---|:-:|
| 1.1 | Refus par défaut (Ingress + Egress) dans chaque namespace applicatif | `infra/network-policies/default-deny-all.yaml` | `kubectl get netpol -n omnipay-dev` | ✅ |
| 1.2 | Flux inter-services déclarés port par port | `allow-bank-flows.yaml` (Ingress NGINX → auth/transaction, services → PostgreSQL 5432, transaction → notification 8083, Prometheus, DNS) | `./infra/scripts/test-network-policies.sh` | ✅ |
| 1.3 | `notification` ne peut pas joindre PostgreSQL ; pas de sortie Internet | idem (test B et C du script) | idem | ✅ |
| 1.4 | Isolation dev / recette / prod | un namespace par environnement, PSS `restricted`, quotas, états Terraform séparés | `infra/terraform/envs/*`, `kubectl get ns --show-labels` | ✅ |
| 1.5 | Pods applicatifs sans accès à Vault | egress deny-all dans `omnipay-*` : aucun chemin vers `vault.vault.svc` ; seul ESO (`external-secrets`) parle à Vault | `kubectl exec` d'un pod de test vers `vault.vault:8200` → timeout | ✅ |
| 1.6 | Restriction des entrées vers le namespace `vault` | **aucune NetworkPolicy dans `vault`** ; UI exposée en NodePort 30006 | — | 🟡 |

> Écart assumé 1.6 : à traiter par une NetworkPolicy n'autorisant que `external-secrets` vers 8200 (et l'accès administrateur à l'UI). Non livrée ici.

## Pilier 2 — Chiffrement et données

| # | Contrôle | Implémentation | Vérification | État |
|---|---|---|---|:-:|
| 2.1 | TLS en entrée | Ingress NGINX + cert-manager (CA interne), HSTS, redirection HTTPS | `infra/ingress/*`, `curl -I https://api.omnipay.local` | ✅ |
| 2.2 | Aucun secret dans Git | valeurs générées dans Vault par `init-vault.sh` ; Gitleaks en CI ; manifests = références seulement | `git grep -iE 'password\|secret'`, pipeline Gitleaks | ✅ |
| 2.3 | Secrets centralisés et auditables | Vault KV v2 (versions), politique en lecture seule `secret/data/omnipay/*` | console Vault, `verify-vault-resilience.sh` | ✅ |
| 2.4 | Rotation à chaud sans redéploiement | ESO resynchronise Vault → Secret K8s (`refreshInterval: 1h`, resynchro immédiate par annotation) | Scénario 3 de `verify-vault-resilience.sh` | ✅ |
| 2.5 | Chiffrement des données au repos dans Vault | barrière Vault (AES-256-GCM, comportement natif) | documentation Vault | 🟡 |
| 2.6 | Secrets Kubernetes dans etcd | ESO crée des Secrets natifs (base64) ; chiffrement etcd non vérifié (`k3s --secrets-encryption`) | — | 🟡 |
| 2.7 | Credentials de base **éphémères** (moteur *database* de Vault, TTL court) | **non implémenté** : le mot de passe est un secret KV, changé à la demande | — | 🔲 |

> Honnêteté : Vault est aujourd'hui un **coffre à secrets rotatables**, pas encore un émetteur de credentials éphémères. 2.5 et 2.6 sont 🟡 : 2.5 repose sur le comportement natif de Vault (non testé ici), 2.6 sur une option K3s qu'il faut activer et vérifier.

## Pilier 3 — Identité et moindre privilège

| # | Contrôle | Implémentation | Vérification | État |
|---|---|---|---|:-:|
| 3.1 | Aucun conteneur root, pas d'escalade de privilèges | PSS `restricted` (enforce) sur `omnipay-*` ; `runAsNonRoot`, `seccompProfile: RuntimeDefault`, `capabilities.drop: [ALL]` | `helm/omnipay/values.yaml`, `kubectl get ns --show-labels` | ✅ |
| 3.2 | Politique Vault au moindre privilège | `omnipay-app-policy` : lecture seule sur `secret/data/omnipay/*` | `vault policy read omnipay-app-policy` | ✅ |
| 3.3 | Identité machine dédiée pour ESO | ServiceAccount `external-secrets/eso-vault-auth` lié au rôle `omnipay-role` | `infra/external-secrets/cluster-secret-store.yaml` | ✅ |
| 3.4 | Admission d'images signées | Kyverno + Cosign (périmètre P4) | voir ADR du dépôt GitOps | ✅ |
| 3.5 | RBAC restreint | non audité dans ce lot (pas de Role/RoleBinding applicatifs livrés) | — | 🟡 |
| 3.6 | ServiceAccount dédié par microservice, `automountServiceAccountToken: false` | **absent du chart Helm** : les pods utilisent le ServiceAccount `default` | `grep -rn serviceAccount helm/` → vide | 🔲 |

> Écart 3.6 : à corriger dans le chart (un `ServiceAccount` par service, jeton non monté). La règle Falco 2 surveille d'ailleurs la lecture du jeton ServiceAccount.

## Pilier 4 — Surveillance runtime

| # | Contrôle | Implémentation | Vérification | État |
|---|---|---|---|:-:|
| 4.1 | Détection au niveau syscalls (eBPF) | Falco, sonde *modern eBPF* (aucun module noyau à compiler) | `kubectl logs -n falco -l app.kubernetes.io/name=falco -c falco` | ✅ |
| 4.2 | Règles par défaut + règles bancaires | shell, lecture de `/etc/shadow` et du jeton SA, outils réseau dans `omnipay-*` | `infra/falco/falco-banking-rules.yaml` | ✅ |
| 4.3 | Alertes relayées | Falcosidekick → Alertmanager (`minimumpriority: warning`) | UI Alertmanager | ✅ |
| 4.4 | Démonstration reproductible | `trigger-falco-alerts.sh/.ps1` (3 attaques, alerte affichée, nettoyage) | exécuter le script | ✅ |
| 4.5 | Réponse automatique / blocage | Falco **détecte uniquement** ; pas de Falco Talon | — | 🟡 |

---

## Résilience et reprise d'activité (DORA)

| Indicateur | Cible | Périmètre | Comment le mesurer |
|---|---|---|---|
| **RTO** | < 15 min | reconstruction complète depuis Git (runbook P1 « Zero to Hero ») | chronométrer ; brique Terraform seule : `infra/scripts/measure-terraform-rto.sh --yes` |
| **RPO configuration** | 0 | définition de l'infrastructure, politiques, manifests : tout est dans Git | `git log` |
| **RPO données Vault** | **non nul** (dernière sauvegarde) | base de Vault sur PVC `local-path` : **aucune sauvegarde automatique livrée** | sauvegarde du PVC ou migration vers Raft + `vault operator raft snapshot` |
| Résilience Vault / ESO | secrets disponibles pendant une panne de Vault | Secret K8s et pods inchangés si Vault est scellé ; reconnexion automatique à l'unseal | `infra/vault/scripts/verify-vault-resilience.sh` |

> Après un sinistre qui détruit le PVC de Vault, `init-vault.sh` recrée un Vault **vide** avec de nouvelles valeurs aléatoires : le RPO de configuration est 0, celui des données de Vault ne l'est pas.

## Preuves à joindre pour l'audit

1. Sortie de `verify-vault-resilience.sh` (3 scénarios OK).
2. Sortie de `trigger-falco-alerts.sh --attack all` (3/3 détectées) et capture de l'alerte dans Alertmanager.
3. Sortie de `test-network-policies.sh` et `audit-iac.sh`.
4. Durée mesurée du test de reprise (runbook P1) avec date et opérateur.
