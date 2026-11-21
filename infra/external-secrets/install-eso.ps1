#Requires -Version 7.0
# Installe External Secrets Operator puis le ClusterSecretStore Vault et les ExternalSecrets.
# Prerequis : Vault initialise (infra/vault/init-vault.ps1). Variable : $env:ESO_CHART_VERSION.
$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$chartVersion = if ($env:ESO_CHART_VERSION) { $env:ESO_CHART_VERSION } else { "2.15.0" }
$ns = "external-secrets"

function Invoke-Native {
  param([string]$Command, [string[]]$Arguments)
  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) { throw "$Command $($Arguments -join ' ') a echoue (code $LASTEXITCODE)" }
}

foreach ($bin in "kubectl", "helm") {
  if (-not (Get-Command $bin -ErrorAction SilentlyContinue)) { throw "$bin introuvable" }
}

Write-Host "== Depot Helm External Secrets"
Invoke-Native helm @("repo", "add", "external-secrets", "https://charts.external-secrets.io", "--force-update") | Out-Null
Invoke-Native helm @("repo", "update", "external-secrets") | Out-Null

Write-Host "== Namespace $ns (PSS restricted)"
@"
apiVersion: v1
kind: Namespace
metadata:
  name: $ns
  labels:
    project: omnipay
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/audit: restricted
"@ | kubectl apply -f -
if ($LASTEXITCODE -ne 0) { throw "creation du namespace $ns echouee" }

Write-Host "== Deploiement ESO $chartVersion (CRDs incluses)"
Invoke-Native helm @("upgrade", "--install", "external-secrets", "external-secrets/external-secrets",
  "--version", $chartVersion, "-n", $ns, "--set", "installCRDs=true", "--wait", "--timeout", "5m")

Invoke-Native kubectl @("wait", "--for=condition=Established", "--timeout=60s",
  "crd/clustersecretstores.external-secrets.io", "crd/externalsecrets.external-secrets.io")

Write-Host "== ClusterSecretStore Vault"
Invoke-Native kubectl @("apply", "-f", (Join-Path $root "infra\external-secrets\cluster-secret-store.yaml"))

Write-Host "== ExternalSecrets applicatifs"
Invoke-Native kubectl @("apply", "-f", (Join-Path $root "infra\external-secrets\external-secrets-omnipay.yaml"))

Write-Host ""
Invoke-Native kubectl @("get", "clustersecretstore", "vault-backend")
Write-Host "Verifier la synchronisation : kubectl get externalsecret -A   (STATUS SecretSynced)"
