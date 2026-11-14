#!/usr/bin/env bash
# ==============================================================================
# Script d'audit de détection de secrets (Bash / Jenkins agent) — OmniPay Zero-Trust
# ==============================================================================
set -euo pipefail

TARGET_DIR="${1:-.}"
echo "=== AUDIT DE SECRETS OMNIPAY ZERO-TRUST ==="
echo "Cible : ${TARGET_DIR}"

if command -v gitleaks &> /dev/null; then
    echo "[INFO] Gitleaks détecté. Exécution de l'audit..."
    gitleaks dir "${TARGET_DIR}" --config "${TARGET_DIR}/.gitleaks.toml" -v
    echo "[SUCCÈS] Aucun secret détecté par Gitleaks."
    exit 0
fi

if command -v docker &> /dev/null && docker info &> /dev/null; then
    echo "[INFO] Exécution via Docker zricethezav/gitleaks:latest..."
    docker run --rm -v "$(pwd):/path" zricethezav/gitleaks:latest dir /path --config /path/.gitleaks.toml -v
    echo "[SUCCÈS] Aucun secret détecté via conteneur Gitleaks."
    exit 0
fi

echo "[ATTENTION] Gitleaks et Docker ne sont pas disponibles sur cet agent."
echo "[INFO] Exécution d'un scan grep de secours..."

PATTERNS="(ghp_[A-Za-z0-9]{36}|AIza[0-9A-Za-z_-]{35}|-----BEGIN [A-Z]+ PRIVATE KEY-----)"
if grep -rE --exclude-dir={.git,target,node_modules} --exclude={*.md,.gitleaks.toml,audit-secrets.*} "${PATTERNS}" "${TARGET_DIR}"; then
    echo "[ÉCHEC] Potentiels secrets détectés !"
    exit 1
else
    echo "[SUCCÈS] Aucun motif de secret standard trouvé par le scan de secours."
    exit 0
fi
