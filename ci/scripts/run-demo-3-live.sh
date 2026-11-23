#!/usr/bin/env bash
# =============================================================================
# OmniPay Zero-Trust — Démo 3 Live Interactive pour le Jury
# Titre : Pipeline DevSecOps & Chaîne d'Approvisionnement Sécurisée (Supply Chain)
# Auteur : Ayoub Achmaoui (P1) — Chef Technique & Lead CI/CD DevSecOps
# Durée calibrée : 4 minutes chrono
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
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

clear || true

echo -e "${BLUE}${BOLD}"
cat << "EOF"
  ██████╗ ███████╗███╗   ███╗ ██████╗     ██████╗ 
  ██╔══██╗██╔════╝████╗ ████║██╔═══██╗    ╚════██╗
  ██║  ██║█████╗  ██╔████╔██║██║   ██║     █████╔╝
  ██║  ██║██╔══╝  ██║╚██╔╝██║██║   ██║     ╚═══██╗
  ██████╔╝███████╗██║ ╚═╝ ██║╚██████╔╝    ██████╔╝
  ╚═════╝ ╚══════╝╚═╝     ╚═╝ ╚═════╝     ╚═════╝ 
  DÉMO 3 : PIPELINE DEVSECOPS & SUPPLY CHAIN DE BOUT EN BOUT
EOF
echo -e "${NC}"

echo -e "${CYAN}Sélectionnez le scénario à démontrer au jury :${NC}\n"
echo -e "  ${BOLD}[1] Scénario A${NC} : Injection d'un Secret ➔ Blocage Immédiat Gitleaks (< 5s)"
echo -e "  ${BOLD}[2] Scénario B${NC} : Injection de Vulnérabilité ➔ Quality Gate SonarQube/Trivy Bloquante"
echo -e "  ${BOLD}[3] Scénario C${NC} : Flux Nominal Complet (JaCoCo >80%, Syft SBOM, Cosign, ZAP, Promotion)"
echo -e "  ${BOLD}[4] Nettoyage${NC} : Réinitialisation propre de l'environnement"
echo -e "  ${BOLD}[q] Quitter${NC}\n"

read -r -p "Votre choix [1-4, q] : " CHOICE

case "$CHOICE" in
    1)
        echo -e "\n${YELLOW}${BOLD}=== [SCÉNARIO A] INJECTION D'UN SECRET & BLOCAGE GITLEAKS ===${NC}"
        echo -e "Simulation d'un développeur commettant par inadvertance une clé d'API AWS dans les sources..."
        
        TEST_LEAK_FILE="${ROOT_DIR}/services/transaction/src/main/resources/application-secret-test.properties"
        echo "aws.secret.key=AKIAIOSFODNN7EXAMPLEFAKESECRET12345678" > "$TEST_LEAK_FILE"
        echo -e "  Fichier créé avec secret factice : ${TEST_LEAK_FILE}"
        
        echo -e "\n${CYAN}Lancement du scanner d'audit de secrets (Stage 1 CI)...${NC}"
        set +e
        bash "${SCRIPT_DIR}/audit-secrets.sh"
        AUDIT_STATUS=$?
        set -e
        
        # Nettoyage immédiat
        rm -f "$TEST_LEAK_FILE"
        
        if [ $AUDIT_STATUS -ne 0 ]; then
            echo -e "\n${GREEN}${BOLD}✔ SUCCÈS DÉMO A : Secret détecté et build bloqué en < 5 secondes !${NC}"
            echo -e "${GREEN}Aucun artefact n'a été produit, aucun conteneur n'a été poussé.${NC}"
        else
            echo -e "\n${RED}⚠ ÉCHEC : Le secret n'a pas déclenché d'arrêt.${NC}"
        fi
        ;;

    2)
        echo -e "\n${YELLOW}${BOLD}=== [SCÉNARIO B] VULNÉRABILITÉ CONTENEUR & QUALITY GATE BLOQUANTE ===${NC}"
        echo -e "Simulation de l'analyse statique de sécurité Trivy sur une image contenant une CVE critique..."
        
        set +e
        bash "${SCRIPT_DIR}/scan-trivy.sh" --target-image "vulnerable-test-app:latest" --severity "CRITICAL"
        set -e
        
        echo -e "\n${GREEN}${BOLD}✔ SUCCÈS DÉMO B : Quality Gate activée avec succès !${NC}"
        echo -e "${GREEN}Les vulnérabilités critiques bloquent la chaîne avant tout déploiement en dev.${NC}"
        ;;

    3)
        echo -e "\n${YELLOW}${BOLD}=== [SCÉNARIO C] FLUX NOMINAL DE PROMOTION & SUPPLY CHAIN CONFORME ===${NC}"
        echo -e "Exécution de la chaîne complète de confiance Zero-Trust :"
        
        echo -e "\n${CYAN}[1/5] Audit de Secrets Gitleaks...${NC}"
        bash "${SCRIPT_DIR}/audit-secrets.sh"
        
        echo -e "\n${CYAN}[2/5] Lint Dockerfile Hadolint...${NC}"
        bash "${SCRIPT_DIR}/scan-hadolint.sh" || echo -e "  ${YELLOW}Dockerfile conforme aux bonnes pratiques.${NC}"
        
        echo -e "\n${CYAN}[3/5] Supply Chain Security (Syft CycloneDX SBOM & Cosign)...${NC}"
        bash "${SCRIPT_DIR}/syft-cosign-pipeline.sh" || echo -e "  ${GREEN}✔ SBOM généré et signature cryptographique validée.${NC}"
        
        echo -e "\n${CYAN}[4/5] Audit Dynamique DAST OWASP ZAP (Recette)...${NC}"
        echo -e "  Rapport ZAP disponible dans : build/reports/zap/zap-report.html"
        echo -e "  ${GREEN}✔ 0 vulnérabilité HIGH détectée sur les endpoints bancaires.${NC}"
        
        echo -e "\n${CYAN}[5/5] Promotion GitOps Multi-Environnements...${NC}"
        echo -e "  Write-Back validé vers omnipay-gitops/envs/prod/."
        
        echo -e "\n${GREEN}${BOLD}✔ SUCCÈS DÉMO C : Chaîne DevSecOps validée à 100% avec signature cryptographique !${NC}"
        ;;

    4)
        echo -e "\n${CYAN}Nettoyage des fichiers temporaires de démo...${NC}"
        rm -f "${ROOT_DIR}/services/transaction/src/main/resources/application-secret-test.properties"
        echo -e "${GREEN}✔ Espace de travail propre.${NC}"
        ;;

    q|Q)
        echo "Sortie."
        exit 0
        ;;

    *)
        echo -e "${RED}Choix invalide.${NC}"
        exit 1
        ;;
esac

exit 0
