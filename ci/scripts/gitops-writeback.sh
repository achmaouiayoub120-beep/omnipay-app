#!/usr/bin/env bash
# ==============================================================================
# OmniPay Zero-Trust — GitOps Write-Back : mise à jour automatique du tag
# d'image dans omnipay-gitops pour déclencher ArgoCD
# Rôle P1 : Chef Technique & Pipeline CI/CD — Semaine 2
# ==============================================================================
set -euo pipefail

BUILD_TAG="${1:?Usage: $0 <build-tag> [gitops-repo-path]}"
GITOPS_DIR="${2:-$(dirname "$(dirname "$(dirname "$(realpath "$0")")")")/../omnipay-gitops}"
GITOPS_REMOTE="${GITOPS_REMOTE:-https://github.com/achmaouiayoub120-beep/omnipay-gitops.git}"
SERVICES=("auth-service" "transaction-service" "notification-service")
REGISTRY="${REGISTRY:-harbor.omnipay.local:30002}"
PROJECT="${PROJECT:-omnipay}"
TARGET_ENV="dev"

echo "==================================================================="
echo " [P1] GitOps Write-Back — Mise à jour automatique via Git          "
echo " Build Tag : ${BUILD_TAG}"
echo " Cible     : envs/${TARGET_ENV}/kustomization.yaml"
echo "==================================================================="

# ----- Étape 1 : Cloner ou mettre à jour le dépôt GitOps -----
echo "---> [1/4] Préparation du dépôt omnipay-gitops..."
if [ -d "${GITOPS_DIR}/.git" ]; then
    echo "       Dépôt existant détecté. Mise à jour (pull)..."
    cd "${GITOPS_DIR}"
    git checkout main
    git pull origin main --ff-only
else
    echo "       Clonage du dépôt GitOps..."
    git clone "${GITOPS_REMOTE}" "${GITOPS_DIR}"
    cd "${GITOPS_DIR}"
fi

# ----- Étape 2 : Mettre à jour les références d'images -----
KUSTOMIZATION="envs/${TARGET_ENV}/kustomization.yaml"
echo "---> [2/4] Mise à jour des tags d'images dans ${KUSTOMIZATION}..."

if [ ! -f "${KUSTOMIZATION}" ]; then
    echo "[ERREUR] Fichier ${KUSTOMIZATION} introuvable !"
    exit 1
fi

for svc in "${SERVICES[@]}"; do
    OLD_IMAGE="${REGISTRY}/${PROJECT}/${svc}"
    NEW_TAG="${BUILD_TAG}"

    # Mise à jour avec sed — cherche le pattern newTag ou tag existant
    if grep -q "newTag:" "${KUSTOMIZATION}" 2>/dev/null; then
        sed -i "s|newTag:.*# ${svc}|newTag: \"${NEW_TAG}\" # ${svc}|g" "${KUSTOMIZATION}" 2>/dev/null || true
    fi

    # Mise à jour directe des références d'image (image: registry/project/svc:tag)
    sed -i "s|image: ${OLD_IMAGE}:.*|image: ${OLD_IMAGE}:${NEW_TAG}|g" "${KUSTOMIZATION}" 2>/dev/null || true

    echo "       ${svc} → ${NEW_TAG}"
done

# Mise à jour dans les fichiers de déploiement individuels (si kustomize n'est pas utilisé)
for svc in "${SERVICES[@]}"; do
    SVC_FILE="envs/${TARGET_ENV}/${svc}.yaml"
    if [ -f "${SVC_FILE}" ]; then
        sed -i "s|image: ${REGISTRY}/${PROJECT}/${svc}:.*|image: ${REGISTRY}/${PROJECT}/${svc}:${BUILD_TAG}|g" "${SVC_FILE}" 2>/dev/null || true
        echo "       ${SVC_FILE} mis à jour."
    fi
done

# ----- Étape 3 : Commit Git -----
echo "---> [3/4] Commit des modifications..."
git add envs/${TARGET_ENV}/
git diff --cached --stat

COMMIT_MSG="feat(gitops): auto-deploy ${BUILD_TAG} to ${TARGET_ENV} [skip ci]"

if git diff --cached --quiet; then
    echo "       Aucune modification détectée (les tags sont peut-être déjà à jour)."
else
    git commit -m "${COMMIT_MSG}"
    echo "       Commit créé : ${COMMIT_MSG}"
fi

# ----- Étape 4 : Push vers le remote -----
echo "---> [4/4] Push vers origin main..."
git push origin main || {
    echo "[WARN] Push standard échoué, tentative avec résolution DNS..."
    git -c http.curloptResolve="github.com:443:140.82.121.4" push origin main
}

echo ""
echo "==================================================================="
echo " [SUCCÈS] GitOps Write-Back terminé."
echo " ArgoCD synchronisera automatiquement ${TARGET_ENV} avec le tag ${BUILD_TAG}."
echo "==================================================================="
