# ==============================================================================
# OmniPay Zero-Trust — Trivy : Scan de vulnérabilités des images conteneurs
# Rôle P1 : Chef Technique & Pipeline CI/CD — Semaine 2
# ==============================================================================
param(
    [Parameter(Mandatory=$true)]
    [string]$ImageRef,

    [string]$SeverityThreshold = "CRITICAL,HIGH"
)

$TrivyImage = "aquasec/trivy:latest"
$ExitCode = 0

Write-Host "==================================================================="
Write-Host " [P1] Trivy — Scan de vulnerabilites conteneur                     "
Write-Host " Image : $ImageRef"
Write-Host " Seuil : $SeverityThreshold"
Write-Host "==================================================================="

$dockerAvailable = $null -ne (Get-Command docker -ErrorAction SilentlyContinue)

if ($dockerAvailable) {
    Write-Host "---> Lancement du scan Trivy via Docker..."
    docker run --rm `
        -v //var/run/docker.sock:/var/run/docker.sock `
        $TrivyImage image `
        --severity $SeverityThreshold `
        --exit-code 1 `
        --no-progress `
        --format table `
        $ImageRef

    if ($LASTEXITCODE -ne 0) {
        $ExitCode = 1
        Write-Host "[ECHEC] Trivy a detecte des vulnerabilites $SeverityThreshold dans $ImageRef."
    }
} else {
    Write-Host "[WARN] Docker non disponible. Scan Trivy saute."
}

Write-Host ""
Write-Host "==================================================================="
if ($ExitCode -eq 0) {
    Write-Host " [SUCCES] Aucune vulnerabilite $SeverityThreshold dans $ImageRef."
} else {
    Write-Host " [ECHEC] Vulnerabilites critiques detectees. Build bloque."
}
Write-Host "==================================================================="

exit $ExitCode
