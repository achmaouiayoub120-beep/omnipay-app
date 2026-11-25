#Requires -Version 7.0
<#
.SYNOPSIS
  Mesure le temps destroy + apply de la couche Terraform d'un environnement (brique "infrastructure" du RTO).
.DESCRIPTION
  DESTRUCTIF : supprime le namespace omnipay-<env> et son contenu. Exiger -Yes.
  Prerequis : $env:KUBE_CONFIG_PATH, terraform, cluster K3s accessible.
  Le RTO complet inclut aussi le bootstrap plateforme / ArgoCD (docs/runbooks/disaster-recovery-test.md).
  Sortie : 0 si RTO_TARGET (900 s par defaut) respecte, 1 sinon, 2 si prerequis ou confirmation manquants.
#>
param(
  [ValidateSet("dev", "recette", "prod")] [string]$Environment = "dev",
  [switch]$Yes
)
$ErrorActionPreference = "Stop"

if (-not $Yes) { Write-Error "Operation destructive (destroy puis apply de omnipay-$Environment). Relancer avec -Yes."; exit 2 }
if (-not (Get-Command terraform -ErrorAction SilentlyContinue)) { Write-Error "terraform introuvable"; exit 2 }
if (-not $env:KUBE_CONFIG_PATH) { Write-Error "Definir `$env:KUBE_CONFIG_PATH (ex. ~/.kube/config)"; exit 2 }
$target = if ($env:RTO_TARGET) { [int]$env:RTO_TARGET } else { 900 }

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$dir = Join-Path $root "infra\terraform\envs\$Environment"
if (-not (Test-Path $dir)) { Write-Error "Environnement inconnu : $dir"; exit 2 }
$tfvars = Join-Path $root "infra\terraform\terraform.tfvars"
$vars = if (Test-Path $tfvars) { @("-var-file=$tfvars") } else { @() }

function Invoke-Tf {
  & terraform @args
  if ($LASTEXITCODE -ne 0) { throw "terraform $($args -join ' ') a echoue (code $LASTEXITCODE)" }
}
function Format-Duration([double]$s) { "{0}m{1:D2}s" -f [int][Math]::Floor($s / 60), [int]($s % 60) }

Push-Location $dir
try {
  Invoke-Tf init -input=false | Out-Null
  Write-Host "== Etat initial : $((terraform state list | Measure-Object).Count) ressources"
  $sw = [Diagnostics.Stopwatch]::StartNew()
  Write-Host "== destroy"
  Invoke-Tf destroy -auto-approve -input=false @vars | Out-Null
  $tDestroy = $sw.Elapsed.TotalSeconds
  Write-Host "== apply"
  Invoke-Tf apply -auto-approve -input=false @vars | Out-Null
  $total = $sw.Elapsed.TotalSeconds
}
finally { Pop-Location }

Write-Host ""
Write-Host "Destruction      : $(Format-Duration $tDestroy)"
Write-Host "Reconstruction   : $(Format-Duration ($total - $tDestroy))"
Write-Host "Total Terraform  : $(Format-Duration $total)   (objectif RTO < $(Format-Duration $target))"
if ($total -le $target) { Write-Host "RESULTAT : objectif respecte pour la couche Terraform." -ForegroundColor Green; exit 0 }
Write-Host "RESULTAT : objectif depasse." -ForegroundColor Red
exit 1
