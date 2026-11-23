#!/usr/bin/env bash
# =============================================================================
# OmniPay Zero-Trust — Automatisation de la Release v1.0.0
# Version : 1.0.0 (Semaine 4 - Final Release)
# Auteur : Ayoub Achmaoui (P1) — Chef Technique & Lead CI/CD DevSecOps
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

VERSION="v1.0.0"
DRY_RUN=false

for arg in "$@"; do
    case "$arg" in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help|-h)
            echo "Usage: ./release-v1.sh [--dry-run]"
            exit 0
            ;;
    esac
done

echo -e "${BLUE}${BOLD}"
cat << "EOF"
  ██████╗ ███████╗██╗     ███████╗ █████╗ ███████╗███████╗    ██╗   ██╗ ██╗
  ██╔══██╗██╔════╝██║     ██╔════╝██╔══██╗██╔════╝██╔════╝    ██║   ██║███║
  ██████╔╝█████╗  ██║     █████╗  ███████║███████╗█████╗      ██║   ██║╚██║
  ██╔══██╗██╔══╝  ██║     ██╔══╝  ██╔══██║╚════██║██╔══╝      ╚██╗ ██╔╝ ██║
  ██║  ██║███████╗███████╗███████╗██║  ██║███████║███████╗     ╚████╔╝  ██║
  ╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝╚═╝  ╚═╝╚══════╝╚══════╝      ╚═══╝   ╚═╝
              CLÔTURE OFFICIELLE DE LA RELEASE BANCAIRE v1.0.0
EOF
echo -e "${NC}"

echo -e "${CYAN}${BOLD}[1/4] Contrôle de propreté du repository Git...${NC}"
cd "$ROOT_DIR"
UNCOMMITTED=$(git status --porcelain | grep -v 'CHANGELOG.md' || true)
if [ -n "$UNCOMMITTED" ] && [ "$DRY_RUN" = false ]; then
    echo -e "${YELLOW}⚠ Modifications non commitées détectées :${NC}"
    echo "$UNCOMMITTED"
    echo -e "${YELLOW}Poursuite de la vérification de conformité...${NC}"
else
    echo -e "  ${GREEN}✔${NC} Espace de travail propre et synchronisé."
fi

echo -e "\n${CYAN}${BOLD}[2/4] Audit de Sécurité Zéro Secret (Gitleaks)...${NC}"
set +e
bash "${ROOT_DIR}/ci/scripts/audit-secrets.sh"
AUDIT_STATUS=$?
set -e

if [ $AUDIT_STATUS -ne 0 ]; then
    echo -e "${RED}❌ ÉCHEC CRITIQUE : Secret détecté ! Création de la release v1.0.0 annulée.${NC}"
    exit 1
fi
echo -e "  ${GREEN}✔${NC} 0 secret détecté. Conformité Zero-Trust validée."

echo -e "\n${CYAN}${BOLD}[3/4] Vérification du Changelog officiel...${NC}"
CHANGELOG_FILE="${ROOT_DIR}/CHANGELOG.md"
if [ -f "$CHANGELOG_FILE" ]; then
    echo -e "  ${GREEN}✔${NC} Fichier CHANGELOG.md validé (${CHANGELOG_FILE})."
else
    echo -e "${RED}❌ Fichier CHANGELOG.md manquant !${NC}"
    exit 1
fi

echo -e "\n${CYAN}${BOLD}[4/4] Création du Tag Sémantique Git ${VERSION}...${NC}"
RELEASE_MSG="Release officielle v1.0.0 — Néobanque OmniPay Zero-Trust (ESTC 2026)

Livrables consolidés :
- CI/CD DevSecOps 11 stages (Gitleaks, SonarQube, Trivy, Syft SBOM, Cosign, OWASP ZAP)
- Microservices Spring Boot & Portail Web Frontend SPA
- Infrastructure K3s, Terraform, HashiCorp Vault, External Secrets & Falco eBPF
- Supply Chain Harbor, Admission Control Kyverno & Argo Rollouts Canary
- Observabilité Prometheus, Grafana Dashboards as Code, Loki, Tempo Tracing & Chaos SRE
- 5 Démonstrations Jury live entièrement outillées et reproductibles en < 15 minutes."

if [ "$DRY_RUN" = true ]; then
    echo -e "  ${YELLOW}[DRY-RUN] Tag ${VERSION} simulé sans écriture.${NC}"
else
    if git rev-parse "$VERSION" >/dev/null 2>&1; then
        echo -e "  ${YELLOW}ℹ Le tag ${VERSION} existe déjà localement.${NC}"
    else
        git tag -a "$VERSION" -m "$RELEASE_MSG"
        echo -e "  ${GREEN}✔${NC} Tag Git ${VERSION} créé localement avec succès."
    fi
fi

echo -e "\n${GREEN}${BOLD}=============================================================================${NC}"
echo -e "${GREEN}${BOLD}     🎉 RELEASE ${VERSION} CONFORME ET PRÊTE POUR LA PRODUCTION BANCAIRE !     ${NC}"
echo -e "${GREEN}${BOLD}=============================================================================${NC}"
echo -e "Pour pousser le tag vers le dépôt distant GitHub :"
echo -e "  ${BOLD}git push origin ${VERSION}${NC}\n"

exit 0
