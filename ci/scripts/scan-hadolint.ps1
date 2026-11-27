# ==============================================================================
# OmniPay Zero-Trust — Hadolint : Linting des Dockerfiles (Shift-Left)
# Rôle P1 : Chef Technique & Pipeline CI/CD — Semaine 2
# ==============================================================================
param(
    [string]$ProjectRoot = (Resolve-Path "$PSScriptRoot\..\..").Path
)

$ErrorActionPreference = "Continue"

$Dockerfiles = @(
    "services\auth\Dockerfile",
    "services\transaction\Dockerfile",
    "services\notification\Dockerfile"
)

$HadolintImage = "hadolint/hadolint:latest"
$ExitCode = 0

Write-Host "==================================================================="
Write-Host " [P1] Hadolint — Analyse qualite des Dockerfiles (Shift-Left)      "
Write-Host "==================================================================="

foreach ($df in $Dockerfiles) {
    $FullPath = Join-Path $ProjectRoot $df
    if (-Not (Test-Path $FullPath)) {
        Write-Host "[WARN] Dockerfile introuvable : $df — ignore."
        continue
    }

    Write-Host ""
    Write-Host "---> Analyse de $df..."

    $dockerAvailable = $null -ne (Get-Command docker -ErrorAction SilentlyContinue)

    if ($dockerAvailable) {
        try {
            $result = Get-Content $FullPath -Raw | docker run --rm -i $HadolintImage 2>&1
            if ($LASTEXITCODE -ne 0) {
                Write-Host "[ECHEC] Hadolint a detecte des violations dans $df :"
                Write-Host $result
                $ExitCode = 1
            } elseif ($result) {
                Write-Host "[AVERTISSEMENT] Hadolint signale des recommandations :"
                Write-Host $result
            } else {
                Write-Host "[OK] $df — Aucune violation detectee."
            }
        } catch {
            Write-Host "[WARN] Erreur Docker : $_"
            $ExitCode = 1
        }
    } else {
        Write-Host "[WARN] Docker non disponible. Verification manuelle de base..."
        $content = Get-Content $FullPath -Raw
        if ($content -match "(?m)^USER\s+root") {
            Write-Host "[ECHEC] $df utilise USER root — interdit en Zero-Trust."
            $ExitCode = 1
        } elseif ($content -notmatch "(?m)^USER\s+") {
            Write-Host "[AVERTISSEMENT] $df ne definit pas de USER non-root."
        } else {
            Write-Host "[OK] $df — Verification basique reussie."
        }
    }
}

Write-Host ""
Write-Host "==================================================================="
if ($ExitCode -eq 0) {
    Write-Host " [SUCCES] Tous les Dockerfiles sont conformes aux standards."
} else {
    Write-Host " [ECHEC] Des violations Hadolint ont ete detectees. Corrigez-les."
}
Write-Host "==================================================================="

exit $ExitCode
