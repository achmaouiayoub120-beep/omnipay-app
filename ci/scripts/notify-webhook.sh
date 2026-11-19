#!/usr/bin/env bash
# ==============================================================================
# OmniPay Zero-Trust — Notification Webhook (Discord / Slack / Telegram)
# Rôle P1 : Chef Technique & Pipeline CI/CD — Semaine 2
# ==============================================================================
set -euo pipefail

# ----- Configuration -----
WEBHOOK_URL="${WEBHOOK_URL:-}"
BUILD_STATUS="${1:-UNKNOWN}"   # SUCCESS | FAILURE | UNSTABLE | ABORTED
BUILD_NUMBER="${BUILD_NUMBER:-N/A}"
BUILD_URL="${BUILD_URL:-N/A}"
GIT_BRANCH="${GIT_BRANCH:-N/A}"
GIT_COMMIT="${GIT_COMMIT:-N/A}"
GIT_AUTHOR="${GIT_AUTHOR_NAME:-N/A}"
BUILD_DURATION="${BUILD_DURATION:-N/A}"
SONAR_URL="${SONAR_URL:-}"
JOB_NAME="${JOB_NAME:-omnipay-pipeline}"

echo "==================================================================="
echo " [P1] Notification Webhook — Envoi du rapport de build             "
echo " Statut  : ${BUILD_STATUS}"
echo " Build   : #${BUILD_NUMBER}"
echo "==================================================================="

if [ -z "${WEBHOOK_URL}" ]; then
    echo "[WARN] WEBHOOK_URL non défini. Notification ignorée."
    echo "       Définissez la variable d'environnement WEBHOOK_URL pour activer les alertes."
    exit 0
fi

# ----- Construction du payload -----
case "${BUILD_STATUS}" in
    SUCCESS)
        COLOR=3066993       # Vert
        EMOJI="✅"
        TITLE="Pipeline OmniPay RÉUSSI"
        ;;
    FAILURE)
        COLOR=15158332      # Rouge
        EMOJI="❌"
        TITLE="Pipeline OmniPay EN ÉCHEC"
        ;;
    UNSTABLE)
        COLOR=16776960      # Jaune
        EMOJI="⚠️"
        TITLE="Pipeline OmniPay INSTABLE"
        ;;
    *)
        COLOR=10197915      # Gris
        EMOJI="🔵"
        TITLE="Pipeline OmniPay — ${BUILD_STATUS}"
        ;;
esac

# Format Discord / Slack compatible
PAYLOAD=$(cat <<EOF
{
  "embeds": [{
    "title": "${EMOJI} ${TITLE}",
    "color": ${COLOR},
    "fields": [
      {"name": "🔢 Build",    "value": "#${BUILD_NUMBER}", "inline": true},
      {"name": "🌿 Branche",  "value": "${GIT_BRANCH}",    "inline": true},
      {"name": "👤 Auteur",   "value": "${GIT_AUTHOR}",    "inline": true},
      {"name": "📝 Commit",   "value": "\`${GIT_COMMIT:0:7}\`", "inline": true},
      {"name": "⏱️ Durée",    "value": "${BUILD_DURATION}", "inline": true},
      {"name": "🔗 Console",  "value": "[Voir le build](${BUILD_URL})", "inline": true}
    ],
    "footer": {"text": "OmniPay Zero-Trust CI/CD • Jenkins DevSecOps Pipeline"},
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  }]
}
EOF
)

# ----- Envoi -----
echo "---> Envoi de la notification..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Content-Type: application/json" \
    -d "${PAYLOAD}" \
    "${WEBHOOK_URL}")

if [ "${HTTP_CODE}" -ge 200 ] && [ "${HTTP_CODE}" -lt 300 ]; then
    echo "[SUCCÈS] Notification envoyée (HTTP ${HTTP_CODE})."
else
    echo "[WARN] Échec de l'envoi de la notification (HTTP ${HTTP_CODE})."
fi

echo "==================================================================="
