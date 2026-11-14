# Guide de contribution — OmniPay Zero-Trust (omnipay-app)

Ce document définit les règles de collaboration pour l'équipe technique d'OmniPay Zero-Trust.

---

## 1. Stratégie de branches

Le projet applique une version adaptée de Gitflow orientée intégration continue :

- **`main`** : Branche de production. Tout commit sur `main` doit être validé, testé et déployé via GitOps. Fusion directe interdite (Pull Request obligatoire avec au moins 1 revue).
- **`develop`** : Branche d'intégration continue principale. Les fonctionnalités y sont regroupées avant promotion vers la production.
- **`feature/<nom>`** : Nouvelles fonctionnalités (ex. `feature/auth-jwt-endpoint`). Créée depuis `develop`, fusionnée dans `develop`.
- **`fix/<nom>`** : Corrections de bugs (ex. `fix/transaction-validation`).
- **`security/<nom>`** : Patchs de sécurité ou durcissement (ex. `security/gitleaks-rules`).
- **`docs/<nom>`** : Documentation, ADR, schémas (ex. `docs/stride-threat-model`).

---

## 2. Conventional Commits

Chaque message de commit doit respecter le format standard :

```text
<type>(<périmètre>): <description concise en minuscules>
```

### Types autorisés

- `feat` : Ajout d'une nouvelle fonctionnalité.
- `fix` : Correction d'un dysfonctionnement.
- `ci` : Modifications du pipeline Jenkins, JCasC ou scripts CI.
- `security` : Règles de sécurité, Gitleaks, durcissement, politiques Kyverno/Falco.
- `docs` : Rédaction ou mise à jour de documentation, ADR, runbooks.
- `test` : Ajout ou correction de tests unitaires, intégration, k6.
- `refactor` : Modification du code sans changement de comportement fonctionnel.
- `infra` : Changement IaC (Terraform, Ansible, Helm).

### Exemples valides

```text
feat(auth): ajouter endpoint de validation de token JWT
ci(jenkins): integrer le stage d'analyse gitleaks dans le jenkinsfile
security(gitleaks): configurer les regles de detection des faux positifs
docs(adr): rediger adr-003 sur le choix du moteur ci
test(transaction): ajouter tests unitaires sur le solde negatif
```

### Exemples invalides (rejetés en revue)

```text
update
wip
fix bug
ajout code
```

---

## 3. Workflow de Pull Request (PR)

1. Mettre à jour sa branche locale depuis `develop` (`git pull --rebase origin develop`).
2. Exécuter la vérification locale anti-secrets (`gitleaks git .`).
3. Pousser la branche de travail vers GitHub.
4. Ouvrir une Pull Request vers `develop` en utilisant le template `.github/PULL_REQUEST_TEMPLATE.md`.
5. Associer l'issue correspondante du backlog GitHub Projects.
6. Obtenir l'approbation d'au moins un relecteur de l'équipe (règle des binômes).
7. Fusionner en mode **Squash and Merge** ou **Rebase and Merge** pour conserver un historique propre.

---

## 4. Règle absolue : Zéro Secret

Aucun mot de passe, jeton d'API, clé privée ou chaîne de connexion en clair ne doit être commité.
En cas de détection d'un secret par Gitleaks ou lors de la revue :
1. La PR est immédiatement bloquée.
2. Le secret est révoqué.
3. L'historique local est nettoyé avant tout nouveau push.
