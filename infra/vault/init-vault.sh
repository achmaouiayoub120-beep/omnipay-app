#!/usr/bin/env bash
# Initialise, deverrouille et provisionne Vault (idempotent, sans intervention manuelle).
#
#  1. attend vault-0
#  2. operator init (3 parts, seuil 2) -> Secret K8s "vault-unseal-keys" (jamais sur disque ni dans Git)
#  3. unseal avec 2 cles
#  4. KV v2 sur secret/, auth Kubernetes, politique omnipay-app-policy, role omnipay-role
#  5. secrets bancaires initiaux GENERES ALEATOIREMENT dans le pod (aucun mot de passe dans Git)
#
# Les valeurs initiales n'existent qu'a l'interieur de Vault : les changer via l'UI (port 30006)
# ou `vault kv put`. Le role est lie au ServiceAccount d'External Secrets Operator : les pods
# applicatifs ne parlent jamais a Vault.
set -euo pipefail

NS="vault"
POD="vault-0"
KEYS_SECRET="vault-unseal-keys"
ESO_NS="${ESO_NAMESPACE:-external-secrets}"
ESO_SA="${ESO_SERVICE_ACCOUNT:-eso-vault-auth}"

command -v kubectl >/dev/null 2>&1 || { echo "kubectl introuvable" >&2; exit 2; }

vexec() { kubectl exec -n "$NS" "$POD" -c vault -- "$@"; }
vexec_token() { kubectl exec -i -n "$NS" "$POD" -c vault -- env "VAULT_TOKEN=${ROOT_TOKEN}" "$@"; }
# vault status : code 0 = deverrouille, 2 = scelle, 1 = erreur. On lit la sortie dans tous les cas.
vstatus() { vexec vault status -format=json 2>/dev/null || true; }

echo "== 1/5 Attente de ${POD}"
for _ in $(seq 1 90); do
  phase="$(kubectl get pod -n "$NS" "$POD" -o jsonpath='{.status.phase}' 2>/dev/null || true)"
  if [ "$phase" = "Running" ] && vstatus | grep -q '"initialized"'; then break; fi
  sleep 2
done
vstatus | grep -q '"initialized"' || { echo "Vault ne repond pas : kubectl -n ${NS} describe pod ${POD}" >&2; exit 1; }

echo "== 2/5 Initialisation"
if vstatus | grep -q '"initialized": *true'; then
  echo "   Vault deja initialise"
else
  if kubectl get secret -n "$NS" "$KEYS_SECRET" >/dev/null 2>&1; then
    echo "Vault non initialise mais le Secret ${KEYS_SECRET} existe deja : etat incoherent, verifier manuellement." >&2
    exit 1
  fi
  init_json="$(vexec vault operator init -key-shares=3 -key-threshold=2 -format=json)"
  kubectl create secret generic "$KEYS_SECRET" -n "$NS" --from-literal=init.json="$init_json" >/dev/null
  unset init_json
  echo "   Cles stockees dans le Secret ${NS}/${KEYS_SECRET}"
fi

kubectl get secret -n "$NS" "$KEYS_SECRET" >/dev/null 2>&1 \
  || { echo "Secret ${KEYS_SECRET} introuvable : impossible de deverrouiller Vault." >&2; exit 1; }
INIT_JSON="$(kubectl get secret -n "$NS" "$KEYS_SECRET" -o jsonpath='{.data.init\.json}' | base64 -d | tr -d '\n\r ')"
UNSEAL_KEYS="$(printf '%s' "$INIT_JSON" | sed -n 's/.*"unseal_keys_b64":\[\([^]]*\)\].*/\1/p' | tr -d '"' | tr ',' ' ')"
ROOT_TOKEN="$(printf '%s' "$INIT_JSON" | sed -n 's/.*"root_token":"\([^"]*\)".*/\1/p')"
unset INIT_JSON
[ -n "$UNSEAL_KEYS" ] && [ -n "$ROOT_TOKEN" ] || { echo "Contenu de ${KEYS_SECRET} illisible." >&2; exit 1; }

echo "== 3/5 Unseal (2 cles sur 3)"
if vstatus | grep -q '"sealed": *true'; then
  n=0
  for key in $UNSEAL_KEYS; do
    vexec vault operator unseal "$key" >/dev/null
    n=$((n + 1)); [ "$n" -ge 2 ] && break
  done
fi
for _ in $(seq 1 30); do vstatus | grep -q '"sealed": *false' && break; sleep 2; done
vstatus | grep -q '"sealed": *false' || { echo "Vault est toujours scelle." >&2; exit 1; }
unset UNSEAL_KEYS
echo "   Sealed: false"

echo "== 4/5 Moteur KV v2, auth Kubernetes, politique et role"
# Sortie capturee avant grep : evite un SIGPIPE (grep -q) interprete comme un echec par pipefail.
mounts="$(vexec_token vault secrets list -format=json)"
printf '%s' "$mounts" | grep -q '"secret/"' || vexec_token vault secrets enable -path=secret kv-v2 >/dev/null
auths="$(vexec_token vault auth list -format=json)"
printf '%s' "$auths" | grep -q '"kubernetes/"' || vexec_token vault auth enable kubernetes >/dev/null
vexec_token vault write auth/kubernetes/config \
  kubernetes_host="https://kubernetes.default.svc:443" >/dev/null

vexec_token vault policy write omnipay-app-policy - >/dev/null <<'POLICY'
# Lecture seule sur les secrets applicatifs OmniPay.
path "secret/data/omnipay/*" {
  capabilities = ["read"]
}
POLICY

vexec_token vault write auth/kubernetes/role/omnipay-role \
  bound_service_account_names="$ESO_SA" \
  bound_service_account_namespaces="$ESO_NS" \
  policies=omnipay-app-policy ttl=1h >/dev/null

echo "== 5/5 Secrets bancaires initiaux (generes dans le pod)"
GEN='head -c 96 /dev/urandom | base64 | tr -dc A-Za-z0-9'
if vexec_token vault kv get secret/omnipay/database >/dev/null 2>&1; then
  echo "   secret/omnipay/database existe deja : conserve"
else
  vexec_token sh -c "vault kv put secret/omnipay/database username=omnipay password=\"\$(${GEN} | head -c 32)\"" >/dev/null
  echo "   secret/omnipay/database cree"
fi
if vexec_token vault kv get secret/omnipay/jwt >/dev/null 2>&1; then
  echo "   secret/omnipay/jwt existe deja : conserve"
else
  vexec_token sh -c "vault kv put secret/omnipay/jwt secret=\"\$(${GEN} | head -c 64)\"" >/dev/null
  echo "   secret/omnipay/jwt cree"
fi
unset ROOT_TOKEN

echo
echo "Vault pret. UI : http://<IP_NOEUD>:30006"
echo "ATTENTION : les cles d'unseal et le root token sont dans le Secret ${NS}/${KEYS_SECRET}."
echo "Hors laboratoire : les copier dans un gestionnaire de secrets, puis supprimer ce Secret."
echo "Etape suivante : ./infra/external-secrets/install-eso.sh"
