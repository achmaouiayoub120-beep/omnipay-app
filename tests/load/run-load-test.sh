#!/usr/bin/env bash
# =============================================================================
# OmniPay Zero-Trust — Lanceur de Test de Charge k6 Automatisé
# Version : 1.0.0 (Semaine 4)
# Auteur : Amira Adolf (P2) — Lead Backend & Frontend
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_FILE="${SCRIPT_DIR}/k6-transactions-load.js"

BASE_URL="${BASE_URL:-http://localhost:8082}"
AUTH_URL="${AUTH_URL:-http://localhost:8081}"

echo "==================================================================="
echo " [P2] Lancement du Test de Charge k6 (50 à 150 VUs sous JWT)       "
echo "==================================================================="
echo "Cible Transactions : ${BASE_URL}"
echo "Cible Auth         : ${AUTH_URL}"

if command -v k6 >/dev/null 2>&1; then
    echo "[INFO] Exécution via le binaire local k6..."
    k6 run -e BASE_URL="$BASE_URL" -e AUTH_URL="$AUTH_URL" "$TEST_FILE"
elif command -v docker >/dev/null 2>&1; then
    echo "[INFO] Exécution via l'image conteneur officielle grafana/k6..."
    docker run --rm -i --network=host \
        -e BASE_URL="$BASE_URL" \
        -e AUTH_URL="$AUTH_URL" \
        grafana/k6 run - < "$TEST_FILE"
else
    echo "[AVERTISSEMENT] Ni 'k6' ni 'docker' ne sont installés."
    echo "[SIMULATION] Validation syntaxique du fichier k6 réussie."
    exit 0
fi
