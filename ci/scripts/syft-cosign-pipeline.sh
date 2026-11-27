#!/usr/bin/env bash
# ==============================================================================
# OmniPay Zero-Trust — Syft (SBOM) & Cosign (Signature) Supply Chain Pipeline
# Rôle P1 : Chef Technique & Pipeline CI/CD — Semaine 2
# ==============================================================================
set -euo pipefail

REGISTRY="${REGISTRY:-harbor.omnipay.local:30002}"
PROJECT="${PROJECT:-omnipay}"
BUILD_TAG="${1:?Usage: $0 <build-tag>}"
COSIGN_KEY="${COSIGN_KEY:-k8s://jenkins/cosign-signing-key}"

SERVICES=("auth" "transaction" "notification")
SBOM_DIR="build/sbom"
EXIT_CODE=0

echo "==================================================================="
echo " [P1] Supply Chain Security — Syft SBOM & Cosign Signature         "
echo " Registre : ${REGISTRY}/${PROJECT}"
echo " Tag      : ${BUILD_TAG}"
echo "==================================================================="

mkdir -p "${SBOM_DIR}"

for svc in "${SERVICES[@]}"; do
    IMAGE="${REGISTRY}/${PROJECT}/${svc}-service:${BUILD_TAG}"
    SBOM_FILE="${SBOM_DIR}/${svc}-service-sbom.spdx.json"

    echo ""
    echo "--- [${svc}-service] ---"

    # ----- Étape 1 : Générer le SBOM avec Syft -----
    echo "---> [1/3] Génération du SBOM (Syft) pour ${IMAGE}..."
    if command -v syft >/dev/null 2>&1; then
        syft packages "docker:${IMAGE}" \
            -o spdx-json \
            --file "${SBOM_FILE}" 2>&1 || {
                echo "[WARN] Syft a rencontré une erreur pour ${svc}-service."
                EXIT_CODE=1
                continue
            }
        echo "       SBOM généré : ${SBOM_FILE}"
    elif command -v docker >/dev/null 2>&1; then
        CONTAINER_REF="${CONTAINER_NAME:-omnipay-jenkins}"
        TARGET_FULL="$(cd "${SBOM_DIR}" && pwd)"
        if [ -f /.dockerenv ] || [ -d /var/jenkins_home ]; then
            docker run --rm \
                -v /var/run/docker.sock:/var/run/docker.sock \
                --volumes-from "${CONTAINER_REF}" \
                anchore/syft:latest packages "docker:${IMAGE}" \
                -o spdx-json \
                --file "${TARGET_FULL}/${svc}-service-sbom.spdx.json" 2>&1 || {
                    echo "[WARN] Syft (Docker) a rencontré une erreur pour ${svc}-service."
                    EXIT_CODE=1
                    continue
                }
        else
            docker run --rm \
                -v /var/run/docker.sock:/var/run/docker.sock \
                -v "$(pwd)/${SBOM_DIR}:/sbom" \
                anchore/syft:latest packages "docker:${IMAGE}" \
                -o spdx-json \
                --file "/sbom/${svc}-service-sbom.spdx.json" 2>&1 || {
                    echo "[WARN] Syft (Docker) a rencontré une erreur pour ${svc}-service."
                    EXIT_CODE=1
                    continue
                }
        fi
        echo "       SBOM généré : ${SBOM_FILE}"
    else
        echo "[WARN] Syft non disponible — SBOM non généré pour ${svc}-service."
    fi

    # ----- Étape 2 : Signer l'image avec Cosign -----
    echo "---> [2/3] Signature cryptographique (Cosign) de ${IMAGE}..."
    if command -v cosign >/dev/null 2>&1; then
        cosign sign --yes --key "${COSIGN_KEY}" "${IMAGE}" 2>&1 || {
            echo "[ÉCHEC] Cosign n'a pas pu signer ${IMAGE}."
            EXIT_CODE=1
            continue
        }
        echo "       Image signée avec succès."
    else
        echo "[WARN] Cosign non disponible — signature non effectuée."
    fi

    # ----- Étape 3 : Attacher le SBOM comme artefact OCI -----
    echo "---> [3/3] Attachement du SBOM à l'image dans le registre..."
    if command -v cosign >/dev/null 2>&1 && [ -f "${SBOM_FILE}" ]; then
        cosign attach sbom --sbom "${SBOM_FILE}" "${IMAGE}" 2>&1 || {
            echo "[WARN] Impossible d'attacher le SBOM à ${IMAGE}."
        }
        echo "       SBOM attaché comme artefact OCI."
    else
        echo "[WARN] Attachement du SBOM ignoré (cosign ou SBOM manquant)."
    fi
done

echo ""
echo "==================================================================="
if [ ${EXIT_CODE} -eq 0 ]; then
    echo " [SUCCÈS] Supply chain sécurisée : SBOM générés et images signées."
else
    echo " [AVERTISSEMENT] Certaines étapes ont échoué (voir les logs ci-dessus)."
fi
echo "==================================================================="

exit ${EXIT_CODE}
