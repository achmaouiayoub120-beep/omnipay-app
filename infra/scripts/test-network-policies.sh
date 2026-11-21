#!/usr/bin/env bash
# Preuve de la micro-segmentation Zero-Trust (NetworkPolicies deny-all).
#
# Le script cree des pods de test ephemeres PORTANT LES LABELS des vrais services
# (c'est le label qui donne l'identite reseau) et un faux "postgresql" qui ecoute
# sur 5432. Il n'utilise donc ni les vrais pods ni la vraie base.
#
#   Test A : transaction     -> postgresql:5432      attendu : SUCCES
#   Test B : notification    -> postgresql:5432      attendu : BLOQUE (timeout)
#   Test C : transaction     -> Internet (1.1.1.1)   attendu : BLOQUE
#
# Prerequis : kubectl pointe sur le cluster, politiques deja appliquees
# (default-deny-all.yaml + allow-bank-flows.yaml) dans le namespace teste.
#
# Usage : NAMESPACE=omnipay-dev ./infra/scripts/test-network-policies.sh
# Variables : NAMESPACE (defaut omnipay-dev), IMAGE (defaut busybox:1.36 ; doit etre
#             autorisee par Kyverno si la verification de signature est active).
set -uo pipefail

NAMESPACE="${NAMESPACE:-omnipay-dev}"
IMAGE="${IMAGE:-busybox:1.36}"
TIMEOUT_S=3
RUN_ID="np-test-$$"
FAILED=0

command -v kubectl >/dev/null 2>&1 || { echo "kubectl introuvable" >&2; exit 2; }

# Contexte de securite compatible PSS "restricted" + quotas (requests/limits obligatoires).
overrides() { # $1 = nom du conteneur (= nom du pod), $2 = commande
  cat <<JSON
{"spec":{"securityContext":{"runAsNonRoot":true,"runAsUser":10001,"runAsGroup":10001,"seccompProfile":{"type":"RuntimeDefault"}},
"containers":[{"name":"$1","image":"${IMAGE}","command":["sh","-c","$2"],
"securityContext":{"allowPrivilegeEscalation":false,"readOnlyRootFilesystem":true,"capabilities":{"drop":["ALL"]}},
"resources":{"requests":{"cpu":"10m","memory":"16Mi"},"limits":{"cpu":"50m","memory":"32Mi"}}}]}}
JSON
}

cleanup() {
  kubectl -n "$NAMESPACE" delete pod -l "np-test=${RUN_ID}" --ignore-not-found --wait=false >/dev/null 2>&1
}
trap cleanup EXIT

# run_pod <nom> <label app.kubernetes.io/name> <commande>
run_pod() {
  local name="$1" label="$2" cmd="$3"
  kubectl -n "$NAMESPACE" run "$name" --image="$IMAGE" --restart=Never \
    --labels="app.kubernetes.io/name=${label},np-test=${RUN_ID}" \
    --overrides="$(overrides "$name" "$cmd")" >/dev/null
}

# expect <description> <succes|blocage> <nom-du-pod>
expect() {
  local desc="$1" want="$2" pod="$3" phase=""
  for _ in $(seq 1 60); do
    phase="$(kubectl -n "$NAMESPACE" get pod "$pod" -o jsonpath='{.status.phase}' 2>/dev/null)"
    [ "$phase" = "Succeeded" ] || [ "$phase" = "Failed" ] && break
    sleep 1
  done
  local got="blocage"; [ "$phase" = "Succeeded" ] && got="succes"
  if [ "$got" = "$want" ]; then
    echo "[OK]   ${desc} -> ${got} (attendu : ${want})"
  else
    echo "[FAIL] ${desc} -> ${got} (attendu : ${want}, phase pod : ${phase:-inconnue})"
    FAILED=1
  fi
}

echo "== Namespace : ${NAMESPACE}"
kubectl get ns "$NAMESPACE" >/dev/null || exit 2
kubectl -n "$NAMESPACE" get networkpolicy default-deny-all >/dev/null 2>&1 \
  || { echo "default-deny-all absente de ${NAMESPACE} : appliquer d'abord les politiques." >&2; exit 2; }

echo "== Faux postgresql (label app.kubernetes.io/name=postgresql, ecoute 5432)"
run_pod "${RUN_ID}-pg" postgresql "while true; do echo ok | nc -l -p 5432; done"
kubectl -n "$NAMESPACE" wait --for=condition=Ready "pod/${RUN_ID}-pg" --timeout=90s >/dev/null \
  || { echo "Le faux postgresql n'a pas demarre (image bloquee ? quota ?)" >&2; exit 2; }
PG_IP="$(kubectl -n "$NAMESPACE" get pod "${RUN_ID}-pg" -o jsonpath='{.status.podIP}')"
echo "   IP : ${PG_IP}"

echo "== Execution des tests (timeout ${TIMEOUT_S}s par connexion)"
run_pod "${RUN_ID}-a" transaction "echo | nc -w ${TIMEOUT_S} ${PG_IP} 5432"
run_pod "${RUN_ID}-b" notification "echo | nc -w ${TIMEOUT_S} ${PG_IP} 5432"
run_pod "${RUN_ID}-c" transaction "echo | nc -w ${TIMEOUT_S} 1.1.1.1 443"

expect "Test A  transaction  -> postgresql:5432 (flux legitime)  " succes  "${RUN_ID}-a"
expect "Test B  notification -> postgresql:5432 (flux illegitime)" blocage "${RUN_ID}-b"
expect "Test C  transaction  -> Internet 1.1.1.1:443 (egress)    " blocage "${RUN_ID}-c"

echo
if [ "$FAILED" -eq 0 ]; then
  echo "RESULTAT : micro-segmentation conforme (flux legitime passe, flux interdits rejetes)."
else
  echo "RESULTAT : NON CONFORME. Verifier les NetworkPolicies et que le CNI les applique" >&2
  echo "           (K3s : controleur kube-router actif, pas de --disable-network-policy)." >&2
fi
exit "$FAILED"
