#Requires -Version 7.0
# Initialise, deverrouille et provisionne Vault (idempotent). Equivalent de init-vault.sh.
# Les secrets bancaires initiaux sont generes aleatoirement DANS le pod (rien dans Git).
$ErrorActionPreference = "Stop"

$ns = "vault"
$pod = "vault-0"
$keysSecret = "vault-unseal-keys"
$esoNs = if ($env:ESO_NAMESPACE) { $env:ESO_NAMESPACE } else { "external-secrets" }
$esoSa = if ($env:ESO_SERVICE_ACCOUNT) { $env:ESO_SERVICE_ACCOUNT } else { "eso-vault-auth" }

if (-not (Get-Command kubectl -ErrorAction SilentlyContinue)) { throw "kubectl introuvable" }

# Execute une commande dans le pod ; retourne la sortie. $AllowFail : ignore le code de sortie
# (vault status renvoie 2 quand Vault est scelle).
function Invoke-Vault {
  param([string[]]$Arguments, [string]$Token, [string]$InputText, [switch]$AllowFail)
  $exec = @("exec", "-i", "-n", $ns, $pod, "-c", "vault", "--")
  if ($Token) { $exec += @("env", "VAULT_TOKEN=$Token") }
  $exec += $Arguments
  if ($PSBoundParameters.ContainsKey("InputText")) { $out = $InputText | & kubectl @exec 2>$null }
  else { $out = & kubectl @exec 2>$null }
  if (-not $AllowFail -and $LASTEXITCODE -ne 0) { throw "vault $($Arguments -join ' ') a echoue (code $LASTEXITCODE)" }
  return ($out -join "`n")
}
function Get-VaultStatus { Invoke-Vault -Arguments @("vault", "status", "-format=json") -AllowFail | ConvertFrom-Json -ErrorAction SilentlyContinue }

Write-Host "== 1/5 Attente de $pod"
$status = $null
for ($i = 0; $i -lt 90; $i++) {
  $phase = kubectl get pod -n $ns $pod -o jsonpath='{.status.phase}' 2>$null
  if ($phase -eq "Running") { $status = Get-VaultStatus; if ($null -ne $status) { break } }
  Start-Sleep -Seconds 2
}
if ($null -eq $status) { throw "Vault ne repond pas : kubectl -n $ns describe pod $pod" }

Write-Host "== 2/5 Initialisation"
if ($status.initialized) {
  Write-Host "   Vault deja initialise"
} else {
  kubectl get secret -n $ns $keysSecret 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { throw "Vault non initialise mais le Secret $keysSecret existe deja : etat incoherent." }
  $initJson = Invoke-Vault -Arguments @("vault", "operator", "init", "-key-shares=3", "-key-threshold=2", "-format=json")
  kubectl create secret generic $keysSecret -n $ns --from-literal=init.json="$initJson" | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "creation du Secret $keysSecret echouee" }
  Remove-Variable initJson
  Write-Host "   Cles stockees dans le Secret $ns/$keysSecret"
}

$b64 = kubectl get secret -n $ns $keysSecret -o jsonpath='{.data.init\.json}'
if ($LASTEXITCODE -ne 0 -or -not $b64) { throw "Secret $keysSecret introuvable : impossible de deverrouiller Vault." }
$init = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($b64)) | ConvertFrom-Json
$unsealKeys = @($init.unseal_keys_b64)
$rootToken = $init.root_token
Remove-Variable init, b64
if ($unsealKeys.Count -lt 2 -or -not $rootToken) { throw "Contenu de $keysSecret illisible." }

Write-Host "== 3/5 Unseal (2 cles sur 3)"
if ((Get-VaultStatus).sealed) {
  foreach ($key in $unsealKeys[0..1]) { Invoke-Vault -Arguments @("vault", "operator", "unseal", $key) | Out-Null }
}
for ($i = 0; $i -lt 30; $i++) { if (-not (Get-VaultStatus).sealed) { break }; Start-Sleep -Seconds 2 }
if ((Get-VaultStatus).sealed) { throw "Vault est toujours scelle." }
Remove-Variable unsealKeys
Write-Host "   Sealed: false"

Write-Host "== 4/5 Moteur KV v2, auth Kubernetes, politique et role"
if ((Invoke-Vault -Token $rootToken -Arguments @("vault", "secrets", "list", "-format=json")) -notmatch '"secret/"') {
  Invoke-Vault -Token $rootToken -Arguments @("vault", "secrets", "enable", "-path=secret", "kv-v2") | Out-Null
}
if ((Invoke-Vault -Token $rootToken -Arguments @("vault", "auth", "list", "-format=json")) -notmatch '"kubernetes/"') {
  Invoke-Vault -Token $rootToken -Arguments @("vault", "auth", "enable", "kubernetes") | Out-Null
}
Invoke-Vault -Token $rootToken -Arguments @("vault", "write", "auth/kubernetes/config",
  "kubernetes_host=https://kubernetes.default.svc:443") | Out-Null

$policy = @'
# Lecture seule sur les secrets applicatifs OmniPay.
path "secret/data/omnipay/*" {
  capabilities = ["read"]
}
'@
Invoke-Vault -Token $rootToken -InputText $policy -Arguments @("vault", "policy", "write", "omnipay-app-policy", "-") | Out-Null

Invoke-Vault -Token $rootToken -Arguments @("vault", "write", "auth/kubernetes/role/omnipay-role",
  "bound_service_account_names=$esoSa", "bound_service_account_namespaces=$esoNs",
  "policies=omnipay-app-policy", "ttl=1h") | Out-Null

Write-Host "== 5/5 Secrets bancaires initiaux (generes dans le pod)"
$gen = 'head -c 96 /dev/urandom | base64 | tr -dc A-Za-z0-9'
$kv = @(
  @{ Path = "secret/omnipay/database"; Put = "vault kv put secret/omnipay/database username=omnipay password=`"`$($gen | head -c 32)`"" },
  @{ Path = "secret/omnipay/jwt"; Put = "vault kv put secret/omnipay/jwt secret=`"`$($gen | head -c 64)`"" }
)
foreach ($item in $kv) {
  $null = Invoke-Vault -Token $rootToken -Arguments @("vault", "kv", "get", $item.Path) -AllowFail
  if ($LASTEXITCODE -eq 0) { Write-Host "   $($item.Path) existe deja : conserve"; continue }
  Invoke-Vault -Token $rootToken -Arguments @("sh", "-c", $item.Put) | Out-Null
  Write-Host "   $($item.Path) cree"
}
Remove-Variable rootToken

Write-Host ""
Write-Host "Vault pret. UI : http://<IP_NOEUD>:30006"
Write-Host "ATTENTION : cles d'unseal et root token dans le Secret $ns/$keysSecret."
Write-Host "Hors laboratoire : les copier dans un gestionnaire de secrets, puis supprimer ce Secret."
Write-Host "Etape suivante : ./infra/external-secrets/install-eso.ps1"
