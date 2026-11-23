#!/usr/bin/env bash
# Mesure le temps de reconstruction de la couche Terraform d'un environnement (destroy puis apply).
# C'est la brique "infrastructure" du RTO ; le RTO complet inclut aussi le bootstrap de la plateforme et
# ArgoCD (voir docs/runbooks/disaster-recovery-test.md). Le RPO de la definition de l'infrastructure est
# nul : tout est dans Git. Les DONNEES (ex. base de Vault sur son PVC) dependent des sauvegardes.
#
# DESTRUCTIF : supprime le namespace omnipay-<env> et tout ce qu'il contient.
#   ./infra/scripts/measure-terraform-rto.sh --yes [--env dev]
# Prerequis : KUBE_CONFIG_PATH (ex. ~/.kube/config), terraform, cluster K3s accessible.
# Sortie : 0 si RTO_TARGET (900 s) respecte, 1 sinon, 2 si prerequis ou confirmation manquants.
set -euo pipefail

ENV_NAME="dev"
YES=0
RTO_TARGET="${RTO_TARGET:-900}"
while [ $# -gt 0 ]; do
  case "$1" in
    --env) ENV_NAME="${2:-}"; shift 2 ;;
    --yes) YES=1; shift ;;
    *) echo "Usage : $0 --yes [--env dev|recette|prod]" >&2; exit 2 ;;
  esac
done
[ "$YES" -eq 1 ] || { echo "Operation destructive (destroy puis apply de omnipay-${ENV_NAME}). Relancer avec --yes." >&2; exit 2; }
command -v terraform >/dev/null 2>&1 || { echo "terraform introuvable" >&2; exit 2; }
: "${KUBE_CONFIG_PATH:?Definir KUBE_CONFIG_PATH (ex. export KUBE_CONFIG_PATH=~/.kube/config)}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DIR="${ROOT}/infra/terraform/envs/${ENV_NAME}"
[ -d "$DIR" ] || { echo "Environnement inconnu : ${DIR}" >&2; exit 2; }
cd "$DIR"

VARS=()
[ -f "${ROOT}/infra/terraform/terraform.tfvars" ] && VARS=(-var-file="${ROOT}/infra/terraform/terraform.tfvars")

terraform init -input=false >/dev/null
echo "== Etat initial"
terraform state list | wc -l | xargs echo "   ressources dans l'etat :"

T0="$(date +%s)"
echo "== destroy"
terraform destroy -auto-approve -input=false "${VARS[@]}" >/dev/null
T1="$(date +%s)"
echo "== apply"
terraform apply -auto-approve -input=false "${VARS[@]}" >/dev/null
T2="$(date +%s)"

fmt() { printf '%dm%02ds' $(($1 / 60)) $(($1 % 60)); }
TOTAL=$((T2 - T0))
echo
echo "Destruction      : $(fmt $((T1 - T0)))"
echo "Reconstruction   : $(fmt $((T2 - T1)))"
echo "Total Terraform  : $(fmt "$TOTAL")   (objectif RTO < $(fmt "$RTO_TARGET"))"
if [ "$TOTAL" -le "$RTO_TARGET" ]; then echo "RESULTAT : objectif respecte pour la couche Terraform."; exit 0; fi
echo "RESULTAT : objectif depasse." >&2
exit 1
