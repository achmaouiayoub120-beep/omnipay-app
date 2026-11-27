#Requires -Version 7.0
# Installe HashiCorp Vault sur K3s (namespace "vault", PSS restricted, UI NodePort 30006).
# Variable : $env:VAULT_CHART_VERSION (defaut 0.34.1)
$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$chartVersion = if ($env:VAULT_CHART_VERSION) { $env:VAULT_CHART_VERSION } else { "0.34.1" }
$ns = "vault"

function Invoke-Native {
  param([string]$Command, [string[]]$Arguments)
  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) { throw "$Command $($Arguments -join ' ') a echoue (code $LASTEXITCODE)" }
}

foreach ($bin in "kubectl", "helm") {
  if (-not (Get-Command $bin -ErrorAction SilentlyContinue)) { throw "$bin introuvable" }
}

Write-Host "== Depot Helm HashiCorp"
Invoke-Native helm @("repo", "add", "hashicorp", "https://helm.releases.hashicorp.com", "--force-update") | Out-Null
Invoke-Native helm @("repo", "update", "hashicorp") | Out-Null

Write-Host "== Namespace $ns (PSS restricted)"
$nsManifest = @"
apiVersion: v1
kind: Namespace
metadata:
  name: $ns
  labels:
    project: omnipay
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/audit: restricted
"@
$nsManifest | kubectl apply -f -
if ($LASTEXITCODE -ne 0) { throw "creation du namespace $ns echouee" }

Write-Host "== Deploiement Vault $chartVersion"
# Pas de --wait : le pod ne devient Ready qu'apres initialisation et unseal (init-vault.ps1).
Invoke-Native helm @("upgrade", "--install", "vault", "hashicorp/vault", "--version", $chartVersion,
  "-n", $ns, "-f", (Join-Path $root "infra\vault\values-vault.yaml"))

Write-Host ""
Write-Host "Vault deploye (scelle). Etape suivante : ./infra/vault/init-vault.ps1"
Write-Host "UI : http://<IP_NOEUD>:30006"
