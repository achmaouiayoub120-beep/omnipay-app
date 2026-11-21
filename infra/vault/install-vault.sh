#!/usr/bin/env bash
# Installe HashiCorp Vault sur K3s (namespace "vault", PSS restricted, UI NodePort 30006).
# Reproductible : relancer le script met simplement le release a jour.
# Variables : VAULT_CHART_VERSION (defaut 0.34.1)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CHART_VERSION="${VAULT_CHART_VERSION:-0.34.1}"
NS="vault"

for bin in kubectl helm; do
  command -v "$bin" >/dev/null 2>&1 || { echo "$bin introuvable" >&2; exit 2; }
done

echo "== Depot Helm HashiCorp"
helm repo add hashicorp https://helm.releases.hashicorp.com --force-update >/dev/null
helm repo update hashicorp >/dev/null

echo "== Namespace ${NS} (PSS restricted)"
# restricted est tenable : disable_mlock = true evite la capability IPC_LOCK (voir values-vault.yaml).
kubectl apply -f - <<EOF
apiVersion: v1
kind: Namespace
metadata:
  name: ${NS}
  labels:
    project: omnipay
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/audit: restricted
EOF

echo "== Deploiement Vault ${CHART_VERSION}"
# Pas de --wait : le pod ne devient Ready qu'apres initialisation et unseal (init-vault.sh).
helm upgrade --install vault hashicorp/vault --version "$CHART_VERSION" \
  -n "$NS" -f "${ROOT}/infra/vault/values-vault.yaml"

echo
echo "Vault deploye (scelle). Etape suivante : ./infra/vault/init-vault.sh"
echo "UI : http://<IP_NOEUD>:30006"
