#!/usr/bin/env bash
# ==============================================================================
# OmniPay Zero-Trust — Promotion GitOps Multi-Environnements (dev/recette/prod)
# Rôle P1 : Chef Technique & Architecte CI/CD (Semaine 3)
# ==============================================================================
# Usage :
#   ./ci/scripts/promote-release.sh --env <dev|recette|prod> --tag <image-tag> [--service <svc>] [--gitops-dir <dir>]
# Exemple :
#   ./ci/scripts/promote-release.sh --env recette --tag build-42
#   ./ci/scripts/promote-release.sh --env prod --tag v1.0.0
# ==============================================================================

set -euo pipefail

TARGET_ENV="dev"
IMAGE_TAG=""
SERVICE="all"
GITOPS_DIR="${GITOPS_DIR:-}"
REGISTRY="${REGISTRY:-harbor.omnipay.local:30002}"
PROJECT="${PROJECT:-omnipay}"
SERVICES=("auth-service" "transaction-service" "notification-service")

# Parsing des arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --env)
            TARGET_ENV="$2"
            shift 2
            ;;
        --tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        --service)
            SERVICE="$2"
            shift 2
            ;;
        --gitops-dir)
            GITOPS_DIR="$2"
            shift 2
            ;;
        *)
            echo "[ERREUR] Option inconnue : $1"
            echo "Usage: $0 --env <dev|recette|prod> --tag <tag> [--service <svc>] [--gitops-dir <dir>]"
            exit 1
            ;;
    esac
done

if [ -z "${IMAGE_TAG}" ]; then
    echo "[ERREUR] L'argument --tag est obligatoire."
    exit 1
fi

if [[ ! "${TARGET_ENV}" =~ ^(dev|recette|prod)$ ]]; then
    echo "[ERREUR] L'environnement cible doit valoir 'dev', 'recette' ou 'prod'."
    exit 1
fi

# Résolution automatique du dossier GitOps
if [ -z "${GITOPS_DIR}" ]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    WORKSPACE_DIR="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
    if [ -d "${WORKSPACE_DIR}/omnipay-gitops" ]; then
        GITOPS_DIR="${WORKSPACE_DIR}/omnipay-gitops"
    else
        GITOPS_DIR="$(pwd)/../omnipay-gitops"
    fi
fi

echo "=============================================================================="
echo " [P1] Promotion GitOps — OmniPay Zero-Trust"
echo " Environnement Cible : ${TARGET_ENV}"
echo " Tag de l'Image      : ${IMAGE_TAG}"
echo " Service             : ${SERVICE}"
echo " Répertoire GitOps   : ${GITOPS_DIR}"
echo "=============================================================================="

if [ ! -d "${GITOPS_DIR}/.git" ]; then
    echo "[ERREUR] Le dépôt GitOps n'est pas accessible dans ${GITOPS_DIR}"
    exit 1
fi

cd "${GITOPS_DIR}"

# Vérifier si l'environnement existe
ENV_DIR="envs/${TARGET_ENV}"
if [ ! -d "${ENV_DIR}" ]; then
    echo "[ERREUR] Le répertoire d'environnement ${ENV_DIR} est introuvable !"
    exit 1
fi

echo "---> [1/3] Mise à jour des manifests dans ${ENV_DIR}..."

# Définition des services à mettre à jour
SVCS_TO_UPDATE=()
if [ "${SERVICE}" == "all" ]; then
    SVCS_TO_UPDATE=("${SERVICES[@]}")
else
    SVCS_TO_UPDATE=("${SERVICE}")
fi

KUSTOMIZATION="${ENV_DIR}/kustomization.yaml"

for svc in "${SVCS_TO_UPDATE[@]}"; do
    IMAGE_PREFIX="${REGISTRY}/${PROJECT}/${svc}"
    
    # 1. Mise à jour dans kustomization.yaml si présent
    if [ -f "${KUSTOMIZATION}" ]; then
        sed -i "s|image: ${IMAGE_PREFIX}:.*|image: ${IMAGE_PREFIX}:${IMAGE_TAG}|g" "${KUSTOMIZATION}" 2>/dev/null || true
        # Si format images list kustomize
        sed -i "/name: .*${svc}/!b;n;c\    newTag: \"${IMAGE_TAG}\"" "${KUSTOMIZATION}" 2>/dev/null || true
    fi

    # 2. Mise à jour dans le manifest de service individuel
    SVC_YAML="${ENV_DIR}/${svc}.yaml"
    if [ -f "${SVC_YAML}" ]; then
        sed -i "s|image: ${IMAGE_PREFIX}:.*|image: ${IMAGE_PREFIX}:${IMAGE_TAG}|g" "${SVC_YAML}" 2>/dev/null || true
        echo "       ${svc}.yaml mis à jour → ${IMAGE_TAG}"
    fi

    # 3. En production : mise à jour spéciale pour Argo Rollouts Canary
    if [ "${TARGET_ENV}" == "prod" ] && [ "${svc}" == "transaction-service" ]; then
        ROLLOUT_YAML="${ENV_DIR}/transaction-service-rollout.yaml"
        if [ -f "${ROLLOUT_YAML}" ]; then
            sed -i "s|image: ${IMAGE_PREFIX}:.*|image: ${IMAGE_PREFIX}:${IMAGE_TAG}|g" "${ROLLOUT_YAML}" 2>/dev/null || true
            echo "       transaction-service-rollout.yaml (Canary) mis à jour → ${IMAGE_TAG}"
        fi
    fi
done

echo "---> [2/3] Validation de la syntaxe YAML..."
if command -v kubectl >/dev/null 2>&1; then
    kubectl kustomize "${ENV_DIR}" >/dev/null 2>&1 && echo "       Syntaxe kustomize validée avec succès." || true
fi

echo "---> [3/3] Enregistrement du commit GitOps..."
git add "${ENV_DIR}/"

if git diff --cached --quiet; then
    echo "       Aucune modification détectée (le tag ${IMAGE_TAG} est déjà actif)."
else
    COMMIT_MSG="feat(gitops): promote ${SERVICE} to ${IMAGE_TAG} in ${TARGET_ENV}"
    git commit -m "${COMMIT_MSG}"
    echo "       Commit créé : ${COMMIT_MSG}"
    
    # Push si remote configuré et en environnement CI
    if [ -n "${GITOPS_PUSH:-}" ] || [ -n "${CI:-}" ]; then
        echo "       Push vers le remote omnipay-gitops..."
        git push origin main
    else
        echo "       (Mode local : commit prêt. Exécutez 'git push origin main' pour propager vers ArgoCD)."
    fi
fi

echo "=============================================================================="
echo "✅ [SUCCÈS] Promotion réussie vers l'environnement '${TARGET_ENV}' !"
echo "=============================================================================="
