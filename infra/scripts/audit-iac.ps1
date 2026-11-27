# Audit de securite statique de l'IaC (Checkov + controles de conformite OmniPay).
# Equivalent PowerShell de audit-iac.sh. Rapport : build\reports\iac-security-report.txt
# Sans Checkov : message explicatif et sortie 0 (poste de dev), sauf $env:IAC_STRICT = "1".
$ErrorActionPreference = "Continue"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root
$reportDir = "build\reports"
$report = Join-Path $reportDir "iac-security-report.txt"
New-Item -ItemType Directory -Force -Path $reportDir | Out-Null

$script:failed = $false
@(
  "OmniPay Zero-Trust - Rapport d'audit IaC",
  "Date : $((Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ'))",
  "Perimetre : infra/terraform infra/network-policies infra/ingress",
  "============================================================"
) | Set-Content -Path $report -Encoding utf8

function Log([string]$msg) { Write-Host $msg; Add-Content -Path $report -Value $msg -Encoding utf8 }
function Check([string]$desc, [bool]$ok) {
  if ($ok) { Log "[OK]   $desc" } else { Log "[FAIL] $desc"; $script:failed = $true }
}
function Has([string]$path, [string]$pattern) {
  (Test-Path $path) -and [bool](Select-String -Path $path -Pattern $pattern -Quiet)
}

Log ""
Log "## Conformite OmniPay"
$ns = "infra/terraform/modules/namespaces"
Check "PSS enforce/warn/audit pilotes par pss_level" `
  ((Has "$ns/main.tf" "pod-security.kubernetes.io/enforce") -and (Has "$ns/main.tf" "pod-security.kubernetes.io/warn") -and (Has "$ns/main.tf" "pod-security.kubernetes.io/audit"))
Check "pss_level vaut 'restricted' par defaut" (Has "$ns/variables.tf" 'default\s*=\s*"restricted"')
$envsOk = $true
foreach ($e in "dev", "recette", "prod") {
  if (-not (Has "infra/terraform/envs/$e/main.tf" 'pss_level\s*=\s*"restricted"')) { $envsOk = $false }
}
Check "Chaque environnement impose pss_level = `"restricted`"" $envsOk
$deny = "infra/network-policies/default-deny-all.yaml"
Check "default-deny-all couvre Ingress et Egress" `
  ((Has $deny "podSelector: \{\}") -and (Has $deny "- Ingress") -and (Has $deny "- Egress"))
$bad = Get-ChildItem infra/network-policies, infra/ingress -Recurse -File -ErrorAction SilentlyContinue |
  Select-String -Pattern 'privileged:\s*true|runAsUser:\s*0\b|hostNetwork:\s*true' -ErrorAction SilentlyContinue
Check "Aucun manifeste ne demande privileged / runAsUser 0 / hostNetwork" (-not $bad)
$secrets = Get-ChildItem infra -Recurse -File -Include *.tfstate*, *.pem, *.key, kubeconfig* -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -notmatch '[\\/]\.terraform[\\/]' }
Check "Aucun etat Terraform, cle privee ou kubeconfig dans infra/" (-not $secrets)

Log ""
Log "## Checkov"
if (-not (Get-Command checkov -ErrorAction SilentlyContinue)) {
  Log "Checkov n'est pas installe sur cet hote : analyse statique ignoree."
  Log "Installer : pip install checkov  (ou utiliser l'image Docker bridgecrew/checkov)."
  if ($env:IAC_STRICT -eq "1") { Log "IAC_STRICT=1 : Checkov est obligatoire en CI -> echec."; exit 2 }
  Log "Mode non bloquant (poste de dev) : seuls les controles OmniPay ci-dessus comptent."
} else {
  checkov -d infra/terraform -d infra/network-policies -d infra/ingress `
    --framework terraform kubernetes secrets --skip-path '.*\.terraform/.*' --compact --quiet 2>&1 |
    Tee-Object -FilePath $report -Append
  if ($LASTEXITCODE -ne 0) { $script:failed = $true }
}

Log ""
if ($script:failed) { Log "RESULTAT : NON CONFORME (voir [FAIL] / Checkov ci-dessus)" } else { Log "RESULTAT : CONFORME" }
Write-Host "Rapport : $report"
if ($script:failed) { exit 1 } else { exit 0 }
