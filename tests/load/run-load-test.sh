#!/usr/bin/env bash
# =============================================================================
# OmniPay Zero-Trust — lanceur du test de charge k6 (Semaine 4, P2)
#
# Usage :
#   export K6_ALICE_PASSWORD=... K6_BOB_PASSWORD=...     # jamais écrits dans le dépôt
#   tests/load/run-load-test.sh [--smoke] [--check]
#   tests/load/run-load-test.sh &                         # arrière-plan pendant la soutenance
#
#   --smoke   profil court (1 VU, 10 s) pour vérifier le banc
#   --check   vérifie seulement les prérequis (variables, k6/docker, santé des services), sans test
#
# Variables : AUTH_URL (http://localhost:8081), TX_URL (http://localhost:8082),
#             K6_IMAGE (grafana/k6:0.54.0), K6_OUT / K6_PROMETHEUS_RW_SERVER_URL (export vers Prometheus/Grafana).
# Code de sortie : celui de k6 (99 = seuil franchi), 2 = configuration invalide.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_FILE="${SCRIPT_DIR}/k6-transactions-load.js"
AUTH_URL="${AUTH_URL:-http://localhost:8081}"
TX_URL="${TX_URL:-http://localhost:8082}"
K6_IMAGE="${K6_IMAGE:-grafana/k6:0.54.0}"
SMOKE=0
CHECK_ONLY=0

die() { echo "[ERREUR] $*" >&2; exit 2; }

for arg in "$@"; do
  case "$arg" in
    --smoke) SMOKE=1 ;;
    --check) CHECK_ONLY=1 ;;
    -h|--help) sed -n '2,16p' "$0"; exit 0 ;;
    *) die "option inconnue : $arg (voir --help)" ;;
  esac
done

[ -f "$TEST_FILE" ] || die "script k6 introuvable : $TEST_FILE"
[ -n "${K6_ALICE_PASSWORD:-}" ] || die "K6_ALICE_PASSWORD n'est pas défini (mot de passe de démo d'alice, à exporter)."
[ -n "${K6_BOB_PASSWORD:-}" ] || die "K6_BOB_PASSWORD n'est pas défini (mot de passe de démo de bob, à exporter)."

# Moteur d'exécution : binaire k6 local en priorité, sinon conteneur grafana/k6.
ENGINE=""
if command -v k6 >/dev/null 2>&1; then
  ENGINE="local"
elif command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  ENGINE="docker"
else
  die "ni 'k6' ni un démon Docker joignable : installez k6 (https://k6.io) ou démarrez Docker."
fi

# Dans un conteneur, 'localhost' désigne le conteneur : sous Docker Desktop (non-Linux) on vise l'hôte.
DOCKER_NET=(--network=host)
RUN_AUTH_URL="$AUTH_URL"
RUN_TX_URL="$TX_URL"
if [ "$ENGINE" = "docker" ] && [ "$(uname -s)" != "Linux" ]; then
  DOCKER_NET=(--add-host=host.docker.internal:host-gateway)
  RUN_AUTH_URL="${AUTH_URL//localhost/host.docker.internal}"
  RUN_AUTH_URL="${RUN_AUTH_URL//127.0.0.1/host.docker.internal}"
  RUN_TX_URL="${TX_URL//localhost/host.docker.internal}"
  RUN_TX_URL="${RUN_TX_URL//127.0.0.1/host.docker.internal}"
fi

echo "==> OmniPay k6 : moteur=${ENGINE} auth=${AUTH_URL} transactions=${TX_URL} profil=$([ "$SMOKE" = 1 ] && echo smoke || echo complet)"

if command -v curl >/dev/null 2>&1; then
  curl -fsS -m 5 "${AUTH_URL}/api/auth/health" >/dev/null || die "auth-service injoignable sur ${AUTH_URL}"
  curl -fsS -m 5 "${TX_URL}/api/transactions/health" >/dev/null || die "transaction-service injoignable sur ${TX_URL}"
  echo "==> services joignables"
fi

if [ "$CHECK_ONLY" = 1 ]; then
  echo "==> prérequis OK (aucun test lancé)"
  exit 0
fi

PROFILE="${K6_PROFILE:-}"
if [ "$SMOKE" = 1 ]; then PROFILE="smoke"; fi

if [ "$ENGINE" = "local" ]; then
  AUTH_URL="$AUTH_URL" TX_URL="$TX_URL" K6_PROFILE="$PROFILE" k6 run "$TEST_FILE"
else
  # Le script est transmis sur l'entrée standard (aucun montage de volume) ; les secrets passent par -e NOM sans valeur
  # sur la ligne de commande : Docker les lit dans l'environnement courant, ils n'apparaissent pas dans 'ps'.
  ENV_ARGS=(-e K6_ALICE_PASSWORD -e K6_BOB_PASSWORD -e "AUTH_URL=${RUN_AUTH_URL}" -e "TX_URL=${RUN_TX_URL}" -e "K6_PROFILE=${PROFILE}")
  for name in K6_ALICE_USER K6_BOB_USER K6_OUT K6_PROMETHEUS_RW_SERVER_URL; do
    if [ -n "${!name:-}" ]; then ENV_ARGS+=(-e "$name"); fi
  done
  docker run --rm -i "${DOCKER_NET[@]}" "${ENV_ARGS[@]}" "$K6_IMAGE" run - < "$TEST_FILE"
fi
