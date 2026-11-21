#Requires -Version 7.0
# Installe Falco (capteur runtime eBPF) + Falcosidekick avec les regles bancaires OmniPay.
# Variable : $env:FALCO_CHART_VERSION (defaut 9.2.2).
# Le namespace "falco" est en PSS privileged (sonde eBPF) ; il n'heberge aucun workload applicatif.
$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$chartVersion = if ($env:FALCO_CHART_VERSION) { $env:FALCO_CHART_VERSION } else { "9.2.2" }
$ns = "falco"

function Invoke-Native {
  param([string]$Command, [string[]]$Arguments)
  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) { throw "$Command $($Arguments -join ' ') a echoue (code $LASTEXITCODE)" }
}

foreach ($bin in "kubectl", "helm") {
  if (-not (Get-Command $bin -ErrorAction SilentlyContinue)) { throw "$bin introuvable" }
}

Write-Host "== Depot Helm Falco"
Invoke-Native helm @("repo", "add", "falcosecurity", "https://falcosecurity.github.io/charts", "--force-update") | Out-Null
Invoke-Native helm @("repo", "update", "falcosecurity") | Out-Null

Write-Host "== Namespace $ns (PSS privileged : sonde eBPF)"
@"
apiVersion: v1
kind: Namespace
metadata:
  name: $ns
  labels:
    project: omnipay
    pod-security.kubernetes.io/enforce: privileged
    pod-security.kubernetes.io/warn: privileged
    pod-security.kubernetes.io/audit: privileged
"@ | kubectl apply -f -
if ($LASTEXITCODE -ne 0) { throw "creation du namespace $ns echouee" }

Write-Host "== Deploiement Falco $chartVersion + regles bancaires"
$rules = Join-Path $root "infra\falco\falco-banking-rules.yaml"
Invoke-Native helm @("upgrade", "--install", "falco", "falcosecurity/falco", "--version", $chartVersion,
  "-n", $ns, "-f", (Join-Path $root "infra\falco\values-falco.yaml"),
  "--set-file", "customRules.falco-banking-rules\.yaml=$rules", "--wait", "--timeout", "5m")

Write-Host ""
Invoke-Native kubectl @("get", "pods", "-n", $ns)
Write-Host "Test d'intrusion : ./infra/scripts/test-falco-detection.ps1"
