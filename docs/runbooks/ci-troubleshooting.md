# Runbook — Dépannage du Pipeline CI (Jenkins & Gitleaks)

Ce guide opérationnel décrit les procédures de résolution rapide en cas d'échec sur la chaîne d'intégration continue d'OmniPay Zero-Trust.

---

## Fiche 1 : Échec du stage `Secret Scan (Gitleaks)`

### Symptôme
Le build Jenkins échoue au stage 3 avec le message :
`[ÉCHEC] X secret(s) potentiel(s) détecté(s) !` ou code de sortie 1 de Gitleaks.

### Causes possibles
1. Un mot de passe, jeton ou clé privée a été introduit dans un fichier récemment modifié.
2. Un faux positif déclenché par une chaîne alphanumérique longue (ex. hash ou fixture de test).

### Procédure de résolution
1. Identifier la ligne incriminée dans les logs Jenkins ou en local :
   ```bash
   powershell ci/scripts/audit-secrets.ps1 .
   ```
2. **Si c'est un vrai secret** :
   - Rétracter / invalider immédiatement le secret auprès du service concerné.
   - Supprimer le secret du fichier.
   - Amender le commit local ou réécrire l'historique si le commit a été poussé :
     ```bash
     git commit --amend
     ```
3. **Si c'est un faux positif avéré** :
   - Ajouter le pattern ou le chemin dans la section `[allowlist]` du fichier `.gitleaks.toml`.
   - Justifier l'exception dans la description de la PR.

---

## Fiche 2 : Échec du build Maven (`Maven Build & Tests`)

### Symptôme
Le stage 4 échoue avec `BUILD FAILURE`.

### Causes possibles
1. Erreur de syntaxe ou régression dans le code Java d'un microservice.
2. Échec d'un test unitaire ou d'intégration (`There are test failures`).
3. Dépendance Maven indisponible ou inaccessible.

### Procédure de résolution
1. Naviguer dans le dossier du microservice défaillant :
   ```bash
   cd services/auth  # ou transaction, notification
   ```
2. Lancer la compilation locale avec logs détaillés :
   ```bash
   mvn clean test -X
   ```
3. Corriger le test ou la dépendance défaillante, puis commiter avec un message de type `fix(...)` ou `test(...)`.

---

## Fiche 3 : Jenkins ne démarre pas avec JCasC

### Symptôme
Le conteneur `omnipay-jenkins` redémarre en boucle ou affiche une erreur de parsing YAML.

### Causes possibles
1. Erreur d'indentation dans `ci/jenkins-casc.yaml`.
2. Variable d'environnement requise manquante.

### Procédure de résolution
1. Consulter les logs du conteneur :
   ```bash
   docker logs omnipay-jenkins
   ```
2. Valider la syntaxe du fichier YAML.
3. Vérifier que les variables d'environnement (`JENKINS_ADMIN_PASSWORD`, etc.) sont définies dans le fichier `.env` ou dans `ci/docker-compose-jenkins.yml`.
