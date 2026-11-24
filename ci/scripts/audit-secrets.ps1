# ==============================================================================
# Script d'audit de détection de secrets — OmniPay Zero-Trust
# ==============================================================================
param (
    [string]$TargetDir = "."
)

Write-Host "=== AUDIT DE SECRETS OMNIPAY ZERO-TRUST ===" -ForegroundColor Cyan
Write-Host "Cible : $TargetDir"

$gitleaksCmd = Get-Command "gitleaks" -ErrorAction SilentlyContinue

if ($gitleaksCmd) {
    Write-Host "[INFO] Exécution via le binaire local gitleaks..." -ForegroundColor Green
    & gitleaks dir $TargetDir --config "$TargetDir/.gitleaks.toml" -v
    exit $LASTEXITCODE
}

# Tentative via Docker si daemon actif
$dockerCmd = Get-Command "docker" -ErrorAction SilentlyContinue
if ($dockerCmd) {
    $dockerCheck = docker info 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[INFO] Exécution via l'image Docker zricethezav/gitleaks:latest..." -ForegroundColor Green
        docker run --rm -v "${PWD}:/path" zricethezav/gitleaks:latest dir /path --config /path/.gitleaks.toml -v
        exit $LASTEXITCODE
    }
}

# Mode Fallback local rigoureux : scan regex basé sur les règles de .gitleaks.toml
Write-Host "[INFO] Gitleaks / Docker non détectés dans ce contexte d'exécution. Utilisation du moteur d'analyse statique regex interne..." -ForegroundColor Yellow

$patterns = @(
    '(?i)(api[_-]?key|secret[_-]?key|auth[_-]?token|private[_-]?key)\s*[:=]\s*["''][A-Za-z0-9/\+=_-]{16,}["'']',
    '(?i)(jwt[_-]?secret|jwt[_-]?signing[_-]?key)\s*[:=]\s*["''][A-Za-z0-9/\+=_-]{10,}["'']',
    '-----BEGIN [A-Z]+ PRIVATE KEY-----',
    '(?i)ghp_[A-Za-z0-9]{36}',
    '(?i)AIza[0-9A-Za-z_-]{35}'
)

$allowlistRegexes = @(
    'AKIAIOSFODNN7EXAMPLE',
    'dummy-secret-for-testing-only'
)

$excludedDirs = @('\.git', 'target', '\.idea', '\.vscode', 'node_modules', 'storybook-static', 'dist')

$files = Get-ChildItem -Path $TargetDir -Recurse -File | Where-Object {
    $file = $_
    $skip = $false
    foreach ($ex in $excludedDirs) {
        if ($file.FullName -match $ex) { $skip = $true; break }
    }
    -not $skip
}

$foundSecrets = 0

foreach ($f in $files) {
    # Ne pas auto-scanner la configuration gitleaks elle-même ni le script d'audit
    if ($f.Name -eq ".gitleaks.toml" -or $f.Name -eq "audit-secrets.ps1" -or $f.Name -eq "gitleaks.md") {
        continue
    }

    $lines = Get-Content -Path $f.FullName -ErrorAction SilentlyContinue
    $lineNum = 1
    foreach ($line in $lines) {
        foreach ($p in $patterns) {
            if ($line -match $p) {
                $matchedText = $Matches[0]
                $isAllowed = $false
                foreach ($allow in $allowlistRegexes) {
                    if ($line -match $allow) { $isAllowed = $true; break }
                }
                if (-not $isAllowed) {
                    Write-Host "[ALERTE SÉCURITÉ] Secret potentiel détecté dans $($f.FullName):$lineNum" -ForegroundColor Red
                    Write-Host "  Pattern: $p" -ForegroundColor DarkRed
                    $foundSecrets++
                }
            }
        }
        $lineNum++
    }
}

if ($foundSecrets -gt 0) {
    Write-Host "`n[ÉCHEC] $foundSecrets secret(s) potentiel(s) détecté(s) !" -ForegroundColor Red
    exit 1
} else {
    Write-Host "`n[SUCCÈS] Aucun secret non autorisé détecté dans le répertoire." -ForegroundColor Green
    exit 0
}
