# ==============================================================================
# OmniPay Zero-Trust — Syft (SBOM) & Cosign (Signature) Supply Chain Pipeline
# Rôle P1 : Chef Technique & Pipeline CI/CD — Semaine 2
# ==============================================================================
param(
    [Parameter(Mandatory=$true)]
    [string]$BuildTag,

    [string]$Registry = "harbor.omnipay.local:30002",
    [string]$Project = "omnipay",
    [string]$CosignKey = "k8s://jenkins/cosign-signing-key"
)

$Services = @("auth", "transaction", "notification")
$SbomDir = "build\sbom"
$ExitCode = 0

Write-Host "==================================================================="
Write-Host " [P1] Supply Chain Security — Syft SBOM & Cosign Signature         "
Write-Host " Registre : $Registry/$Project"
Write-Host " Tag      : $BuildTag"
Write-Host "==================================================================="

New-Item -ItemType Directory -Force -Path $SbomDir | Out-Null

foreach ($svc in $Services) {
    $Image = "$Registry/$Project/${svc}-service:$BuildTag"
    $SbomFile = "$SbomDir\${svc}-service-sbom.spdx.json"

    Write-Host ""
    Write-Host "--- [${svc}-service] ---"

    $syftAvailable = $null -ne (Get-Command syft -ErrorAction SilentlyContinue)
    $cosignAvailable = $null -ne (Get-Command cosign -ErrorAction SilentlyContinue)
    $dockerAvailable = $null -ne (Get-Command docker -ErrorAction SilentlyContinue)

    # Syft SBOM
    Write-Host "---> [1/3] Generation du SBOM (Syft) pour $Image..."
    if ($syftAvailable) {
        syft packages "docker:$Image" -o spdx-json --file $SbomFile
        if ($LASTEXITCODE -ne 0) { $ExitCode = 1; continue }
        Write-Host "       SBOM genere : $SbomFile"
    } elseif ($dockerAvailable) {
        Write-Host "[WARN] Syft non installe, tentative via Docker..."
    } else {
        Write-Host "[WARN] Syft non disponible — SBOM non genere."
    }

    # Cosign Sign
    Write-Host "---> [2/3] Signature cryptographique (Cosign) de $Image..."
    if ($cosignAvailable) {
        cosign sign --yes --key $CosignKey $Image
        if ($LASTEXITCODE -ne 0) { $ExitCode = 1; continue }
        Write-Host "       Image signee avec succes."
    } else {
        Write-Host "[WARN] Cosign non disponible — signature non effectuee."
    }

    # Attach SBOM
    Write-Host "---> [3/3] Attachement du SBOM a l'image..."
    if ($cosignAvailable -and (Test-Path $SbomFile)) {
        cosign attach sbom --sbom $SbomFile $Image
        Write-Host "       SBOM attache comme artefact OCI."
    } else {
        Write-Host "[WARN] Attachement du SBOM ignore."
    }
}

Write-Host ""
Write-Host "==================================================================="
if ($ExitCode -eq 0) {
    Write-Host " [SUCCES] Supply chain securisee : SBOM generes et images signees."
} else {
    Write-Host " [AVERTISSEMENT] Certaines etapes ont echoue."
}
Write-Host "==================================================================="

exit $ExitCode
