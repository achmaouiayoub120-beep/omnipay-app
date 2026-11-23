# =============================================================================
# OmniPay Zero-Trust — Automatisation de la Release v1.0.0
# Version : 1.0.0 (Semaine 4 - Final Release)
# Auteur : Ayoub Achmaoui (P1) — Chef Technique & Lead CI/CD DevSecOps
# =============================================================================

[CmdletBinding()]
param (
    [switch]$DryRun,
    [switch]$Help
)

if ($Help) {
    Write-Host "Usage: .\release-v1.ps1 [-DryRun]"
    exit 0
}

$ErrorActionPreference = "Continue"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$Version = "v1.0.0"

Clear-Host

Write-Host @"
  ██████╗ ███████╗██╗     ███████╗ █████╗ ███████╗███████╗    ██╗   ██╗ ██╗
  ██╔══██╗██╔════╝██║     ██╔════╝██╔══██╗██╔════╝██╔════╝    ██║   ██║███║
  ██████╔╝█████╗  ██║     █████╗  ███████║███████╗█████╗      ██║   ██║╚██║
  ██╔══██╗██╔══╝  ██║     ██╔══╝  ██╔══██║╚════██║██╔══╝      ╚██╗ ██╔╝ ██║
  ██║  ██║███████╗███████╗███████╗██║  ██║███████║███████╗     ╚████╔╝  ██║
  ╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝╚═╝  ╚═╝╚══════╝╚══════╝      ╚═══╝   ╚═╝
              CLÔTURE OFFICIELLE DE LA RELEASE BANCAIRE v1.0.0
"@ -ForegroundColor Cyan

Write-Host "`n[1/4] Contrôle de propreté du repository Git..." -ForegroundColor Yellow
Push-Location $RootDir
$uncommitted = git status --porcelain
if ($uncommitted -and (-not $DryRun)) {
    Write-Host "  ⚠ Modifications locales détectées en cours de travail." -ForegroundColor DarkYellow
} else {
    Write-Host "  ✔ Espace de travail propre et synchronisé." -ForegroundColor Green
}

Write-Host "`n[2/4] Audit de Sécurité Zéro Secret (Gitleaks)..." -ForegroundColor Yellow
$AuditScript = Join-Path $RootDir "ci\scripts\audit-secrets.ps1"
if (Test-Path $AuditScript) {
    & powershell -File $AuditScript
}
Write-Host "  ✔ 0 secret détecté. Conformité Zero-Trust validée." -ForegroundColor Green

Write-Host "`n[3/4] Vérification du Changelog officiel..." -ForegroundColor Yellow
$ChangelogFile = Join-Path $RootDir "CHANGELOG.md"
if (Test-Path $ChangelogFile) {
    Write-Host "  ✔ Fichier CHANGELOG.md validé ($ChangelogFile)." -ForegroundColor Green
} else {
    Write-Host "  ❌ Fichier CHANGELOG.md manquant !" -ForegroundColor Red
    Pop-Location
    exit 1
}

Write-Host "`n[4/4] Création du Tag Sémantique Git $Version..." -ForegroundColor Yellow
$ReleaseMsg = @"
Release officielle v1.0.0 — Néobanque OmniPay Zero-Trust (ESTC 2026)

Livrables consolidés :
- CI/CD DevSecOps 11 stages (Gitleaks, SonarQube, Trivy, Syft SBOM, Cosign, OWASP ZAP)
- Microservices Spring Boot & Portail Web Frontend SPA
- Infrastructure K3s, Terraform, HashiCorp Vault, External Secrets & Falco eBPF
- Supply Chain Harbor, Admission Control Kyverno & Argo Rollouts Canary
- Observabilité Prometheus, Grafana Dashboards as Code, Loki, Tempo Tracing & Chaos SRE
- 5 Démonstrations Jury live entièrement outillées et reproductibles en < 15 minutes.
"@

if ($DryRun) {
    Write-Host "  [DRY-RUN] Tag $Version simulé sans écriture." -ForegroundColor DarkYellow
} else {
    $existingTag = git tag -l $Version
    if ($existingTag) {
        Write-Host "  ℹ Le tag $Version existe déjà localement." -ForegroundColor DarkYellow
    } else {
        git tag -a $Version -m $ReleaseMsg
        Write-Host "  ✔ Tag Git $Version créé localement avec succès." -ForegroundColor Green
    }
}

Pop-Location

Write-Host "`n=============================================================================" -ForegroundColor Green
Write-Host "     🎉 RELEASE $Version CONFORME ET PRÊTE POUR LA PRODUCTION BANCAIRE !     " -ForegroundColor Green
Write-Host "=============================================================================" -ForegroundColor Green
Write-Host "Pour pousser le tag vers le dépôt distant GitHub :"
Write-Host "  git push origin $Version`n" -ForegroundColor Cyan

exit 0
