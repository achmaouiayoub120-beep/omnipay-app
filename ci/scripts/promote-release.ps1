# ==============================================================================
# OmniPay Zero-Trust — Promotion GitOps Multi-Environnements (dev/recette/prod)
# Rôle P1 : Chef Technique & Architecte CI/CD (Semaine 3) — PowerShell
# ==============================================================================
# Usage :
#   .\ci\scripts\promote-release.ps1 -TargetEnv <dev|recette|prod> -ImageTag <tag> [-Service <all|svc>] [-GitOpsDir <dir>]
# ==============================================================================

[CmdletBinding()]
param (
    [Parameter(Mandatory=$true)]
    [ValidateSet("dev", "recette", "prod")]
    [string]$TargetEnv,

    [Parameter(Mandatory=$true)]
    [string]$ImageTag,

    [string]$Service = "all",
    [string]$GitOpsDir = ""
)

$ErrorActionPreference = "Stop"

$Registry = "harbor.omnipay.local:30002"
$Project = "omnipay"
$services = @("auth-service", "transaction-service", "notification-service")

if (-not $GitOpsDir) {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $candidate = Resolve-Path "$scriptDir/../../../../omnipay-gitops" -ErrorAction SilentlyContinue
    if ($candidate -and (Test-Path $candidate)) {
        $GitOpsDir = $candidate.Path
    } else {
        $candidate2 = Resolve-Path "$PWD/../omnipay-gitops" -ErrorAction SilentlyContinue
        if ($candidate2 -and (Test-Path $candidate2)) {
            $GitOpsDir = $candidate2.Path
        } else {
            $GitOpsDir = "c:/Users/ayoub/OneDrive/Bureau/OmniPay Zero-Trust/omnipay-gitops"
        }
    }
}

Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host " [P1] Promotion GitOps — OmniPay Zero-Trust (PowerShell)" -ForegroundColor Cyan
Write-Host " Environnement Cible : $TargetEnv" -ForegroundColor White
Write-Host " Tag de l'Image      : $ImageTag" -ForegroundColor White
Write-Host " Service             : $Service" -ForegroundColor White
Write-Host " Repertoire GitOps   : $GitOpsDir" -ForegroundColor White
Write-Host "==============================================================================" -ForegroundColor Cyan

if (-not (Test-Path "$GitOpsDir/.git")) {
    Write-Error "[ERREUR] Le depot GitOps n'est pas accessible dans $GitOpsDir"
    exit 1
}

$envDir = "$GitOpsDir/envs/$TargetEnv"
if (-not (Test-Path $envDir)) {
    Write-Error "[ERREUR] Le repertoire d'environnement $envDir est introuvable !"
    exit 1
}

Write-Host "---> [1/3] Mise a jour des manifests dans $envDir..." -ForegroundColor Yellow

$svcsToUpdate = if ($Service -eq "all") { $services } else { @($Service) }
$kustomization = "$envDir/kustomization.yaml"

foreach ($svc in $svcsToUpdate) {
    $imagePrefix = "$Registry/$Project/$svc"

    # 1. Mise à jour dans kustomization.yaml
    if (Test-Path $kustomization) {
        $content = Get-Content $kustomization -Raw
        $content = [regex]::Replace($content, "image:\s*${imagePrefix}:[^\r\n]+", "image: ${imagePrefix}:${ImageTag}")
        Set-Content -Path $kustomization -Value $content -Encoding UTF8 -NoNewline
    }

    # 2. Mise à jour dans le manifest individuel
    $svcYaml = "$envDir/$svc.yaml"
    if (Test-Path $svcYaml) {
        $content = Get-Content $svcYaml -Raw
        $content = [regex]::Replace($content, "image:\s*${imagePrefix}:[^\r\n]+", "image: ${imagePrefix}:${ImageTag}")
        Set-Content -Path $svcYaml -Value $content -Encoding UTF8 -NoNewline
        Write-Host "       $svc.yaml mis a jour -> $ImageTag" -ForegroundColor Green
    }

    # 3. En production : mise à jour pour Argo Rollouts Canary
    if ($TargetEnv -eq "prod" -and $svc -eq "transaction-service") {
        $rolloutYaml = "$envDir/transaction-service-rollout.yaml"
        if (Test-Path $rolloutYaml) {
            $content = Get-Content $rolloutYaml -Raw
            $content = [regex]::Replace($content, "image:\s*${imagePrefix}:[^\r\n]+", "image: ${imagePrefix}:${ImageTag}")
            Set-Content -Path $rolloutYaml -Value $content -Encoding UTF8 -NoNewline
            Write-Host "       transaction-service-rollout.yaml (Canary) mis a jour -> $ImageTag" -ForegroundColor Green
        }
    }
}

Write-Host "---> [2/3] Verification Git Status..." -ForegroundColor Yellow
Push-Location $GitOpsDir
try {
    git add "envs/$TargetEnv/"
    $diff = git diff --cached --name-only
    if (-not $diff) {
        Write-Host "       Aucune modification detectee (le tag $ImageTag est deja applique)." -ForegroundColor Gray
    } else {
        $commitMsg = "feat(gitops): promote $Service to $ImageTag in $TargetEnv"
        git commit -m $commitMsg
        Write-Host "       Commit cree : $commitMsg" -ForegroundColor Green
    }
} finally {
    Pop-Location
}

Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "[SUCCES] Promotion vers l'environnement '$TargetEnv' effectuee avec succes !" -ForegroundColor Green
Write-Host "==============================================================================" -ForegroundColor Cyan
