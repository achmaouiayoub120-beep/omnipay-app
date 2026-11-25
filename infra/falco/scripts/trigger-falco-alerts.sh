#!/usr/bin/env bash
# Declencheur d'alertes Falco eBPF pour la Demo 4 : 3 attaques simulees, alerte affichee en direct.
#
#   ./infra/falco/scripts/trigger-falco-alerts.sh --attack shell     terminal interactif dans un pod
#   ./infra/falco/scripts/trigger-falco-alerts.sh --attack file      lecture de /etc/shadow et /etc/sudoers
#   ./infra/falco/scripts/trigger-falco-alerts.sh --attack binary    ecriture sous /usr/bin
#   ./infra/falco/scripts/trigger-falco-alerts.sh --attack all       les trois (sans argument : menu)
#
# POURQUOI UN BAC A SABLE (namespace falco-demo) : les pods omnipay-* tournent en non-root, systeme de
# fichiers en lecture seule (PSS restricted). Dans un tel pod, lire /etc/shadow ou ecrire dans /usr/bin
# ECHOUE (permission refusee) : l'attaque est deja bloquee et Falco n'a rien a signaler, car il ne
# journalise que les ouvertures de fichier REUSSIES. Le bac a sable simule donc un conteneur mal
# configure (root, racine inscriptible) : le cas ou Falco devient la derniere ligne de defense.
# Le namespace est supprime a la fin du script (remise a l'etat nominal).
#
# Variables : NS (falco-demo), FALCO_NAMESPACE (falco), IMAGE (busybox:1.36, doit etre autorisee par Kyverno)
# Sortie : 0 = toutes les attaques lancees ont ete detectees, 1 = au moins une non detectee, 2 = prerequis.
set -euo pipefail

NS="${NS:-falco-demo}"
FALCO_NS="${FALCO_NAMESPACE:-falco}"
IMAGE="${IMAGE:-busybox:1.36}"
POD="attacker-demo"
ATTACK=""
CLEANUP=1
DETECTED=0
LAUNCHED=0

if [ -t 1 ]; then RED=$'\033[1;31m'; YEL=$'\033[1;33m'; GRN=$'\033[1;32m'; RST=$'\033[0m'; else RED=""; YEL=""; GRN=""; RST=""; fi

usage() { sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'; exit "${1:-0}"; }
while [ $# -gt 0 ]; do
  case "$1" in
    --attack) ATTACK="${2:-}"; shift 2 ;;
    --namespace) NS="${2:-}"; shift 2 ;;
    --no-cleanup) CLEANUP=0; shift ;;
    -h|--help) usage 0 ;;
    *) echo "Option inconnue : $1" >&2; usage 2 ;;
  esac
done

if [ -z "$ATTACK" ]; then
  echo "Quelle attaque simuler ?"
  echo "  1) shell   : terminal interactif dans un pod"
  echo "  2) file    : lecture de /etc/shadow et /etc/sudoers"
  echo "  3) binary  : ecriture dans /usr/bin"
  echo "  4) all     : les trois"
  read -rp "Choix [1-4] : " choice
  case "$choice" in 1) ATTACK=shell ;; 2) ATTACK=file ;; 3) ATTACK=binary ;; 4) ATTACK=all ;; *) echo "Choix invalide" >&2; exit 2 ;; esac
fi
case "$ATTACK" in shell|file|binary|all) ;; *) echo "--attack doit valoir shell, file, binary ou all" >&2; exit 2 ;; esac

command -v kubectl >/dev/null 2>&1 || { echo "kubectl introuvable" >&2; exit 2; }
kubectl get pods -n "$FALCO_NS" -l app.kubernetes.io/name=falco --no-headers 2>/dev/null | grep -q . \
  || { echo "Aucun pod Falco dans ${FALCO_NS} : lancer infra/falco/install-falco.sh" >&2; exit 2; }

cleanup() {
  if [ "$CLEANUP" -eq 1 ]; then
    echo "== Nettoyage : suppression du namespace ${NS} (pod, fichiers implantes)"
    kubectl delete namespace "$NS" --ignore-not-found --wait=false >/dev/null 2>&1 || true
  else
    echo "== --no-cleanup : namespace ${NS} conserve (kubectl delete ns ${NS} pour le retirer)"
  fi
}
trap cleanup EXIT

echo "== Bac a sable ${NS} (conteneur root, racine inscriptible : simule une mauvaise configuration)"
kubectl apply -f - >/dev/null <<EOF
apiVersion: v1
kind: Namespace
metadata:
  name: ${NS}
  labels:
    project: omnipay
    purpose: falco-demo
    pod-security.kubernetes.io/enforce: baseline
    pod-security.kubernetes.io/warn: baseline
    pod-security.kubernetes.io/audit: baseline
EOF
kubectl -n "$NS" run "$POD" --image="$IMAGE" --restart=Never --command -- sleep 3600 >/dev/null
kubectl -n "$NS" wait --for=condition=Ready "pod/${POD}" --timeout=90s >/dev/null \
  || { echo "Le pod ${POD} n'a pas demarre (image bloquee par Kyverno ? IMAGE=... pour en choisir une signee)" >&2; exit 2; }
# Preparation silencieuse : fichiers sensibles presents dans l'image minimale
kubectl -n "$NS" exec "$POD" -- sh -c '[ -f /etc/shadow ] || echo "demo:*:19000:0:99999:7:::" > /etc/shadow; [ -f /etc/sudoers ] || echo "demo ALL=(ALL) ALL" > /etc/sudoers' >/dev/null
sleep 2

# show_alerts <motif regex> <libelle>
show_alerts() {
  local pattern="$1" label="$2" lines="" msg i
  for i in $(seq 1 12); do
    lines="$(kubectl logs -n "$FALCO_NS" -l app.kubernetes.io/name=falco -c falco --since=60s --tail=500 2>/dev/null \
      | grep -iE "$pattern" | grep -F "$POD" | tail -2 || true)"
    [ -n "$lines" ] && break
    sleep 0.5
  done
  LAUNCHED=$((LAUNCHED + 1))
  if [ -n "$lines" ]; then
    DETECTED=$((DETECTED + 1))
    echo "${RED}>>> ALERTE FALCO : ${label}${RST}"
    while IFS= read -r l; do
      msg="$(printf '%s' "$l" | sed -nE 's/.*"output":"([^"]{0,300}).*/\1/p')"
      printf '    %s\n' "${msg:-$(printf '%s' "$l" | cut -c1-300)}"
    done <<<"$lines"
  else
    echo "${YEL}>>> aucune alerte '${label}' trouvee (regle desactivee ? Falco pas pret ?)${RST}"
  fi
  echo
}

attack_shell() {
  echo "${YEL}[ATTAQUE 1] Terminal interactif dans le pod : kubectl exec -it ${POD} -- /bin/sh${RST}"
  local flags="-i"
  if [ -t 0 ] && [ -t 1 ]; then flags="-it"; else echo "    (pas de terminal : TTY non alloue, la regle 'Terminal shell' exige un TTY)"; fi
  # shellcheck disable=SC2086
  kubectl exec $flags -n "$NS" "$POD" -- /bin/sh -c 'id; hostname; sleep 1' || true
  show_alerts 'Terminal shell in container|shell was spawned' "shell interactif dans un conteneur"
}

attack_file() {
  echo "${YEL}[ATTAQUE 2] Lecture de fichiers sensibles : cat /etc/shadow ; cat /etc/sudoers${RST}"
  kubectl exec -n "$NS" "$POD" -- sh -c 'cat /etc/shadow >/dev/null; cat /etc/sudoers >/dev/null; true' || true
  show_alerts 'Read sensitive file|sensitive file opened' "lecture de fichier sensible"
}

attack_binary() {
  echo "${YEL}[ATTAQUE 3] Modification de binaire systeme : ecriture dans /usr/bin${RST}"
  kubectl exec -n "$NS" "$POD" -- sh -c 'echo "#!/bin/sh" > /usr/bin/falco-demo-implant; chmod +x /usr/bin/falco-demo-implant; true' || true
  show_alerts 'below a known binary directory|Write below binary dir' "ecriture sous un repertoire de binaires"
}

case "$ATTACK" in
  shell) attack_shell ;;
  file) attack_file ;;
  binary) attack_binary ;;
  all) attack_shell; attack_file; attack_binary ;;
esac

if [ "$DETECTED" -eq "$LAUNCHED" ]; then
  echo "${GRN}RESULTAT : ${DETECTED}/${LAUNCHED} attaque(s) detectee(s) par Falco (eBPF).${RST}"
  exit 0
fi
echo "RESULTAT : ${DETECTED}/${LAUNCHED} attaque(s) detectee(s)." >&2
echo "Verifier : kubectl logs -n ${FALCO_NS} -l app.kubernetes.io/name=falco -c falco --tail=30" >&2
exit 1
