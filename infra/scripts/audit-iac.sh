#!/usr/bin/env bash
# Audit de securite statique de l'IaC (Checkov + controles de conformite OmniPay).
#
# Analyse infra/terraform, infra/network-policies et infra/ingress, puis verifie :
#   - labels PSS "restricted" dans le module namespaces,
#   - default-deny-all (Ingress + Egress),
#   - aucun conteneur root / privilegie dans les manifestes,
#   - aucun etat Terraform, cle privee ou kubeconfig dans infra/,
#   - aucun secret en clair (framework Checkov "secrets").
# Rapport : build/reports/iac-security-report.txt
#
# Si Checkov n'est pas installe : message explicatif, sortie 0 (poste de dev),
# sauf IAC_STRICT=1 (CI) qui impose son installation (sortie 2).
#   pip install checkov     |     docker run --rm -v "$PWD":/src bridgecrew/checkov -d /src/infra
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT" || exit 2
REPORT_DIR="build/reports"
REPORT="${REPORT_DIR}/iac-security-report.txt"
mkdir -p "$REPORT_DIR"

FAILED=0
{
  echo "OmniPay Zero-Trust - Rapport d'audit IaC"
  echo "Date : $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  echo "Perimetre : infra/terraform infra/network-policies infra/ingress"
  echo "============================================================"
} > "$REPORT"

log() { echo "$*" | tee -a "$REPORT"; }
check() { # check <description> <commande renvoyant 0 si conforme>
  local desc="$1"; shift
  if "$@" >/dev/null 2>&1; then log "[OK]   $desc"; else log "[FAIL] $desc"; FAILED=1; fi
}

# --- 1. Controles de conformite OmniPay ---------------------------------------
log ""
log "## Conformite OmniPay"
NS_MODULE="infra/terraform/modules/namespaces"
check "PSS enforce/warn/audit pilotes par pss_level" \
  bash -c "grep -q 'pod-security.kubernetes.io/enforce' $NS_MODULE/main.tf && grep -q 'pod-security.kubernetes.io/warn' $NS_MODULE/main.tf && grep -q 'pod-security.kubernetes.io/audit' $NS_MODULE/main.tf"
check "pss_level vaut 'restricted' par defaut" \
  bash -c "grep -A3 'variable \"pss_level\"' $NS_MODULE/variables.tf | grep -q 'default.*\"restricted\"'"
check "Chaque environnement impose pss_level = \"restricted\"" \
  bash -c "for e in dev recette prod; do grep -q 'pss_level *= *\"restricted\"' infra/terraform/envs/\$e/main.tf || exit 1; done"
check "default-deny-all couvre Ingress et Egress" \
  bash -c "grep -q 'podSelector: {}' infra/network-policies/default-deny-all.yaml && grep -q -- '- Ingress' infra/network-policies/default-deny-all.yaml && grep -q -- '- Egress' infra/network-policies/default-deny-all.yaml"
check "Aucun manifeste ne demande privileged / runAsUser 0 / hostNetwork" \
  bash -c "! grep -rEn 'privileged: *true|runAsUser: *0\b|hostNetwork: *true' infra/network-policies infra/ingress"
check "Aucun etat Terraform, cle privee ou kubeconfig dans infra/" \
  bash -c "! find infra -type f \( -name '*.tfstate*' -o -name '*.pem' -o -name '*.key' -o -name 'kubeconfig*' \) -not -path '*/.terraform/*' | grep -q ."

# --- 2. Checkov -------------------------------------------------------------------
log ""
log "## Checkov"
if ! command -v checkov >/dev/null 2>&1; then
  log "Checkov n'est pas installe sur cet hote : analyse statique ignoree."
  log "Installer : pip install checkov  (ou utiliser l'image Docker bridgecrew/checkov)."
  if [ "${IAC_STRICT:-0}" = "1" ]; then
    log "IAC_STRICT=1 : Checkov est obligatoire en CI -> echec."
    exit 2
  fi
  log "Mode non bloquant (poste de dev) : seuls les controles OmniPay ci-dessus comptent."
else
  checkov -d infra/terraform -d infra/network-policies -d infra/ingress \
    --framework terraform kubernetes secrets \
    --skip-path '.*\.terraform/.*' --compact --quiet 2>&1 | tee -a "$REPORT"
  [ "${PIPESTATUS[0]}" -eq 0 ] || FAILED=1
fi

log ""
if [ "$FAILED" -eq 0 ]; then log "RESULTAT : CONFORME"; else log "RESULTAT : NON CONFORME (voir [FAIL] / Checkov ci-dessus)"; fi
echo "Rapport : ${REPORT}"
exit "$FAILED"
