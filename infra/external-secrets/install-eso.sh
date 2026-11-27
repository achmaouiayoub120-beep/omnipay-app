#!/usr/bin/env bash
# Installe External Secrets Operator (namespace "external-secrets") puis le ClusterSecretStore Vault
# et les ExternalSecrets applicatifs. Prerequis : Vault initialise (infra/vault/init-vault.sh).
# Variables : ESO_CHART_VERSION (defaut 2.15.0)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CHART_VERSION="${ESO_CHART_VERSION:-2.15.0}"
NS="external-secrets"

for bin in kubectl helm; do
  command -v "$bin" >/dev/null 2>&1 || { echo "$bin introuvable" >&2; exit 2; }
done

echo "== Depot Helm External Secrets"
helm repo add external-secrets https://charts.external-secrets.io --force-update >/dev/null
helm repo update external-secrets >/dev/null

echo "== Namespace ${NS} (PSS restricted)"
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

echo "== Deploiement ESO ${CHART_VERSION} (CRDs incluses : ClusterSecretStore, ExternalSecret)"
helm upgrade --install external-secrets external-secrets/external-secrets \
  --version "$CHART_VERSION" -n "$NS" --set installCRDs=true --wait --timeout 5m

kubectl wait --for=condition=Established --timeout=60s \
  crd/clustersecretstores.external-secrets.io crd/externalsecrets.external-secrets.io

echo "== ClusterSecretStore Vault"
kubectl apply -f "${ROOT}/infra/external-secrets/cluster-secret-store.yaml"

echo "== ExternalSecrets applicatifs"
kubectl apply -f "${ROOT}/infra/external-secrets/external-secrets-omnipay.yaml"

echo
kubectl get clustersecretstore vault-backend
echo "Verifier la synchronisation : kubectl get externalsecret -A   (STATUS SecretSynced)"
