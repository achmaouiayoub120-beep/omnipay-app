#!/usr/bin/env bash
# Installe Falco (capteur runtime eBPF) + Falcosidekick (relais Alertmanager) sur K3s,
# avec les regles bancaires OmniPay. Variable : FALCO_CHART_VERSION (defaut 9.2.2)
#
# Falco observe les appels systeme de TOUS les conteneurs du noeud : il exige des privileges
# noyau (BPF, PERFMON...). Son namespace est donc le seul en PSS "privileged" ; il ne heberge
# aucun workload applicatif.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CHART_VERSION="${FALCO_CHART_VERSION:-9.2.2}"
NS="falco"

for bin in kubectl helm; do
  command -v "$bin" >/dev/null 2>&1 || { echo "$bin introuvable" >&2; exit 2; }
done

echo "== Depot Helm Falco"
helm repo add falcosecurity https://falcosecurity.github.io/charts --force-update >/dev/null
helm repo update falcosecurity >/dev/null

echo "== Namespace ${NS} (PSS privileged : sonde eBPF)"
kubectl apply -f - <<EOF
apiVersion: v1
kind: Namespace
metadata:
  name: ${NS}
  labels:
    project: omnipay
    pod-security.kubernetes.io/enforce: privileged
    pod-security.kubernetes.io/warn: privileged
    pod-security.kubernetes.io/audit: privileged
EOF

echo "== Deploiement Falco ${CHART_VERSION} + regles bancaires"
helm upgrade --install falco falcosecurity/falco --version "$CHART_VERSION" -n "$NS" \
  -f "${ROOT}/infra/falco/values-falco.yaml" \
  --set-file "customRules.falco-banking-rules\\.yaml=${ROOT}/infra/falco/falco-banking-rules.yaml" \
  --wait --timeout 5m

echo
kubectl get pods -n "$NS"
echo "Verifier le chargement des regles : kubectl logs -n ${NS} -l app.kubernetes.io/name=falco -c falco --tail=30"
echo "Test d'intrusion : ./infra/scripts/test-falco-detection.sh"
