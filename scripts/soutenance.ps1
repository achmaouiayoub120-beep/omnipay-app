# ==============================================================================
# OmniPay Zero-Trust — Script Tout-en-Un d'Installation & Lancement Soutenance
# Compatibilité : Windows PowerShell 5.1 / PowerShell 7+
# ==============================================================================
# Exemples d'utilisation :
#   .\scripts\soutenance.ps1                       # Lance toute la stack (auto-init .env + build + healthcheck)
#   .\scripts\soutenance.ps1 -Action install       # Prépare .env, installe frontend npm et construit les images Docker
#   .\scripts\soutenance.ps1 -Action start -WithJenkins -OpenBrowser
#   .\scripts\soutenance.ps1 -Action start -NoBuild
#   .\scripts\soutenance.ps1 -Action frontend      # Lance uniquement le frontend Vite (Mode Démo) sur :3000
#   .\scripts\soutenance.ps1 -Action status        # Vérifie l'état des conteneurs et sondes HTTP
#   .\scripts\soutenance.ps1 -Action test          # Exécute les tests frontend (Vitest) et smoke-tests backend
#   .\scripts\soutenance.ps1 -Action logs          # Affiche les journaux temps réel Docker Compose
#   .\scripts\soutenance.ps1 -Action stop          # Arrête proprement tous les serveurs
# ==============================================================================

[CmdletBinding()]
param (
    [ValidateSet("install", "start", "stop", "restart", "status", "logs", "test", "frontend", "help")]
    [string]$Action = "start",
    [switch]$WithJenkins,
    [switch]$NoBuild,
    [switch]$OpenBrowser,
    [switch]$Clean,
    [int]$HealthTimeoutSec = 180
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$FrontendDir = Join-Path $RootDir "services\frontend"
$EnvExample = Join-Path $RootDir ".env.example"
$EnvFile = Join-Path $RootDir ".env"
$ComposeFile = Join-Path $RootDir "docker-compose.yml"
$JenkinsComposeFile = Join-Path $RootDir "ci\docker-compose-jenkins.yml"

function Show-Banner {
    Write-Host @"

  ██████╗ ███╗   ███╗███╗   ██╗██╗██████╗  █████╗ ██╗   ██╗
 ██╔═══██╗████╗ ████║████╗  ██║██║██╔══██╗██╔══██╗╚██╗ ██╔╝
 ██║   ██║██╔████╔██║██╔██╗ ██║██║██████╔╝███████║ ╚████╔╝ 
 ██║   ██║██║╚██╔╝██║██║╚██╗██║██║██╔═══╝ ██╔══██║  ╚██╔╝  
 ╚██████╔╝██║ ╚═╝ ██║██║ ╚████║██║██║     ██║  ██║   ██║   
  ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═══╝╚═╝╚═╝     ╚═╝  ╚═╝   ╚═╝   
        ORCHESTRATEUR DE SOUTENANCE — OMNIPAY ZERO-TRUST
"@ -ForegroundColor Cyan
}

function Show-Usage {
    Show-Banner
    Write-Host @"
Usage : .\scripts\soutenance.ps1 [-Action <action>] [options]

Actions disponibles :
  install    Vérifie les prérequis, initialise .env, installe le frontend (npm) et build les images Docker
  start      Prépare .env (si absent), démarre PostgreSQL + 3 microservices + Frontend Nginx (défaut)
  stop       Arrête les conteneurs Docker Compose (-Clean supprime aussi les volumes)
  restart    Redémarre toute la stack soutenance
  status     Affiche l'état des conteneurs et teste les sondes de santé HTTP
  logs       Suit les logs en direct de Docker Compose
  test       Exécute le build + tests Vitest du frontend et les smoke-tests API
  frontend   Lance uniquement le frontend Vite (Mode Démo résilient) sur http://localhost:3000
  help       Affiche cette aide

Options :
  -WithJenkins       Inclut le serveur CI Jenkins (http://localhost:8088)
  -NoBuild           Démarre les conteneurs existants sans reconstruire les images
  -OpenBrowser       Ouvre automatiquement l'application dans le navigateur une fois prête
  -Clean             Avec -Action stop : supprime également les volumes Docker (données PostgreSQL)
  -HealthTimeoutSec  Délai maximal d'attente des healthchecks en secondes (défaut : 180)
"@ -ForegroundColor White
}

function Test-CommandExists {
    param([string]$Name)
    return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Start-DockerDesktopIfNeeded {
    $candidates = @(
        (Join-Path $env:LOCALAPPDATA "Programs\DockerDesktop\Docker Desktop.exe"),
        (Join-Path $env:ProgramFiles "Docker\Docker\Docker Desktop.exe"),
        (Join-Path ${env:ProgramFiles(x86)} "Docker\Docker\Docker Desktop.exe")
    ) | Where-Object { $_ -and (Test-Path $_) }

    $exe = $candidates | Select-Object -First 1
    if (-not $exe) {
        return $false
    }

    Write-Host "`n[DOCKER] Docker Desktop n'est pas encore actif. Démarrage automatique en cours..." -ForegroundColor Yellow
    Start-Process -FilePath $exe | Out-Null

    $deadline = (Get-Date).AddSeconds(90)
    while ((Get-Date) -lt $deadline) {
        Start-Sleep -Seconds 3
        & docker info 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✔ Docker Desktop est prêt." -ForegroundColor Green
            return $true
        }
    }
    return $false
}

function Get-ComposeRunner {
    param([switch]$AutoStartDocker)

    if (-not (Test-CommandExists "docker")) {
        throw "Docker est introuvable dans le PATH. Installez Docker Desktop avant de lancer la stack complète."
    }

    $prevPref = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        & docker info 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            $started = $false
            if ($AutoStartDocker) {
                $started = Start-DockerDesktopIfNeeded
            }
            if (-not $started) {
                throw "Le daemon Docker ne répond pas. Veuillez démarrer Docker Desktop puis relancer ce script (ou utilisez Lancer-Demo-Frontend.bat / -Action frontend pour le mode démo sans Docker)."
            }
        }

        & docker compose version 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            return "v2"
        }
        if (Test-CommandExists "docker-compose") {
            return "v1"
        }
    } finally {
        $ErrorActionPreference = $prevPref
    }
    throw "Docker Compose est introuvable (ni 'docker compose', ni 'docker-compose')."
}

function Invoke-Compose {
    param(
        [string]$Runner,
        [string]$File,
        [string[]]$ComposeArgs
    )
    Push-Location $RootDir
    $prevPref = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        if ($Runner -eq "v2") {
            & docker compose -f $File @ComposeArgs
        } else {
            & docker-compose -f $File @ComposeArgs
        }
        if ($LASTEXITCODE -ne 0) {
            throw "La commande Docker Compose a échoué (code $LASTEXITCODE)."
        }
    } finally {
        $ErrorActionPreference = $prevPref
        Pop-Location
    }
}

function New-JwtSecretBase64 {
    $bytes = New-Object byte[] 48
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $rng.GetBytes($bytes)
    } finally {
        $rng.Dispose()
    }
    return [Convert]::ToBase64String($bytes)
}

function Ensure-EnvFile {
    Write-Host "`n[ENV] Vérification de la configuration locale (.env)..." -ForegroundColor Yellow

    if (-not (Test-Path $EnvFile)) {
        if (-not (Test-Path $EnvExample)) {
            throw "Fichier modèle .env.example introuvable dans $RootDir."
        }
        Copy-Item -Path $EnvExample -Destination $EnvFile
        Write-Host "  ✔ Fichier .env créé depuis .env.example." -ForegroundColor Green
    } else {
        Write-Host "  ✔ Fichier .env existant détecté." -ForegroundColor Green
    }

    $lines = Get-Content -Path $EnvFile -Encoding UTF8
    $hasJwt = $false
    $updated = $false
    $newLines = foreach ($line in $lines) {
        if ($line -match '^\s*OMNIPAY_JWT_SECRET\s*=(.*)$') {
            $hasJwt = $true
            $val = $Matches[1].Trim()
            if ([string]::IsNullOrWhiteSpace($val)) {
                $generated = New-JwtSecretBase64
                $updated = $true
                Write-Host "  ✔ OMNIPAY_JWT_SECRET généré localement (48 octets aléatoires)." -ForegroundColor Green
                "OMNIPAY_JWT_SECRET=$generated"
            } else {
                $line
            }
        } else {
            $line
        }
    }

    if (-not $hasJwt) {
        $generated = New-JwtSecretBase64
        $newLines = @($newLines) + "OMNIPAY_JWT_SECRET=$generated"
        $updated = $true
        Write-Host "  ✔ OMNIPAY_JWT_SECRET ajouté au fichier .env." -ForegroundColor Green
    }

    if ($updated) {
        $utf8NoBom = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::WriteAllLines($EnvFile, [string[]]$newLines, $utf8NoBom)
    }
}

function Install-FrontendDependencies {
    Write-Host "`n[FRONTEND] Installation des dépendances et build de vérification..." -ForegroundColor Yellow
    if (-not (Test-CommandExists "node") -or -not (Test-CommandExists "npm")) {
        Write-Host "  ⚠ Node.js / npm introuvable localement : le frontend sera construit uniquement dans Docker." -ForegroundColor DarkYellow
        return
    }

    Push-Location $FrontendDir
    $prevPref = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        if (-not (Test-Path (Join-Path $FrontendDir "node_modules"))) {
            Write-Host "  • Exécution de npm ci --legacy-peer-deps..." -ForegroundColor Cyan
            & npm ci --legacy-peer-deps
            if ($LASTEXITCODE -ne 0) {
                throw "Échec de npm ci --legacy-peer-deps."
            }
        } else {
            Write-Host "  ✔ Répertoire node_modules déjà présent." -ForegroundColor Green
        }

        Write-Host "  • Vérification TypeScript + Build Vite (npm run build)..." -ForegroundColor Cyan
        & npm run build
        if ($LASTEXITCODE -ne 0) {
            throw "Échec du build frontend."
        }
        Write-Host "  ✔ Frontend compilé avec succès." -ForegroundColor Green
    } finally {
        $ErrorActionPreference = $prevPref
        Pop-Location
    }
}

function Test-HttpHealth {
    param([string]$Url)
    try {
        $res = Invoke-WebRequest -Uri $Url -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
        return ($res.StatusCode -ge 200 -and $res.StatusCode -lt 400)
    } catch {
        return $false
    }
}

function Wait-ForServicesHealth {
    param([int]$TimeoutSeconds)
    Write-Host "`n[HEALTHCHECK] Attente du démarrage des serveurs (timeout ${TimeoutSeconds}s)..." -ForegroundColor Yellow

    $targets = @(
        @{ Name = "Auth Service (:8081)";         Url = "http://localhost:8081/api/auth/health" },
        @{ Name = "Transaction Service (:8082)";  Url = "http://localhost:8082/api/transactions/health" },
        @{ Name = "Notification Service (:8083)"; Url = "http://localhost:8083/api/notifications/health" },
        @{ Name = "Portail Web Frontend (:8080)"; Url = "http://localhost:8080/health" }
    )
    if ($WithJenkins) {
        $targets += @{ Name = "Jenkins CI (:8088)"; Url = "http://localhost:8088/login" }
    }

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    $readyMap = @{}
    foreach ($t in $targets) { $readyMap[$t.Name] = $false }

    while ((Get-Date) -lt $deadline) {
        $allReady = $true
        foreach ($t in $targets) {
            if (-not $readyMap[$t.Name]) {
                if (Test-HttpHealth -Url $t.Url) {
                    $readyMap[$t.Name] = $true
                    Write-Host "  ✔ $($t.Name) est prêt ($($t.Url))" -ForegroundColor Green
                } else {
                    $allReady = $false
                }
            }
        }
        if ($allReady) {
            return $true
        }
        Start-Sleep -Seconds 3
    }

    foreach ($t in $targets) {
        if (-not $readyMap[$t.Name]) {
            Write-Host "  ⚠ $($t.Name) n'a pas encore répondu dans le délai imparti ($($t.Url))." -ForegroundColor DarkYellow
        }
    }
    return $false
}

function Show-SoutenanceSummary {
    $jenkinsRow = if ($WithJenkins) {
        "`n║ Jenkins CI/CD (JCasC)           ║ http://localhost:8088                   ║ admin / AdminSecureOmniPay2026! ║"
    } else { "" }

    Write-Host @"

=============================================================================
        OMNIPAY ZERO-TRUST — ENVIRONNEMENT DE SOUTENANCE PRÊT
=============================================================================
╔═════════════════════════════════╦═════════════════════════════════════════╦═════════════════════════════════╗
║ Service                         ║ URL Locale                              ║ Détail / Santé                  ║
╠═════════════════════════════════╬═════════════════════════════════════════╬═════════════════════════════════╣
║ Portail Web Bancaire (UI)       ║ http://localhost:8080                   ║ /health                         ║
║ Auth Microservice (JWT)         ║ http://localhost:8081                   ║ /api/auth/health                ║
║ Transaction Microservice        ║ http://localhost:8082                   ║ /api/transactions/health        ║
║ Notification Microservice       ║ http://localhost:8083                   ║ /api/notifications/health       ║
║ Base PostgreSQL 16              ║ localhost:5432                          ║ DB omnipay_db                   ║$jenkinsRow
╚═════════════════════════════════╩═════════════════════════════════════════╩═════════════════════════════════╝

Comptes de démonstration soutenance (mot de passe universel : password) :
  • alice   (ROLE_USER)     — Compte client émetteur
  • bob     (ROLE_USER)     — Bénéficiaire interne
  • admin   (ROLE_ADMIN)    — Superviseur + Mode Jury (raccourci Ctrl+Shift+J)
  • auditor (ROLE_AUDITOR)  — Auditeur conformité en lecture seule

Raccourcis UI utiles devant le jury :
  • Ctrl+K / ⌘K      : Palette de commande & recherche rapide
  • Ctrl+Shift+J     : Tour de Contrôle DevSecOps (Mode Jury)
  • Bouton Œil carte : Révélation temporaire PAN + CVV (10s)
=============================================================================
"@ -ForegroundColor Cyan
}

if ($Action -eq "help") {
    Show-Usage
    exit 0
}

Show-Banner

try {
    switch ($Action) {
        "install" {
            Write-Host "`n[INSTALL] Vérification des prérequis système..." -ForegroundColor Yellow
            foreach ($tool in @("docker", "node", "npm", "java", "git")) {
                if (Test-CommandExists $tool) {
                    Write-Host "  ✔ $tool détecté" -ForegroundColor Green
                } else {
                    Write-Host "  ℹ $tool absent du PATH (optionnel si exécution via Docker)" -ForegroundColor DarkGray
                }
            }

            Ensure-EnvFile
            Install-FrontendDependencies

            $runner = Get-ComposeRunner -AutoStartDocker
            Write-Host "`n[DOCKER] Construction des images applicatives OmniPay..." -ForegroundColor Yellow
            Invoke-Compose -Runner $runner -File $ComposeFile -ComposeArgs @("build")

            if ($WithJenkins -and (Test-Path $JenkinsComposeFile)) {
                Write-Host "`n[DOCKER] Construction de l'image Jenkins CI/CD..." -ForegroundColor Yellow
                Invoke-Compose -Runner $runner -File $JenkinsComposeFile -ComposeArgs @("build")
            }

            Write-Host "`n✔ Installation terminée. Lancez la soutenance avec : .\scripts\soutenance.ps1" -ForegroundColor Green
        }

        "start" {
            Ensure-EnvFile
            $runner = Get-ComposeRunner -AutoStartDocker

            $upArgs = @("up", "-d")
            if (-not $NoBuild) {
                $upArgs += "--build"
            }

            Write-Host "`n[START] Démarrage de la stack complète OmniPay Zero-Trust..." -ForegroundColor Yellow
            Invoke-Compose -Runner $runner -File $ComposeFile -ComposeArgs $upArgs

            if ($WithJenkins -and (Test-Path $JenkinsComposeFile)) {
                Write-Host "`n[START] Démarrage de Jenkins CI/CD..." -ForegroundColor Yellow
                Invoke-Compose -Runner $runner -File $JenkinsComposeFile -ComposeArgs $upArgs
            }

            $null = Wait-ForServicesHealth -TimeoutSeconds $HealthTimeoutSec
            Show-SoutenanceSummary

            if ($OpenBrowser) {
                Start-Process "http://localhost:8080"
            }
        }

        "restart" {
            & $MyInvocation.MyCommand.Path -Action "stop" -WithJenkins:$WithJenkins
            & $MyInvocation.MyCommand.Path -Action "start" -WithJenkins:$WithJenkins -NoBuild:$NoBuild -OpenBrowser:$OpenBrowser -HealthTimeoutSec $HealthTimeoutSec
        }

        "stop" {
            $runner = Get-ComposeRunner
            Write-Host "`n[STOP] Arrêt de la stack OmniPay Zero-Trust..." -ForegroundColor Yellow
            $downArgs = @("down")
            if ($Clean) {
                $downArgs += "-v"
                Write-Host "  ⚠ Option -Clean active : suppression des volumes Docker." -ForegroundColor DarkYellow
            }
            Invoke-Compose -Runner $runner -File $ComposeFile -ComposeArgs $downArgs

            if ($WithJenkins -and (Test-Path $JenkinsComposeFile)) {
                Invoke-Compose -Runner $runner -File $JenkinsComposeFile -ComposeArgs @("down")
            }
            Write-Host "✔ Tous les serveurs ont été arrêtés proprement." -ForegroundColor Green
        }

        "status" {
            Write-Host "`n[STATUS] État des conteneurs Docker :" -ForegroundColor Yellow
            try {
                $runner = Get-ComposeRunner
                Invoke-Compose -Runner $runner -File $ComposeFile -ComposeArgs @("ps")
            } catch {
                Write-Host "  ⚠ $($_.Exception.Message)" -ForegroundColor DarkYellow
            }

            Write-Host "`n[STATUS] Vérification des endpoints locaux :" -ForegroundColor Yellow
            $probes = @(
                @{ Label = "Frontend Nginx (:8080)";   Url = "http://localhost:8080/health" },
                @{ Label = "Auth (:8081)";             Url = "http://localhost:8081/api/auth/health" },
                @{ Label = "Transaction (:8082)";      Url = "http://localhost:8082/api/transactions/health" },
                @{ Label = "Notification (:8083)";     Url = "http://localhost:8083/api/notifications/health" },
                @{ Label = "Jenkins CI (:8088)";       Url = "http://localhost:8088/login" },
                @{ Label = "Frontend Vite (:3000)";    Url = "http://localhost:3000/" }
            )
            foreach ($p in $probes) {
                if (Test-HttpHealth -Url $p.Url) {
                    Write-Host "  ✔ $($p.Label) -> EN LIGNE ($($p.Url))" -ForegroundColor Green
                } else {
                    Write-Host "  • $($p.Label) -> HORS LIGNE" -ForegroundColor DarkGray
                }
            }
        }

        "logs" {
            $runner = Get-ComposeRunner
            Invoke-Compose -Runner $runner -File $ComposeFile -ComposeArgs @("logs", "-f", "--tail=100")
        }

        "test" {
            Write-Host "`n[TEST] Validation Frontend (TypeScript, Build & Vitest)..." -ForegroundColor Yellow
            if (Test-CommandExists "npm") {
                Push-Location $FrontendDir
                $prevPref = $ErrorActionPreference
                $ErrorActionPreference = "Continue"
                try {
                    & npm run build
                    if ($LASTEXITCODE -ne 0) { throw "Échec du build frontend." }
                    & npx vitest run
                    if ($LASTEXITCODE -ne 0) { throw "Échec des tests Vitest." }
                } finally {
                    $ErrorActionPreference = $prevPref
                    Pop-Location
                }
            } else {
                Write-Host "  ⚠ npm absent : tests frontend ignorés." -ForegroundColor DarkYellow
            }

            $smokeScript = Join-Path $RootDir "ci\scripts\smoke-tests.ps1"
            if (Test-Path $smokeScript) {
                Write-Host "`n[TEST] Exécution des smoke-tests microservices..." -ForegroundColor Yellow
                & powershell -ExecutionPolicy Bypass -File $smokeScript -BaseUrl "http://localhost" -TargetEnv "local"
            }
        }

        "frontend" {
            if (-not (Test-CommandExists "npm")) {
                throw "Node.js / npm est requis pour lancer le frontend en mode autonome."
            }
            Push-Location $FrontendDir
            $prevPref = $ErrorActionPreference
            $ErrorActionPreference = "Continue"
            try {
                if (-not (Test-Path (Join-Path $FrontendDir "node_modules"))) {
                    Write-Host "`n[FRONTEND] Installation des dépendances npm..." -ForegroundColor Yellow
                    & npm ci --legacy-peer-deps
                    if ($LASTEXITCODE -ne 0) { throw "Échec de npm ci." }
                }
                Write-Host "`n[FRONTEND] Lancement du serveur Vite sur http://localhost:3000 ..." -ForegroundColor Green
                if ($OpenBrowser) {
                    Start-Job -ScriptBlock {
                        for ($i = 0; $i -lt 30; $i++) {
                            try {
                                $r = Invoke-WebRequest -Uri "http://localhost:3000/" -TimeoutSec 1 -UseBasicParsing -ErrorAction Stop
                                if ($r.StatusCode -ge 200) {
                                    Start-Process "http://localhost:3000"
                                    break
                                }
                            } catch {}
                            Start-Sleep -Milliseconds 500
                        }
                    } | Out-Null
                }
                & npm run dev -- --port 3000
            } finally {
                $ErrorActionPreference = $prevPref
                Pop-Location
            }
        }
    }
} catch {
    Write-Host "`n[ERREUR] $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

exit 0
