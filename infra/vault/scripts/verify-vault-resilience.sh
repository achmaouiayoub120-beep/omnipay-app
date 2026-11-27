#!/usr/bin/env bash
# Verifie la resilience de HashiCorp Vault et d'External Secrets Operator (ESO) :
#
#   Scenario 1  Vault SCELLE        : le Secret Kubernetes et le pod qui le consomme ne bougent pas.
#   Scenario 2  Vault DESCELLE      : ESO se reconnecte et resynchronise, sans redemarrage de pod.
#   Scenario 3  Rotation a chaud    : une nouvelle valeur dans Vault arrive dans le Secret en < 30 s.
#
# Le script travaille sur un secret DEDIE (secret/omnipay/resilience-test) et un pod de test : il ne
# touche ni secret/omnipay/database ni secret/omnipay/jwt. Changer le mot de passe de la base dans
# Vault la desynchroniserait de PostgreSQL ; la mecanique de rotation est identique.
#
# Prerequis : Vault initialise (init-vault.sh), ESO + ClusterSecretStore installes (install-eso.sh),
# namespace omnipay-dev existant. Aucune cle ni token n'est affiche ni ecrit sur disque.
#
# Usage   : ./infra/vault/scripts/verify-vault-resilience.sh
# Variables : NS_APP (omnipay-dev), SYNC_TIMEOUT (30 s, rotation), RECONNECT_TIMEOUT (90 s, reconnexion
#             apres unseal), IMAGE (busybox:1.36, doit etre autorisee par Kyverno)
# Sortie : 0 = tous les controles OK, 1 = au moins un echec, 2 = prerequis manquant.
set -euo pipefail

NS_VAULT="${NS_VAULT:-vault}"
POD_VAULT="${POD_VAULT:-vault-0}"
NS_APP="${NS_APP:-omnipay-dev}"
STORE="${STORE:-vault-backend}"
KEYS_SECRET="${KEYS_SECRET:-vault-unseal-keys}"
IMAGE="${IMAGE:-busybox:1.36}"
SYNC_TIMEOUT="${SYNC_TIMEOUT:-30}"
RECONNECT_TIMEOUT="${RECONNECT_TIMEOUT:-90}"

NAME="resilience-test"
PROBE="resilience-probe"
KV_PATH="secret/omnipay/resilience-test"
PASS=0
FAIL=0

pass() { printf '  [OK]   %s\n' "$1"; PASS=$((PASS + 1)); }
fail() { printf '  [FAIL] %s\n' "$1"; FAIL=$((FAIL + 1)); }
info() { printf '  ..     %s\n' "$1"; }

for bin in kubectl base64 sha256sum; do
  command -v "$bin" >/dev/null 2>&1 || { echo "$bin introuvable" >&2; exit 2; }
done
kubectl get ns "$NS_APP" >/dev/null 2>&1 || { echo "Namespace ${NS_APP} introuvable" >&2; exit 2; }
kubectl get clustersecretstore "$STORE" >/dev/null 2>&1 || { echo "ClusterSecretStore ${STORE} absent : lancer install-eso.sh" >&2; exit 2; }

# --- Acces a Vault (cles lues dans le Secret du cluster, jamais affichees) -----------------------
INIT_JSON="$(kubectl get secret -n "$NS_VAULT" "$KEYS_SECRET" -o jsonpath='{.data.init\.json}' | base64 -d | tr -d '\n\r ')"
UNSEAL_KEYS="$(printf '%s' "$INIT_JSON" | sed -n 's/.*"unseal_keys_b64":\[\([^]]*\)\].*/\1/p' | tr -d '"' | tr ',' ' ')"
ROOT_TOKEN="$(printf '%s' "$INIT_JSON" | sed -n 's/.*"root_token":"\([^"]*\)".*/\1/p')"
unset INIT_JSON
[ -n "$UNSEAL_KEYS" ] && [ -n "$ROOT_TOKEN" ] || { echo "Secret ${KEYS_SECRET} illisible" >&2; exit 2; }

vexec() { kubectl exec -n "$NS_VAULT" "$POD_VAULT" -c vault -- "$@"; }
vexec_token() { kubectl exec -i -n "$NS_VAULT" "$POD_VAULT" -c vault -- env "VAULT_TOKEN=${ROOT_TOKEN}" "$@"; }
vstatus() { vexec vault status -format=json 2>/dev/null || true; }
is_sealed() { vstatus | grep -q '"sealed": *true'; }
is_unsealed() { vstatus | grep -q '"sealed": *false'; }
unseal_vault() {
  local n=0 key
  for key in $UNSEAL_KEYS; do
    vexec vault operator unseal "$key" >/dev/null
    n=$((n + 1))
    [ "$n" -ge 2 ] && break
  done
}

# --- Aides Kubernetes -------------------------------------------------------------------------------
wait_until() { # wait_until <secondes> <commande...>
  local t="$1" i=0
  shift
  while [ "$i" -lt "$t" ]; do
    if "$@" >/dev/null 2>&1; then return 0; fi
    sleep 1
    i=$((i + 1))
  done
  return 1
}
now_ms() { echo $(( $(date +%s%N) / 1000000 )); }
es_cond() { kubectl get externalsecret -n "$NS_APP" "$NAME" -o jsonpath="{.status.conditions[?(@.type==\"Ready\")].$1}" 2>/dev/null; }
es_ready() { [ "$(es_cond status)" = "True" ]; }
es_not_ready() { [ "$(es_cond status)" = "False" ]; }
store_ready() { [ "$(kubectl get clustersecretstore "$STORE" -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' 2>/dev/null)" = "True" ]; }
force_sync() { kubectl annotate externalsecret -n "$NS_APP" "$NAME" "force-sync=$(date +%s%N)" --overwrite >/dev/null; }
secret_hash() { kubectl get secret -n "$NS_APP" "$NAME" -o jsonpath='{.data.VALUE}' 2>/dev/null | base64 -d 2>/dev/null | sha256sum | cut -c1-12; }
secret_exists() { kubectl get secret -n "$NS_APP" "$NAME" >/dev/null 2>&1; }
pod_state() { kubectl get pod -n "$NS_APP" "$PROBE" -o jsonpath='{.metadata.uid}/{.status.containerStatuses[0].restartCount}/{.status.phase}' 2>/dev/null; }
probe_reads_secret() { [ "$(kubectl exec -n "$NS_APP" "$PROBE" -- cat /secrets/VALUE 2>/dev/null | sha256sum | cut -c1-12)" = "$1" ]; }
hash_changed() { [ "$(secret_hash)" != "$HASH0" ]; }
put_random() { # put_random <prefixe> : ecrit une valeur aleatoire generee DANS le pod Vault
  vexec_token sh -c "vault kv put ${KV_PATH} value=\"$1-\$(head -c 48 /dev/urandom | base64 | tr -dc A-Za-z0-9 | head -c 24)\"" >/dev/null
}

cleanup() {
  set +e
  # Ne jamais laisser Vault scelle apres le test
  if is_sealed; then unseal_vault; fi
  kubectl delete externalsecret -n "$NS_APP" "$NAME" --ignore-not-found >/dev/null 2>&1
  kubectl delete pod -n "$NS_APP" "$PROBE" --ignore-not-found --wait=false >/dev/null 2>&1
  kubectl delete secret -n "$NS_APP" "$NAME" --ignore-not-found >/dev/null 2>&1
  vexec_token vault kv metadata delete "$KV_PATH" >/dev/null 2>&1
  unset ROOT_TOKEN UNSEAL_KEYS
}
trap cleanup EXIT

echo "== Preparation"
if is_sealed; then info "Vault scelle au depart : deverrouillage"; unseal_vault; fi
is_sealed && { echo "Impossible de deverrouiller Vault" >&2; exit 2; }
put_random v1
info "secret ${KV_PATH} cree (valeur generee dans le pod Vault)"

kubectl apply -f - >/dev/null <<EOF
apiVersion: external-secrets.io/v1
kind: ExternalSecret
metadata:
  name: ${NAME}
  namespace: ${NS_APP}
spec:
  refreshInterval: 1h
  secretStoreRef: {kind: ClusterSecretStore, name: ${STORE}}
  target: {name: ${NAME}, creationPolicy: Owner}
  data:
    - secretKey: VALUE
      remoteRef: {key: omnipay/resilience-test, property: value}
EOF
wait_until 60 es_ready || { echo "ExternalSecret non synchronise : kubectl describe externalsecret -n ${NS_APP} ${NAME}" >&2; exit 2; }

kubectl apply -f - >/dev/null <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: ${PROBE}
  namespace: ${NS_APP}
spec:
  securityContext: {runAsNonRoot: true, runAsUser: 10001, runAsGroup: 10001, seccompProfile: {type: RuntimeDefault}}
  containers:
    - name: probe
      image: ${IMAGE}
      command: ["sh", "-c", "while true; do cat /secrets/VALUE >/dev/null || exit 1; sleep 5; done"]
      securityContext: {allowPrivilegeEscalation: false, readOnlyRootFilesystem: true, capabilities: {drop: ["ALL"]}}
      resources: {requests: {cpu: 10m, memory: 16Mi}, limits: {cpu: 50m, memory: 32Mi}}
      volumeMounts: [{name: s, mountPath: /secrets, readOnly: true}]
  volumes: [{name: s, secret: {secretName: ${NAME}}}]
EOF
kubectl wait -n "$NS_APP" --for=condition=Ready "pod/${PROBE}" --timeout=90s >/dev/null \
  || { echo "Pod de test non demarre (image bloquee par Kyverno ? quota ?)" >&2; exit 2; }
HASH0="$(secret_hash)"
STATE0="$(pod_state)"
info "pod ${PROBE} : ${STATE0} (uid/redemarrages/phase), empreinte du secret ${HASH0}"

# ===================================================================================================
echo
echo "== Scenario 1 : Vault SCELLE (panne ou verrouillage d'urgence)"
vexec_token vault operator seal >/dev/null
if wait_until 15 is_sealed; then pass "Vault est scelle (vault operator seal)"; else fail "Vault n'est pas passe a l'etat scelle"; fi
sleep 3
if secret_exists && [ "$(secret_hash)" = "$HASH0" ]; then pass "Le Secret Kubernetes ${NAME} est conserve, valeur inchangee"; else fail "Le Secret Kubernetes a disparu ou change"; fi
if [ "$(pod_state)" = "$STATE0" ]; then pass "Le pod consommateur n'a pas redemarre (${STATE0})"; else fail "Le pod a change d'etat : $(pod_state)"; fi
if probe_reads_secret "$HASH0"; then pass "Le pod continue de lire son secret (volume monte)"; else fail "Le pod ne lit plus son secret"; fi
force_sync
if wait_until 25 es_not_ready; then
  info "ESO signale l'indisponibilite de Vault (comportement attendu) : $(es_cond reason)"
  pass "ESO detecte la panne sans supprimer le Secret cible"
else
  info "ESO n'a pas (encore) marque l'ExternalSecret en erreur : $(es_cond reason)"
fi
if secret_exists; then pass "Le Secret cible existe toujours apres l'echec de synchronisation"; else fail "Secret cible supprime par ESO"; fi

# ===================================================================================================
echo
echo "== Scenario 2 : UNSEAL et reconnexion automatique"
unseal_vault
if wait_until 30 is_unsealed; then pass "Vault deverrouille (Sealed: false)"; else fail "Vault toujours scelle"; fi
T0="$(now_ms)"
force_sync
if wait_until "$RECONNECT_TIMEOUT" es_ready; then
  pass "ExternalSecret de nouveau Ready en $(( ($(now_ms) - T0) / 1000 )) s (objectif < ${RECONNECT_TIMEOUT} s)"
else
  fail "ExternalSecret toujours en erreur apres ${RECONNECT_TIMEOUT} s : $(es_cond reason)"
fi
if store_ready; then pass "ClusterSecretStore ${STORE} Ready"; else info "ClusterSecretStore pas encore revalide (ESO le reverifie a son rythme)"; fi
if [ "$(pod_state)" = "$STATE0" ]; then pass "Aucun pod redemarre pendant tout l'incident (${STATE0})"; else fail "Etat du pod modifie : $(pod_state)"; fi

# ===================================================================================================
echo
echo "== Scenario 3 : rotation de secret a chaud"
put_random v2
T0="$(now_ms)"
force_sync
if wait_until "$SYNC_TIMEOUT" hash_changed; then
  DT=$(( $(now_ms) - T0 ))
  pass "Nouvelle valeur propagee dans le Secret Kubernetes en ${DT} ms (limite ${SYNC_TIMEOUT} s)"
else
  fail "Valeur non propagee en ${SYNC_TIMEOUT} s"
fi
info "Un pod qui monte le Secret en volume voit la valeur apres la synchro du kubelet (jusqu'a ~1 min) ; une variable d'environnement exige un rolling restart."

echo
echo "Resultat : ${PASS} OK, ${FAIL} echec(s)"
[ "$FAIL" -eq 0 ]
