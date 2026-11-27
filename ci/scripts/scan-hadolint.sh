#!/usr/bin/env bash
# ==============================================================================
# OmniPay Zero-Trust — Hadolint : Linting des Dockerfiles (Shift-Left)
# Rôle P1 : Chef Technique & Pipeline CI/CD
# Semaine 2
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${SCRIPT_DIR}/../.."

DOCKERFILES=(
    "services/auth/Dockerfile"
    "services/transaction/Dockerfile"
    "services/notification/Dockerfile"
)

HADOLINT_IMAGE="hadolint/hadolint:latest"
EXIT_CODE=0

echo "==================================================================="
echo " [P1] Hadolint — Analyse qualité des Dockerfiles (Shift-Left)      "
echo "==================================================================="

for df in "${DOCKERFILES[@]}"; do
    FULL_PATH="${PROJECT_ROOT}/${df}"
    if [ ! -f "${FULL_PATH}" ]; then
        echo "[WARN] Dockerfile introuvable : ${df} — ignoré."
        continue
    fi

    echo ""
    echo "---> Analyse de ${df}..."

    if command -v docker >/dev/null 2>&1; then
        # Mode Docker (CI Jenkins / environnement conteneurisé)
        RESULT=$(docker run --rm -i "${HADOLINT_IMAGE}" /bin/hadolint --failure-threshold error - < "${FULL_PATH}" 2>&1) || {
            echo "[ÉCHEC] Hadolint a détecté des violations dans ${df} :"
            echo "${RESULT}"
            EXIT_CODE=1
            continue
        }
        if [ -n "${RESULT}" ]; then
            echo "[AVERTISSEMENT] Hadolint signale des recommandations :"
            echo "${RESULT}"
        else
            echo "[OK] ${df} — Aucune violation détectée."
        fi
    elif command -v hadolint >/dev/null 2>&1; then
        # Mode binaire local
        hadolint "${FULL_PATH}" || {
            echo "[ÉCHEC] Hadolint a détecté des violations dans ${df}."
            EXIT_CODE=1
            continue
        }
        echo "[OK] ${df} — Aucune violation détectée."
    else
        echo "[WARN] Ni Docker ni Hadolint ne sont disponibles."
        echo "       Vérification manuelle de base (recherche de USER root)..."
        if grep -qE "^USER\s+root" "${FULL_PATH}"; then
            echo "[ÉCHEC] ${df} utilise USER root — interdit en Zero-Trust."
            EXIT_CODE=1
        elif ! grep -qE "^USER\s+" "${FULL_PATH}"; then
            echo "[AVERTISSEMENT] ${df} ne définit pas de USER non-root."
        else
            echo "[OK] ${df} — Vérification basique réussie."
        fi
    fi
done

echo ""
echo "==================================================================="
if [ ${EXIT_CODE} -eq 0 ]; then
    echo " [SUCCÈS] Tous les Dockerfiles sont conformes aux standards."
else
    echo " [ÉCHEC] Des violations Hadolint ont été détectées. Corrigez-les."
fi
echo "==================================================================="

exit ${EXIT_CODE}
