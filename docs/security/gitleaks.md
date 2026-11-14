# Intégration et Usage de Gitleaks — OmniPay Zero-Trust

## 1. Rôle et Objectif

Dans une infrastructure Zero-Trust bancaire, la compromission d'une clé API, d'un jeton d'accès ou d'un mot de passe de base de données représente un vecteur d'attaque critique (voir menace STRIDE-I1).

**Gitleaks** est un outil d'analyse statique dédié à la détection de secrets (mots de passe, clés cryptographiques, tokens OAuth, clés privées SSH/TLS, tokens AWS/GCP/Vault) dans l'historique et l'arbre de travail Git.

---

## 2. Modes d'exécution

### Mode A : En local via binaire autonome (CLI)
Si Gitleaks est installé sur la machine de développement :
```bash
# Vérification de l'arbre de travail courant
gitleaks dir . --config .gitleaks.toml -v

# Vérification des commits locaux par rapport à la branche distante
gitleaks git . --config .gitleaks.toml -v
```

### Mode B : En local via conteneur Docker
Si le binaire n'est pas installé sur l'hôte, exécutez Gitleaks sans installation via Docker :
```bash
docker run --rm -v ${PWD}:/path zricethezav/gitleaks:latest dir /path --config /path/.gitleaks.toml -v
```

### Mode C : Intégration continue (Jenkins)
Dans le pipeline déclaratif `ci/Jenkinsfile`, le stage `Secret Scan` exécute Gitleaks dès le début du build. Si un secret non autorisé est détecté, le build est stoppé immédiatement avec code de retour non-zéro (Quality Gate stricte).

---

## 3. Configuration et gestion des faux positifs

La configuration est centralisée dans `.gitleaks.toml`.

- **Allowlist** : permet d'exclure les répertoires de build (`target/`), les fichiers de documentation ou des faux positifs avérés.
- **Règles personnalisées** : détection de patterns applicatifs (`omnipay-generic-api-key`, `omnipay-jwt-hardcoded-secret`).

---

## 4. Procédure en cas d'alerte avérée

1. **Révocation immédiate** : Tout secret détecté doit être révoqué auprès de l'émetteur (Vault, base de données, fournisseur cloud).
2. **Nettoyage de l'historique** :
   - Si le commit n'est pas poussé : modifier le commit (`git commit --amend` ou `git reset HEAD~1`).
   - Si le commit a été poussé : utiliser `git-filter-repo` ou BFG Repo-Cleaner et forcer la rotation de l'identifiant.
3. **Déclaration d'incident** : Ouvrir une issue de type `[SECURITY]` pour tracer la remédiation et alimenter le post-mortem.
