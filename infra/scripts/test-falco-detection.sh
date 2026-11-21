#!/usr/bin/env bash
# Simule une intrusion dans un pod bancaire et verifie que Falco la detecte.
#
# Un pod de test ephemere (busybox, PSS restricted) est cree dans NAMESPACE, puis :
#   kubectl exec -> shell (regle 1) + lecture du token ServiceAccount (regle 2) + nc (regle 3)
# Le script lit les logs Falco jusqu'a trouver "[ZERO-TRUST INTRUSION]" pour CE pod, et affiche
# la latence mesuree (execution -> alerte visible dans les logs, granularite de scrutation 0,3 s).
#
# Usage : NAMESPACE=omnipay-dev ./infra/scripts/test-falco-detection.sh
# Variables : NAMESPACE (omnipay-dev), IMAGE (busybox:1.36, doit etre autorisee par Kyverno),
#             DETECT_TIMEOUT en secondes (10), FALCO_NAMESPACE (falco)
# Sortie 0 = intrusion interceptee ; 1 = non detectee ; 2 = prerequis manquant.
set -euo pipefail

NAMESPACE="${NAMESPACE:-omnipay-dev}"
FALCO_NAMESPACE="${FALCO_NAMESPACE:-falco}"
IMAGE="${IMAGE:-busybox:1.36}"
DETECT_TIMEOUT="${DETECT_TIMEOUT:-10}"
POD="falco-test-$$"
MARK="[ZERO-TRUST INTRUSION]"

command -v kubectl >/dev/null 2>&1 || { echo "kubectl introuvable" >&2; exit 2; }
kubectl get ns "$NAMESPACE" >/dev/null 2>&1 || { echo "Namespace ${NAMESPACE} introuvable" >&2; exit 2; }
kubectl get pods -n "$FALCO_NAMESPACE" -l app.kubernetes.io/name=falco --no-headers 2>/dev/null | grep -q . \
  || { echo "Aucun pod Falco dans ${FALCO_NAMESPACE} : lancer infra/falco/install-falco.sh" >&2; exit 2; }

cleanup() { kubectl -n "$NAMESPACE" delete pod "$POD" --ignore-not-found --wait=false >/dev/null 2>&1 || true; }
trap cleanup EXIT

echo "== Pod de test ${POD} dans ${NAMESPACE}"
# Compatible PSS restricted et ResourceQuota (requests/limits declares).
kubectl -n "$NAMESPACE" run "$POD" --image="$IMAGE" --restart=Never --overrides="{
  \"spec\":{\"securityContext\":{\"runAsNonRoot\":true,\"runAsUser\":10001,\"runAsGroup\":10001,\"seccompProfile\":{\"type\":\"RuntimeDefault\"}},
  \"containers\":[{\"name\":\"${POD}\",\"image\":\"${IMAGE}\",\"command\":[\"sleep\",\"300\"],
    \"securityContext\":{\"allowPrivilegeEscalation\":false,\"readOnlyRootFilesystem\":true,\"capabilities\":{\"drop\":[\"ALL\"]}},
    \"resources\":{\"requests\":{\"cpu\":\"10m\",\"memory\":\"16Mi\"},\"limits\":{\"cpu\":\"50m\",\"memory\":\"32Mi\"}}}]}}" >/dev/null
kubectl -n "$NAMESPACE" wait --for=condition=Ready "pod/${POD}" --timeout=90s >/dev/null \
  || { echo "Le pod de test n'a pas demarre (image bloquee par Kyverno ? quota ?)" >&2; exit 2; }

echo "== Intrusion simulee (shell + lecture du token ServiceAccount + outil reseau)"
t0="$(date +%s%N)"
kubectl -n "$NAMESPACE" exec "$POD" -- sh -c \
  'cat /var/run/secrets/kubernetes.io/serviceaccount/token >/dev/null 2>&1; nc -z -w 1 127.0.0.1 9 >/dev/null 2>&1; true'

echo "== Recherche de l'alerte Falco (max ${DETECT_TIMEOUT}s)"
found=""
deadline=$(( $(date +%s) + DETECT_TIMEOUT ))
while [ "$(date +%s)" -le "$deadline" ]; do
  logs="$(kubectl logs -n "$FALCO_NAMESPACE" -l app.kubernetes.io/name=falco -c falco --tail=200 --since=60s 2>/dev/null || true)"
  found="$(printf '%s\n' "$logs" | grep -F "$MARK" | grep -F "$POD" || true)"
  [ -n "$found" ] && break
  sleep 0.3
done
t1="$(date +%s%N)"

if [ -z "$found" ]; then
  echo "[FAIL] Aucune alerte ${MARK} pour ${POD} en ${DETECT_TIMEOUT}s." >&2
  echo "       Verifier : kubectl logs -n ${FALCO_NAMESPACE} -l app.kubernetes.io/name=falco -c falco --tail=30" >&2
  echo "       (regles chargees ? metadonnees k8s disponibles ? namespace en omnipay-* ?)" >&2
  exit 1
fi

echo "[OK]   Intrusion interceptee par Falco en $(( (t1 - t0) / 1000000 )) ms (mesure bout en bout, logs inclus) :"
printf '%s\n' "$found" | head -5 | cut -c1-300
exit 0
