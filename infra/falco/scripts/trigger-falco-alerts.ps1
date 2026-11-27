#Requires -Version 7.0
<#
.SYNOPSIS
  Declencheur d'alertes Falco eBPF pour la Demo 4 (equivalent de trigger-falco-alerts.sh).
.DESCRIPTION
  -Attack shell | file | binary | all  (sans argument : menu)
  Les attaques tournent dans un bac a sable (namespace falco-demo, conteneur root, racine inscriptible) :
  dans un pod omnipay-* (non-root, lecture seule) elles echouent deja et Falco n'a rien a signaler.
  Le namespace est supprime a la fin (sauf -NoCleanup).
  Variables : NS (falco-demo), FALCO_NAMESPACE (falco), IMAGE (busybox:1.36).
  Sortie : 0 = tout detecte, 1 = au moins une attaque non detectee, 2 = prerequis manquant.
#>
param(
  [ValidateSet("shell", "file", "binary", "all", "")] [string]$Attack = "",
  [string]$Namespace = $(if ($env:NS) { $env:NS } else { "falco-demo" }),
  [switch]$NoCleanup
)
$ErrorActionPreference = "Stop"

$falcoNs = if ($env:FALCO_NAMESPACE) { $env:FALCO_NAMESPACE } else { "falco" }
$image = if ($env:IMAGE) { $env:IMAGE } else { "busybox:1.36" }
$pod = "attacker-demo"
$script:detected = 0; $script:launched = 0

if (-not $Attack) {
  Write-Host "Quelle attaque simuler ?"
  Write-Host "  1) shell   : terminal interactif dans un pod"
  Write-Host "  2) file    : lecture de /etc/shadow et /etc/sudoers"
  Write-Host "  3) binary  : ecriture dans /usr/bin"
  Write-Host "  4) all     : les trois"
  $choice = Read-Host "Choix [1-4]"
  $Attack = switch ($choice) { "1" { "shell" } "2" { "file" } "3" { "binary" } "4" { "all" } default { Write-Error "Choix invalide"; exit 2 } }
}

if (-not (Get-Command kubectl -ErrorAction SilentlyContinue)) { Write-Error "kubectl introuvable"; exit 2 }
if (-not (kubectl get pods -n $falcoNs -l app.kubernetes.io/name=falco --no-headers 2>$null)) {
  Write-Error "Aucun pod Falco dans $falcoNs : lancer infra/falco/install-falco.ps1"; exit 2
}

function Show-Alerts([string]$Pattern, [string]$Label) {
  $lines = $null
  for ($i = 0; $i -lt 12; $i++) {
    $logs = kubectl logs -n $falcoNs -l app.kubernetes.io/name=falco -c falco --since=60s --tail=500 2>$null
    $lines = @($logs | Where-Object { $_ -match $Pattern -and $_.Contains($pod) } | Select-Object -Last 2)
    if ($lines.Count -gt 0) { break }
    Start-Sleep -Milliseconds 500
  }
  $script:launched++
  if ($lines.Count -gt 0) {
    $script:detected++
    Write-Host ">>> ALERTE FALCO : $Label" -ForegroundColor Red
    foreach ($l in $lines) {
      $m = [regex]::Match($l, '"output":"([^"]{0,300})')
      Write-Host ("    " + $(if ($m.Success) { $m.Groups[1].Value } else { $l.Substring(0, [Math]::Min(300, $l.Length)) }))
    }
  } else {
    Write-Host ">>> aucune alerte '$Label' trouvee (regle desactivee ? Falco pas pret ?)" -ForegroundColor Yellow
  }
  Write-Host ""
}

try {
  Write-Host "== Bac a sable $Namespace (conteneur root, racine inscriptible : simule une mauvaise configuration)"
  @"
apiVersion: v1
kind: Namespace
metadata:
  name: $Namespace
  labels:
    project: omnipay
    purpose: falco-demo
    pod-security.kubernetes.io/enforce: baseline
    pod-security.kubernetes.io/warn: baseline
    pod-security.kubernetes.io/audit: baseline
"@ | kubectl apply -f - | Out-Null
  kubectl -n $Namespace run $pod --image=$image --restart=Never --command -- sleep 3600 | Out-Null
  kubectl -n $Namespace wait --for=condition=Ready "pod/$pod" --timeout=90s | Out-Null
  if ($LASTEXITCODE -ne 0) { Write-Error "Le pod $pod n'a pas demarre (image bloquee par Kyverno ? `$env:IMAGE=...)"; exit 2 }
  kubectl -n $Namespace exec $pod -- sh -c '[ -f /etc/shadow ] || echo "demo:*:19000:0:99999:7:::" > /etc/shadow; [ -f /etc/sudoers ] || echo "demo ALL=(ALL) ALL" > /etc/sudoers' | Out-Null
  Start-Sleep -Seconds 2

  function Attack-Shell {
    Write-Host "[ATTAQUE 1] Terminal interactif dans le pod : kubectl exec -it $pod -- /bin/sh" -ForegroundColor Yellow
    $interactive = [Environment]::UserInteractive -and -not [Console]::IsInputRedirected -and -not [Console]::IsOutputRedirected
    $flags = if ($interactive) { "-it" } else { "-i" }
    if (-not $interactive) { Write-Host "    (pas de terminal : TTY non alloue, la regle 'Terminal shell' exige un TTY)" }
    kubectl exec $flags -n $Namespace $pod -- /bin/sh -c 'id; hostname; sleep 1'
    Show-Alerts 'Terminal shell in container|shell was spawned' "shell interactif dans un conteneur"
  }
  function Attack-File {
    Write-Host "[ATTAQUE 2] Lecture de fichiers sensibles : cat /etc/shadow ; cat /etc/sudoers" -ForegroundColor Yellow
    kubectl exec -n $Namespace $pod -- sh -c 'cat /etc/shadow >/dev/null; cat /etc/sudoers >/dev/null; true'
    Show-Alerts 'Read sensitive file|sensitive file opened' "lecture de fichier sensible"
  }
  function Attack-Binary {
    Write-Host "[ATTAQUE 3] Modification de binaire systeme : ecriture dans /usr/bin" -ForegroundColor Yellow
    kubectl exec -n $Namespace $pod -- sh -c 'echo "#!/bin/sh" > /usr/bin/falco-demo-implant; chmod +x /usr/bin/falco-demo-implant; true'
    Show-Alerts 'below a known binary directory|Write below binary dir' "ecriture sous un repertoire de binaires"
  }

  switch ($Attack) {
    "shell" { Attack-Shell }
    "file" { Attack-File }
    "binary" { Attack-Binary }
    "all" { Attack-Shell; Attack-File; Attack-Binary }
  }
}
finally {
  if ($NoCleanup) { Write-Host "== -NoCleanup : namespace $Namespace conserve (kubectl delete ns $Namespace)" }
  else { Write-Host "== Nettoyage : suppression du namespace $Namespace"; kubectl delete namespace $Namespace --ignore-not-found --wait=false 2>$null | Out-Null }
}

if ($script:detected -eq $script:launched) {
  Write-Host "RESULTAT : $($script:detected)/$($script:launched) attaque(s) detectee(s) par Falco (eBPF)." -ForegroundColor Green
  exit 0
}
Write-Host "RESULTAT : $($script:detected)/$($script:launched) attaque(s) detectee(s)." -ForegroundColor Red
Write-Host "Verifier : kubectl logs -n $falcoNs -l app.kubernetes.io/name=falco -c falco --tail=30"
exit 1
