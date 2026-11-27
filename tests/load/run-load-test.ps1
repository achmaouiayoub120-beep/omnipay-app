#Requires -Version 7.0
<#
.SYNOPSIS
  Lanceur du test de charge k6 OmniPay (Semaine 4, P2) - équivalent PowerShell 7+ de run-load-test.sh.

.DESCRIPTION
  Exécute tests/load/k6-transactions-load.js avec le binaire k6 local, sinon avec l'image grafana/k6.
  Les mots de passe de démo ne sont JAMAIS dans le dépôt : exportez-les avant le lancement.

.PARAMETER Smoke
  Profil court (1 VU, 10 s) pour vérifier le banc.

.PARAMETER Check
  Vérifie uniquement les prérequis (variables, k6/Docker, santé des services) sans lancer le test.

.EXAMPLE
  $env:K6_ALICE_PASSWORD = Read-Host -MaskInput 'alice'
  $env:K6_BOB_PASSWORD   = Read-Host -MaskInput 'bob'
  ./tests/load/run-load-test.ps1 -Smoke

.NOTES
  Code de sortie : celui de k6 (99 = seuil franchi), 2 = configuration invalide.
#>
[CmdletBinding()]
param(
    [string]$AuthUrl = $(if ($env:AUTH_URL) { $env:AUTH_URL } else { 'http://localhost:8081' }),
    [string]$TxUrl = $(if ($env:TX_URL) { $env:TX_URL } else { 'http://localhost:8082' }),
    [string]$K6Image = $(if ($env:K6_IMAGE) { $env:K6_IMAGE } else { 'grafana/k6:0.54.0' }),
    [switch]$Smoke,
    [switch]$Check
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Stop-WithError([string]$Message) {
    [Console]::Error.WriteLine("[ERREUR] $Message")
    exit 2
}

try {
    $testFile = Join-Path $PSScriptRoot 'k6-transactions-load.js'
    if (-not (Test-Path -LiteralPath $testFile)) { Stop-WithError "script k6 introuvable : $testFile" }
    if (-not $env:K6_ALICE_PASSWORD) { Stop-WithError "K6_ALICE_PASSWORD n'est pas défini (mot de passe de démo d'alice, à exporter)." }
    if (-not $env:K6_BOB_PASSWORD) { Stop-WithError "K6_BOB_PASSWORD n'est pas défini (mot de passe de démo de bob, à exporter)." }

    # Moteur : binaire k6 local en priorité, sinon conteneur grafana/k6 (démon Docker requis).
    $engine = $null
    if (Get-Command k6 -ErrorAction SilentlyContinue) {
        $engine = 'local'
    }
    elseif (Get-Command docker -ErrorAction SilentlyContinue) {
        & docker info *> $null
        if ($LASTEXITCODE -eq 0) { $engine = 'docker' }
    }
    if (-not $engine) { Stop-WithError "ni 'k6' ni un démon Docker joignable : installez k6 (https://k6.io) ou démarrez Docker." }

    $profile = if ($Smoke) { 'smoke' } elseif ($env:K6_PROFILE) { $env:K6_PROFILE } else { '' }
    Write-Host "==> OmniPay k6 : moteur=$engine auth=$AuthUrl transactions=$TxUrl profil=$(if ($profile -eq 'smoke') { 'smoke' } else { 'complet' })"

    # Sondes de santé (échec explicite plutôt qu'un test qui échoue au milieu).
    foreach ($probe in @(@{ Name = 'auth-service'; Url = "$AuthUrl/api/auth/health" }, @{ Name = 'transaction-service'; Url = "$TxUrl/api/transactions/health" })) {
        try {
            $null = Invoke-RestMethod -Uri $probe.Url -TimeoutSec 5
        }
        catch {
            Stop-WithError "$($probe.Name) injoignable sur $($probe.Url) : $($_.Exception.Message)"
        }
    }
    Write-Host '==> services joignables'

    if ($Check) {
        Write-Host '==> prérequis OK (aucun test lancé)'
        exit 0
    }

    if ($engine -eq 'local') {
        $env:AUTH_URL = $AuthUrl
        $env:TX_URL = $TxUrl
        $env:K6_PROFILE = $profile
        & k6 run $testFile
    }
    else {
        # Dans un conteneur, localhost désigne le conteneur : Docker Desktop (Windows/macOS) -> host.docker.internal.
        $runAuth = $AuthUrl -replace '(localhost|127\.0\.0\.1)', 'host.docker.internal'
        $runTx = $TxUrl -replace '(localhost|127\.0\.0\.1)', 'host.docker.internal'
        $net = '--add-host=host.docker.internal:host-gateway'
        $onLinux = [bool](Get-Variable -Name IsLinux -ValueOnly -ErrorAction SilentlyContinue)
        if ($onLinux) { $net = '--network=host'; $runAuth = $AuthUrl; $runTx = $TxUrl }

        # Secrets : '-e NOM' sans valeur => Docker lit l'environnement courant (rien dans la ligne de commande).
        $envArgs = @('-e', 'K6_ALICE_PASSWORD', '-e', 'K6_BOB_PASSWORD', '-e', "AUTH_URL=$runAuth", '-e', "TX_URL=$runTx", '-e', "K6_PROFILE=$profile")
        foreach ($name in 'K6_ALICE_USER', 'K6_BOB_USER', 'K6_OUT', 'K6_PROMETHEUS_RW_SERVER_URL') {
            if (Get-Item -Path "Env:$name" -ErrorAction SilentlyContinue) { $envArgs += @('-e', $name) }
        }
        # Le script est transmis sur l'entrée standard (aucun montage de volume).
        Get-Content -LiteralPath $testFile -Raw | & docker run --rm -i $net @envArgs $K6Image run -
    }
    exit $LASTEXITCODE
}
catch {
    [Console]::Error.WriteLine("[ERREUR] $($_.Exception.Message)")
    exit 1
}
