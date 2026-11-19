# ==============================================================================
# OmniPay Zero-Trust — GitOps Write-Back : mise a jour automatique du tag
# d'image dans omnipay-gitops pour declencher ArgoCD
# Role P1 : Chef Technique & Pipeline CI/CD — Semaine 2
# ==============================================================================
param(
    [Parameter(Mandatory=$true)]
    [string]$BuildTag,

    [string]$GitopsDir = (Resolve-Path "$PSScriptRoot\..\..\..\..\omnipay-gitops" -ErrorAction SilentlyContinue),
    [string]$GitopsRemote = "https://github.com/achmaouiayoub120-beep/omnipay-gitops.git",
    [string]$Registry = "harbor.omnipay.local:30002",
    [string]$Project = "omnipay",
    [string]$TargetEnv = "dev"
)

$Services = @("auth-service", "transaction-service", "notification-service")

Write-Host "==================================================================="
Write-Host " [P1] GitOps Write-Back — Mise a jour automatique via Git          "
Write-Host " Build Tag : $BuildTag"
Write-Host " Cible     : envs/$TargetEnv/"
Write-Host "==================================================================="

# 1. Preparer le depot GitOps
if (Test-Path "$GitopsDir\.git") {
    Push-Location $GitopsDir
    git checkout main
    git pull origin main --ff-only
} else {
    git clone $GitopsRemote $GitopsDir
    Push-Location $GitopsDir
}

# 2. Mettre a jour les fichiers de deploiement
foreach ($svc in $Services) {
    $SvcFile = "envs\$TargetEnv\$svc.yaml"
    if (Test-Path $SvcFile) {
        (Get-Content $SvcFile -Raw) -replace "image: $Registry/$Project/${svc}:.*", "image: $Registry/$Project/${svc}:$BuildTag" | Set-Content $SvcFile
        Write-Host "       $SvcFile mis a jour."
    }
}

# 3. Commit
git add "envs\$TargetEnv\"
$CommitMsg = "feat(gitops): auto-deploy $BuildTag to $TargetEnv [skip ci]"

$diff = git diff --cached --stat
if ($diff) {
    git commit -m $CommitMsg
    Write-Host "       Commit cree : $CommitMsg"
} else {
    Write-Host "       Aucune modification detectee."
}

# 4. Push
git push origin main
if ($LASTEXITCODE -ne 0) {
    git -c "http.curloptResolve=github.com:443:140.82.121.4" push origin main
}

Pop-Location

Write-Host ""
Write-Host "==================================================================="
Write-Host " [SUCCES] GitOps Write-Back termine."
Write-Host " ArgoCD synchronisera automatiquement $TargetEnv avec $BuildTag."
Write-Host "==================================================================="
