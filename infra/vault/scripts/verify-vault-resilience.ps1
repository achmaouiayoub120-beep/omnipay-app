#Requires -Version 7.0
# Verifie la resilience de HashiCorp Vault et d'External Secrets Operator (equivalent de verify-vault-resilience.sh).
#   Scenario 1 : Vault SCELLE            -> Secret K8s et pod inchanges
#   Scenario 2 : UNSEAL et reconnexion   -> ESO resynchronise sans redemarrage de pod
#   Scenario 3 : rotation a chaud        -> nouvelle valeur propagee en < 30 s
# Travaille sur un secret dedie (secret/omnipay/resilience-test) : n'altere pas database ni jwt.
# Variables : NS_APP (omnipay-dev), SYNC_TIMEOUT (30), RECONNECT_TIMEOUT (90), IMAGE (busybox:1.36)
# Sortie : 0 = OK, 1 = echec, 2 = prerequis manquant.
$ErrorActionPreference = "Stop"

$nsVault = "vault"; $podVault = "vault-0"; $keysSecret = "vault-unseal-keys"; $store = "vault-backend"
$nsApp = if ($env:NS_APP) { $env:NS_APP } else { "omnipay-dev" }
$image = if ($env:IMAGE) { $env:IMAGE } else { "busybox:1.36" }
$syncTimeout = if ($env:SYNC_TIMEOUT) { [int]$env:SYNC_TIMEOUT } else { 30 }
$reconnectTimeout = if ($env:RECONNECT_TIMEOUT) { [int]$env:RECONNECT_TIMEOUT } else { 90 }
$name = "resilience-test"; $probe = "resilience-probe"; $kvPath = "secret/omnipay/resilience-test"
$script:pass = 0; $script:fail = 0

function Ok($m) { Write-Host "  [OK]   $m" -ForegroundColor Green; $script:pass++ }
function Ko($m) { Write-Host "  [FAIL] $m" -ForegroundColor Red; $script:fail++ }
function Info($m) { Write-Host "  ..     $m" }
function Quiet-Kubectl { & kubectl @args 2>$null }

if (-not (Get-Command kubectl -ErrorAction SilentlyContinue)) { Write-Error "kubectl introuvable"; exit 2 }
Quiet-Kubectl get ns $nsApp | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Error "Namespace $nsApp introuvable"; exit 2 }
Quiet-Kubectl get clustersecretstore $store | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Error "ClusterSecretStore $store absent : lancer install-eso.ps1"; exit 2 }

# --- Acces a Vault (cles lues dans le Secret du cluster, jamais affichees) --------------------------
$b64 = kubectl get secret -n $nsVault $keysSecret -o jsonpath='{.data.init\.json}'
$init = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($b64)) | ConvertFrom-Json
$unsealKeys = @($init.unseal_keys_b64); $rootToken = $init.root_token
Remove-Variable init, b64
if ($unsealKeys.Count -lt 2 -or -not $rootToken) { Write-Error "Secret $keysSecret illisible"; exit 2 }

function Invoke-Vault {
  param([string[]]$Arguments, [switch]$Token, [switch]$AllowFail)
  $exec = @("exec", "-i", "-n", $nsVault, $podVault, "-c", "vault", "--")
  if ($Token) { $exec += @("env", "VAULT_TOKEN=$rootToken") }
  $out = & kubectl @exec @Arguments 2>$null
  if (-not $AllowFail -and $LASTEXITCODE -ne 0) { throw "vault $($Arguments -join ' ') a echoue" }
  return ($out -join "`n")
}
function Get-VaultStatus { Invoke-Vault -Arguments @("vault", "status", "-format=json") -AllowFail | ConvertFrom-Json -ErrorAction SilentlyContinue }
function Test-Sealed { $s = Get-VaultStatus; return ($null -ne $s -and $s.sealed) }
function Test-Unsealed { $s = Get-VaultStatus; return ($null -ne $s -and -not $s.sealed) }
function Unseal-Vault { foreach ($k in $unsealKeys[0..1]) { Invoke-Vault -Arguments @("vault", "operator", "unseal", $k) | Out-Null } }
function Put-Random($prefix) {
  $cmd = "vault kv put $kvPath value=`"$prefix-`$(head -c 48 /dev/urandom | base64 | tr -dc A-Za-z0-9 | head -c 24)`""
  Invoke-Vault -Token -Arguments @("sh", "-c", $cmd) | Out-Null
}

# --- Aides Kubernetes --------------------------------------------------------------------------------
function Wait-Until([int]$Seconds, [scriptblock]$Condition) {
  for ($i = 0; $i -lt $Seconds; $i++) { if (& $Condition) { return $true }; Start-Sleep -Seconds 1 }
  return $false
}
function EsCond($field) { Quiet-Kubectl get externalsecret -n $nsApp $name -o "jsonpath={.status.conditions[?(@.type=='Ready')].$field}" }
function EsReady { (EsCond "status") -eq "True" }
function EsNotReady { (EsCond "status") -eq "False" }
function StoreReady { (Quiet-Kubectl get clustersecretstore $store -o "jsonpath={.status.conditions[?(@.type=='Ready')].status}") -eq "True" }
function ForceSync { kubectl annotate externalsecret -n $nsApp $name "force-sync=$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())" --overwrite | Out-Null }
function SecretHash {
  $v = Quiet-Kubectl get secret -n $nsApp $name -o "jsonpath={.data.VALUE}"
  if (-not $v) { return "" }
  $bytes = [Convert]::FromBase64String($v)
  return ([BitConverter]::ToString([Security.Cryptography.SHA256]::HashData($bytes)) -replace '-', '').Substring(0, 12).ToLower()
}
function SecretExists { Quiet-Kubectl get secret -n $nsApp $name | Out-Null; return ($LASTEXITCODE -eq 0) }
function PodState { Quiet-Kubectl get pod -n $nsApp $probe -o "jsonpath={.metadata.uid}/{.status.containerStatuses[0].restartCount}/{.status.phase}" }
function ProbeReads($hash) {
  $v = Quiet-Kubectl exec -n $nsApp $probe -- cat /secrets/VALUE
  if (-not $v) { return $false }
  $h = ([BitConverter]::ToString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes(($v -join "`n")))) -replace '-', '').Substring(0, 12).ToLower()
  return ($h -eq $hash)
}

try {
  Write-Host "== Preparation"
  if (Test-Sealed) { Info "Vault scelle au depart : deverrouillage"; Unseal-Vault }
  if (Test-Sealed) { Write-Error "Impossible de deverrouiller Vault"; exit 2 }
  Put-Random "v1"
  Info "secret $kvPath cree (valeur generee dans le pod Vault)"

  @"
apiVersion: external-secrets.io/v1
kind: ExternalSecret
metadata:
  name: $name
  namespace: $nsApp
spec:
  refreshInterval: 1h
  secretStoreRef: {kind: ClusterSecretStore, name: $store}
  target: {name: $name, creationPolicy: Owner}
  data:
    - secretKey: VALUE
      remoteRef: {key: omnipay/resilience-test, property: value}
"@ | kubectl apply -f - | Out-Null
  if (-not (Wait-Until 60 { EsReady })) { Write-Error "ExternalSecret non synchronise"; exit 2 }

  @"
apiVersion: v1
kind: Pod
metadata:
  name: $probe
  namespace: $nsApp
spec:
  securityContext: {runAsNonRoot: true, runAsUser: 10001, runAsGroup: 10001, seccompProfile: {type: RuntimeDefault}}
  containers:
    - name: probe
      image: $image
      command: ["sh", "-c", "while true; do cat /secrets/VALUE >/dev/null || exit 1; sleep 5; done"]
      securityContext: {allowPrivilegeEscalation: false, readOnlyRootFilesystem: true, capabilities: {drop: ["ALL"]}}
      resources: {requests: {cpu: 10m, memory: 16Mi}, limits: {cpu: 50m, memory: 32Mi}}
      volumeMounts: [{name: s, mountPath: /secrets, readOnly: true}]
  volumes: [{name: s, secret: {secretName: $name}}]
"@ | kubectl apply -f - | Out-Null
  kubectl wait -n $nsApp --for=condition=Ready "pod/$probe" --timeout=90s | Out-Null
  if ($LASTEXITCODE -ne 0) { Write-Error "Pod de test non demarre (image bloquee par Kyverno ? quota ?)"; exit 2 }
  $hash0 = SecretHash; $state0 = PodState
  Info "pod $probe : $state0 (uid/redemarrages/phase), empreinte du secret $hash0"

  Write-Host "`n== Scenario 1 : Vault SCELLE (panne ou verrouillage d'urgence)"
  Invoke-Vault -Token -Arguments @("vault", "operator", "seal") | Out-Null
  if (Wait-Until 15 { Test-Sealed }) { Ok "Vault est scelle (vault operator seal)" } else { Ko "Vault n'est pas passe a l'etat scelle" }
  Start-Sleep -Seconds 3
  if ((SecretExists) -and ((SecretHash) -eq $hash0)) { Ok "Le Secret Kubernetes $name est conserve, valeur inchangee" } else { Ko "Le Secret Kubernetes a disparu ou change" }
  if ((PodState) -eq $state0) { Ok "Le pod consommateur n'a pas redemarre ($state0)" } else { Ko "Le pod a change d'etat : $(PodState)" }
  if (ProbeReads $hash0) { Ok "Le pod continue de lire son secret (volume monte)" } else { Ko "Le pod ne lit plus son secret" }
  ForceSync
  if (Wait-Until 25 { EsNotReady }) { Info "ESO signale l'indisponibilite de Vault (attendu) : $(EsCond 'reason')"; Ok "ESO detecte la panne sans supprimer le Secret cible" }
  else { Info "ESO n'a pas (encore) marque l'ExternalSecret en erreur : $(EsCond 'reason')" }
  if (SecretExists) { Ok "Le Secret cible existe toujours apres l'echec de synchronisation" } else { Ko "Secret cible supprime par ESO" }

  Write-Host "`n== Scenario 2 : UNSEAL et reconnexion automatique"
  Unseal-Vault
  if (Wait-Until 30 { Test-Unsealed }) { Ok "Vault deverrouille (Sealed: false)" } else { Ko "Vault toujours scelle" }
  $sw = [Diagnostics.Stopwatch]::StartNew()
  ForceSync
  if (Wait-Until $reconnectTimeout { EsReady }) { Ok "ExternalSecret de nouveau Ready en $([int]$sw.Elapsed.TotalSeconds) s (objectif < $reconnectTimeout s)" }
  else { Ko "ExternalSecret toujours en erreur apres $reconnectTimeout s : $(EsCond 'reason')" }
  if (StoreReady) { Ok "ClusterSecretStore $store Ready" } else { Info "ClusterSecretStore pas encore revalide (ESO le reverifie a son rythme)" }
  if ((PodState) -eq $state0) { Ok "Aucun pod redemarre pendant tout l'incident ($state0)" } else { Ko "Etat du pod modifie : $(PodState)" }

  Write-Host "`n== Scenario 3 : rotation de secret a chaud"
  Put-Random "v2"
  $sw = [Diagnostics.Stopwatch]::StartNew()
  ForceSync
  if (Wait-Until $syncTimeout { (SecretHash) -ne $hash0 }) { Ok "Nouvelle valeur propagee dans le Secret Kubernetes en $([int]$sw.Elapsed.TotalMilliseconds) ms (limite $syncTimeout s)" }
  else { Ko "Valeur non propagee en $syncTimeout s" }
  Info "Un pod qui monte le Secret en volume voit la valeur apres la synchro du kubelet (~1 min) ; une variable d'environnement exige un rolling restart."
}
finally {
  # Ne jamais laisser Vault scelle apres le test
  try { if (Test-Sealed) { Unseal-Vault } } catch { }
  Quiet-Kubectl delete externalsecret -n $nsApp $name --ignore-not-found | Out-Null
  Quiet-Kubectl delete pod -n $nsApp $probe --ignore-not-found --wait=false | Out-Null
  Quiet-Kubectl delete secret -n $nsApp $name --ignore-not-found | Out-Null
  try { Invoke-Vault -Token -AllowFail -Arguments @("vault", "kv", "metadata", "delete", $kvPath) | Out-Null } catch { }
  Remove-Variable rootToken, unsealKeys -ErrorAction SilentlyContinue
}

Write-Host "`nResultat : $($script:pass) OK, $($script:fail) echec(s)"
if ($script:fail -eq 0) { exit 0 } else { exit 1 }
