#!/usr/bin/env bash
# ==============================================================================
# OmniPay Zero-Trust — Trivy : Scan de vulnérabilités des images conteneurs
# Rôle P1 : Chef Technique & Pipeline CI/CD — Semaine 2
# ==============================================================================
set -euo pipefail

IMAGE_REF="${1:?Usage: $0 <image:tag>}"
SEVERITY_THRESHOLD="${2:-CRITICAL,HIGH}"
TRIVY_IMAGE="aquasec/trivy:latest"
EXIT_CODE=0

echo "==================================================================="
echo " [P1] Trivy — Scan de vulnérabilités conteneur                     "
echo " Image : ${IMAGE_REF}"
echo " Seuil : ${SEVERITY_THRESHOLD}"
echo "==================================================================="

if command -v docker >/dev/null 2>&1; then
    echo "---> [1/2] Lancement du scan Trivy via Docker..."

    docker run --rm \
        -v /var/run/docker.sock:/var/run/docker.sock \
        "${TRIVY_IMAGE}" image \
        --severity "${SEVERITY_THRESHOLD}" \
        --exit-code 1 \
        --no-progress \
        --format table \
        "${IMAGE_REF}" || {
            EXIT_CODE=$?
            echo ""
            echo "[ÉCHEC] Trivy a détecté des vulnérabilités ${SEVERITY_THRESHOLD} dans ${IMAGE_REF}."
        }

elif command -v trivy >/dev/null 2>&1; then
    echo "---> [1/2] Lancement du scan Trivy (binaire local)..."

    trivy image \
        --severity "${SEVERITY_THRESHOLD}" \
        --exit-code 1 \
        --no-progress \
        --format table \
        "${IMAGE_REF}" || {
            EXIT_CODE=$?
            echo ""
            echo "[ÉCHEC] Trivy a détecté des vulnérabilités ${SEVERITY_THRESHOLD} dans ${IMAGE_REF}."
        }

else
    echo "[WARN] Ni Docker ni Trivy ne sont disponibles."
    echo "       Le scan de vulnérabilités est sauté (non-bloquant en développement local)."
fi

echo ""
echo "==================================================================="
if [ ${EXIT_CODE} -eq 0 ]; then
    echo " [SUCCÈS] Aucune vulnérabilité ${SEVERITY_THRESHOLD} dans ${IMAGE_REF}."
else
    echo " [ÉCHEC] Vulnérabilités critiques détectées. Build bloqué."
fi
echo "==================================================================="

exit ${EXIT_CODE}
