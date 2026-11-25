#!/usr/bin/env bash
# ==============================================================================
# OmniPay Zero-Trust — Script Tout-en-Un d'Installation & Lancement Soutenance
# Compatibilité : Linux / macOS / Git Bash / WSL
# ==============================================================================
# Exemples d'utilisation :
#   ./scripts/soutenance.sh                       # Démarre toute la stack (auto-init .env + build + healthcheck)
#   ./scripts/soutenance.sh install               # Prépare .env, installe frontend npm et build les images Docker
#   ./scripts/soutenance.sh start --with-jenkins --open
#   ./scripts/soutenance.sh start --no-build
#   ./scripts/soutenance.sh frontend              # Lance uniquement le frontend Vite (Mode Démo) sur :3000
#   ./scripts/soutenance.sh status                # Vérifie l'état des conteneurs et sondes HTTP
#   ./scripts/soutenance.sh test                  # Exécute les tests frontend (Vitest) et smoke-tests backend
#   ./scripts/soutenance.sh logs                  # Affiche les journaux temps réel Docker Compose
#   ./scripts/soutenance.sh stop                  # Arrête proprement tous les serveurs
# ==============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
FRONTEND_DIR="${ROOT_DIR}/services/frontend"
ENV_EXAMPLE="${ROOT_DIR}/.env.example"
ENV_FILE="${ROOT_DIR}/.env"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.yml"
JENKINS_COMPOSE_FILE="${ROOT_DIR}/ci/docker-compose-jenkins.yml"

ACTION="start"
WITH_JENKINS=false
NO_BUILD=false
OPEN_BROWSER=false
CLEAN=false
HEALTH_TIMEOUT=180

for arg in "$@"; do
  case "$arg" in
    install|start|stop|restart|status|logs|test|frontend|help)
      ACTION="$arg"
      ;;
    --with-jenkins)
      WITH_JENKINS=true
      ;;
    --no-build)
      NO_BUILD=true
      ;;
    --open)
      OPEN_BROWSER=true
      ;;
    --clean)
      CLEAN=true
      ;;
    --help|-h)
      ACTION="help"
      ;;
    *)
      echo -e "${RED}Option inconnue : $arg${NC}"
      exit 1
      ;;
  esac
done

show_banner() {
  echo -e "${CYAN}${BOLD}"
  cat << "EOF"
  ██████╗ ███╗   ███╗███╗   ██╗██╗██████╗  █████╗ ██╗   ██╗
 ██╔═══██╗████╗ ████║████╗  ██║██║██╔══██╗██╔══██╗╚██╗ ██╔╝
 ██║   ██║██╔████╔██║██╔██╗ ██║██║██████╔╝███████║ ╚████╔╝ 
 ██║   ██║██║╚██╔╝██║██║╚██╗██║██║██╔═══╝ ██╔══██║  ╚██╔╝  
 ╚██████╔╝██║ ╚═╝ ██║██║ ╚████║██║██║     ██║  ██║   ██║   
  ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═══╝╚═╝╚═╝     ╚═╝  ╚═╝   ╚═╝   
        ORCHESTRATEUR DE SOUTENANCE — OMNIPAY ZERO-TRUST
EOF
  echo -e "${NC}"
}

show_usage() {
  show_banner
  cat << "EOF"
Usage : ./scripts/soutenance.sh [action] [options]

Actions disponibles :
  install    Vérifie les prérequis, initialise .env, installe le frontend (npm) et build les images Docker
  start      Prépare .env (si absent), démarre PostgreSQL + 3 microservices + Frontend Nginx (défaut)
  stop       Arrête les conteneurs Docker Compose (--clean supprime aussi les volumes)
  restart    Redémarre toute la stack soutenance
  status     Affiche l'état des conteneurs et teste les sondes de santé HTTP
  logs       Suit les logs en direct de Docker Compose
  test       Exécute le build + tests Vitest du frontend et les smoke-tests API
  frontend   Lance uniquement le frontend Vite (Mode Démo résilient) sur http://localhost:3000
  help       Affiche cette aide

Options :
  --with-jenkins   Inclut le serveur CI Jenkins (http://localhost:8088)
  --no-build       Démarre les conteneurs existants sans reconstruire les images
  --open           Ouvre automatiquement l'application dans le navigateur une fois prête
  --clean          Avec stop : supprime également les volumes Docker (données PostgreSQL)
EOF
}

resolve_compose() {
  if ! command -v docker >/dev/null 2>&1; then
    echo -e "${RED}Docker est introuvable dans le PATH.${NC}" >&2
    exit 1
  fi
  if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}Le daemon Docker ne répond pas. Démarrez Docker ou lancez './scripts/soutenance.sh frontend'.${NC}" >&2
    exit 1
  fi
  if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD=(docker compose)
  elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD=(docker-compose)
  else
    echo -e "${RED}Docker Compose introuvable.${NC}" >&2
    exit 1
  fi
}

generate_jwt_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 48 | tr -d '\n'
  elif command -v python3 >/dev/null 2>&1; then
    python3 -c 'import os,base64; print(base64.b64encode(os.urandom(48)).decode(), end="")'
  else
    head -c 48 /dev/urandom | base64 | tr -d '\n'
  fi
}

ensure_env() {
  echo -e "\n${YELLOW}[ENV] Vérification de la configuration locale (.env)...${NC}"
  if [ ! -f "$ENV_FILE" ]; then
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    echo -e "  ${GREEN}✔${NC} Fichier .env créé depuis .env.example."
  else
    echo -e "  ${GREEN}✔${NC} Fichier .env existant détecté."
  fi

  local current_jwt
  current_jwt="$(grep -E '^OMNIPAY_JWT_SECRET=' "$ENV_FILE" | head -n 1 | cut -d '=' -f2- || true)"
  if [ -z "${current_jwt// }" ]; then
    local secret
    secret="$(generate_jwt_secret)"
    if grep -qE '^OMNIPAY_JWT_SECRET=' "$ENV_FILE"; then
      sed "s|^OMNIPAY_JWT_SECRET=.*|OMNIPAY_JWT_SECRET=${secret}|" "$ENV_FILE" > "${ENV_FILE}.tmp" && mv "${ENV_FILE}.tmp" "$ENV_FILE"
    else
      echo "OMNIPAY_JWT_SECRET=${secret}" >> "$ENV_FILE"
    fi
    echo -e "  ${GREEN}✔${NC} OMNIPAY_JWT_SECRET généré localement (48 octets aléatoires)."
  fi
}

install_frontend() {
  echo -e "\n${YELLOW}[FRONTEND] Installation des dépendances et build de vérification...${NC}"
  if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
    echo -e "  ${YELLOW}⚠${NC} Node.js / npm absent localement : build frontend effectué via Docker uniquement."
    return
  fi
  (
    cd "$FRONTEND_DIR"
    if [ ! -d "node_modules" ]; then
      npm ci --legacy-peer-deps
    fi
    npm run build
  )
  echo -e "  ${GREEN}✔${NC} Frontend compilé avec succès."
}

http_ok() {
  curl -fsS --max-time 2 "$1" >/dev/null 2>&1
}

wait_for_health() {
  echo -e "\n${YELLOW}[HEALTHCHECK] Attente du démarrage des serveurs (timeout ${HEALTH_TIMEOUT}s)...${NC}"
  local elapsed=0
  local targets=(
    "Auth Service (:8081)|http://localhost:8081/api/auth/health"
    "Transaction Service (:8082)|http://localhost:8082/api/transactions/health"
    "Notification Service (:8083)|http://localhost:8083/api/notifications/health"
    "Portail Web Frontend (:8080)|http://localhost:8080/health"
  )
  if [ "$WITH_JENKINS" = true ]; then
    targets+=("Jenkins CI (:8088)|http://localhost:8088/login")
  fi

  local ready=()
  for _ in "${targets[@]}"; do ready+=(0); done

  while [ "$elapsed" -lt "$HEALTH_TIMEOUT" ]; do
    local all_ready=true
    for i in "${!targets[@]}"; do
      if [ "${ready[$i]}" -eq 0 ]; then
        local name="${targets[$i]%%|*}"
        local url="${targets[$i]#*|}"
        if http_ok "$url"; then
          ready[$i]=1
          echo -e "  ${GREEN}✔${NC} ${name} est prêt (${url})"
        else
          all_ready=false
        fi
      fi
    done
    if [ "$all_ready" = true ]; then
      return 0
    fi
    sleep 3
    elapsed=$((elapsed + 3))
  done

  for i in "${!targets[@]}"; do
    if [ "${ready[$i]}" -eq 0 ]; then
      local name="${targets[$i]%%|*}"
      local url="${targets[$i]#*|}"
      echo -e "  ${YELLOW}⚠${NC} ${name} n'a pas encore répondu (${url})."
    fi
  done
}

open_url() {
  local url="$1"
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" >/dev/null 2>&1 || true
  elif command -v open >/dev/null 2>&1; then
    open "$url" >/dev/null 2>&1 || true
  fi
}

print_summary() {
  echo -e "${CYAN}"
  cat << "EOF"
=============================================================================
        OMNIPAY ZERO-TRUST — ENVIRONNEMENT DE SOUTENANCE PRÊT
=============================================================================
  • Portail Web Bancaire (UI) : http://localhost:8080  (/health)
  • Auth Microservice (JWT)   : http://localhost:8081  (/api/auth/health)
  • Transaction Microservice  : http://localhost:8082  (/api/transactions/health)
  • Notification Microservice : http://localhost:8083  (/api/notifications/health)
  • Base PostgreSQL 16        : localhost:5432         (omnipay_db)
EOF
  if [ "$WITH_JENKINS" = true ]; then
    echo "  • Jenkins CI/CD (JCasC)     : http://localhost:8088  (admin / AdminSecureOmniPay2026!)"
  fi
  cat << "EOF"

Comptes de démonstration soutenance (mot de passe universel : password) :
  alice (ROLE_USER) | bob (ROLE_USER) | admin (ROLE_ADMIN) | auditor (ROLE_AUDITOR)
Raccourcis UI : Ctrl+K (Recherche) | Ctrl+Shift+J (Mode Jury) | Bouton Œil (PAN/CVV)
=============================================================================
EOF
  echo -e "${NC}"
}

if [ "$ACTION" = "help" ]; then
  show_usage
  exit 0
fi

show_banner

case "$ACTION" in
  install)
    ensure_env
    install_frontend
    resolve_compose
    (cd "$ROOT_DIR" && "${COMPOSE_CMD[@]}" -f "$COMPOSE_FILE" build)
    if [ "$WITH_JENKINS" = true ] && [ -f "$JENKINS_COMPOSE_FILE" ]; then
      (cd "$ROOT_DIR" && "${COMPOSE_CMD[@]}" -f "$JENKINS_COMPOSE_FILE" build)
    fi
    echo -e "\n${GREEN}✔ Installation terminée. Lancez la soutenance avec : ./scripts/soutenance.sh${NC}"
    ;;

  start)
    ensure_env
    resolve_compose
    up_args=(-d)
    if [ "$NO_BUILD" = false ]; then
      up_args+=(--build)
    fi
    (cd "$ROOT_DIR" && "${COMPOSE_CMD[@]}" -f "$COMPOSE_FILE" up "${up_args[@]}")
    if [ "$WITH_JENKINS" = true ] && [ -f "$JENKINS_COMPOSE_FILE" ]; then
      (cd "$ROOT_DIR" && "${COMPOSE_CMD[@]}" -f "$JENKINS_COMPOSE_FILE" up "${up_args[@]}")
    fi
    wait_for_health
    print_summary
    if [ "$OPEN_BROWSER" = true ]; then
      open_url "http://localhost:8080"
    fi
    ;;

  restart)
    restart_stop_args=(stop)
    restart_start_args=(start)
    if [ "$WITH_JENKINS" = true ]; then
      restart_stop_args+=(--with-jenkins)
      restart_start_args+=(--with-jenkins)
    fi
    if [ "$NO_BUILD" = true ]; then
      restart_start_args+=(--no-build)
    fi
    if [ "$OPEN_BROWSER" = true ]; then
      restart_start_args+=(--open)
    fi
    "$0" "${restart_stop_args[@]}"
    "$0" "${restart_start_args[@]}"
    ;;

  stop)
    resolve_compose
    down_args=(down)
    if [ "$CLEAN" = true ]; then
      down_args+=(-v)
    fi
    (cd "$ROOT_DIR" && "${COMPOSE_CMD[@]}" -f "$COMPOSE_FILE" "${down_args[@]}")
    if [ "$WITH_JENKINS" = true ] && [ -f "$JENKINS_COMPOSE_FILE" ]; then
      (cd "$ROOT_DIR" && "${COMPOSE_CMD[@]}" -f "$JENKINS_COMPOSE_FILE" down)
    fi
    echo -e "${GREEN}✔ Tous les serveurs ont été arrêtés proprement.${NC}"
    ;;

  status)
    resolve_compose
    (cd "$ROOT_DIR" && "${COMPOSE_CMD[@]}" -f "$COMPOSE_FILE" ps)
    echo ""
    for item in \
      "Frontend Nginx (:8080)|http://localhost:8080/health" \
      "Auth (:8081)|http://localhost:8081/api/auth/health" \
      "Transaction (:8082)|http://localhost:8082/api/transactions/health" \
      "Notification (:8083)|http://localhost:8083/api/notifications/health" \
      "Jenkins CI (:8088)|http://localhost:8088/login" \
      "Frontend Vite (:3000)|http://localhost:3000/"
    do
      name="${item%%|*}"
      url="${item#*|}"
      if http_ok "$url"; then
        echo -e "  ${GREEN}✔${NC} ${name} -> EN LIGNE"
      else
        echo -e "  • ${name} -> HORS LIGNE"
      fi
    done
    ;;

  logs)
    resolve_compose
    (cd "$ROOT_DIR" && "${COMPOSE_CMD[@]}" -f "$COMPOSE_FILE" logs -f --tail=100)
    ;;

  test)
    if command -v npm >/dev/null 2>&1; then
      (cd "$FRONTEND_DIR" && npm run build && npx vitest run)
    fi
    if [ -f "${ROOT_DIR}/ci/scripts/smoke-tests.sh" ]; then
      bash "${ROOT_DIR}/ci/scripts/smoke-tests.sh" "http://localhost" "local"
    fi
    ;;

  frontend)
    (
      cd "$FRONTEND_DIR"
      if [ ! -d "node_modules" ]; then
        npm ci --legacy-peer-deps
      fi
      [ "$OPEN_BROWSER" = true ] && open_url "http://localhost:3000"
      npm run dev -- --port 3000
    )
    ;;
esac
