#Requires -Version 7.0
# Simule une intrusion dans un pod bancaire et verifie que Falco la detecte.
# Equivalent de test-falco-detection.sh. Sortie 0 = interceptee ; 1 = non detectee ; 2 = prerequis.
# Variables : NAMESPACE (omnipay-dev), IMAGE (busybox:1.36), DETECT_TIMEOUT (10), FALCO_NAMESPACE (falco)
$ErrorActionPreference = "Stop"

$namespace = if ($env:NAMESPACE) { $env:NAMESPACE } else { "omnipay-dev" }
$falcoNs = if ($env:FALCO_NAMESPACE) { $env:FALCO_NAMESPACE } else { "falco" }
$image = if ($env:IMAGE) { $env:IMAGE } else { "busybox:1.36" }
$timeout = if ($env:DETECT_TIMEOUT) { [int]$env:DETECT_TIMEOUT } else { 10 }
$pod = "falco-test-$PID"
$mark = "[ZERO-TRUST INTRUSION]"

if (-not (Get-Command kubectl -ErrorAction SilentlyContinue)) { Write-Error "kubectl introuvable"; exit 2 }
kubectl get ns $namespace 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Error "Namespace $namespace introuvable"; exit 2 }
if (-not (kubectl get pods -n $falcoNs -l app.kubernetes.io/name=falco --no-headers 2>$null)) {
  Write-Error "Aucun pod Falco dans $falcoNs : lancer infra/falco/install-falco.ps1"; exit 2
}

try {
  Write-Host "== Pod de test $pod dans $namespace"
  $overrides = @{
    spec = @{
      securityContext = @{ runAsNonRoot = $true; runAsUser = 10001; runAsGroup = 10001; seccompProfile = @{ type = "RuntimeDefault" } }
      containers = @(@{
          name = $pod; image = $image; command = @("sleep", "300")
          securityContext = @{ allowPrivilegeEscalation = $false; readOnlyRootFilesystem = $true; capabilities = @{ drop = @("ALL") } }
          resources = @{ requests = @{ cpu = "10m"; memory = "16Mi" }; limits = @{ cpu = "50m"; memory = "32Mi" } }
        })
    }
  } | ConvertTo-Json -Depth 8 -Compress
  kubectl -n $namespace run $pod --image=$image --restart=Never --overrides=$overrides | Out-Null
  if ($LASTEXITCODE -ne 0) { Write-Error "creation du pod de test echouee"; exit 2 }
  kubectl -n $namespace wait --for=condition=Ready "pod/$pod" --timeout=90s | Out-Null
  if ($LASTEXITCODE -ne 0) { Write-Error "Le pod de test n'a pas demarre (image bloquee par Kyverno ? quota ?)"; exit 2 }

  Write-Host "== Intrusion simulee (shell + lecture du token ServiceAccount + outil reseau)"
  $sw = [Diagnostics.Stopwatch]::StartNew()
  kubectl -n $namespace exec $pod -- sh -c 'cat /var/run/secrets/kubernetes.io/serviceaccount/token >/dev/null 2>&1; nc -z -w 1 127.0.0.1 9 >/dev/null 2>&1; true' | Out-Null

  Write-Host "== Recherche de l'alerte Falco (max ${timeout}s)"
  $found = $null
  while ($sw.Elapsed.TotalSeconds -le $timeout) {
    $logs = kubectl logs -n $falcoNs -l app.kubernetes.io/name=falco -c falco --tail=200 --since=60s 2>$null
    $found = $logs | Where-Object { $_.Contains($mark) -and $_.Contains($pod) } | Select-Object -First 5
    if ($found) { break }
    Start-Sleep -Milliseconds 300
  }
  $sw.Stop()

  if (-not $found) {
    Write-Host "[FAIL] Aucune alerte $mark pour $pod en ${timeout}s." -ForegroundColor Red
    Write-Host "       Verifier : kubectl logs -n $falcoNs -l app.kubernetes.io/name=falco -c falco --tail=30"
    exit 1
  }
  Write-Host "[OK]   Intrusion interceptee par Falco en $([int]$sw.Elapsed.TotalMilliseconds) ms (mesure bout en bout, logs inclus) :" -ForegroundColor Green
  $found | ForEach-Object { $_.Substring(0, [Math]::Min(300, $_.Length)) }
  exit 0
}
finally {
  kubectl -n $namespace delete pod $pod --ignore-not-found --wait=false 2>$null | Out-Null
}
