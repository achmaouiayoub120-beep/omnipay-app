# 🎙️ Fiche Mémo Oral & Préparation Jury — P3
## Rôle : Infrastructure Cloud, Secrets (Vault) & Sécurité Runtime (Falco eBPF)
### Projet : OmniPay Zero-Trust (ESTC 2026)
**Créneau oral :** minutes 12:00 à 18:00 (6 minutes chrono)
**Supports :** Slides 9 à 12 (`docs/soutenance/slides-soutenance-omnipay.md`) · Démo 4 (`demos/demo-4-vault-falco-runtime.md`)

---

## ⚠️ À vérifier avant le jour J (chiffres que je ne dois PAS citer sans les avoir confirmés)

| Chiffre | Où il apparaît | Ce qu'il faut faire |
|---|---|---|
| **RTO « 8 min 42 s »** | `docs/runbooks/disaster-recovery-test.md` | Ne le dire que si le test a **réellement** été chronométré. Sinon refaire le test (`infra/scripts/measure-terraform-rto.sh --yes` pour la brique Terraform + bootstrap de P1) et utiliser la valeur mesurée. |
| **Overhead CPU de Falco** | question probable du jury | Relever `kubectl top pod -n falco` pendant une charge (k6 de P2) et noter la valeur. Ne pas citer de pourcentage non mesuré. |
| **Slide 10 : « credentials à TTL court et rotation automatique »** | slides | Ce qui est livré : secrets KV v2 **rotatables à chaud** via ESO. Les credentials éphémères (moteur *database*) ne sont pas livrés. Corriger la slide ou prononcer la version exacte (voir script ci-dessous). |
| **RPO = 0** | runbook, énoncé | Vrai pour la **configuration** (tout est dans Git). Pour les **données de Vault** : non nul tant qu'il n'y a pas de sauvegarde. |

---

## ⏱️ 1. Découpage minute par minute

```
+--------------------------------------------------------------------------------------+
| 12:00 - 12:30 | TRANSITION & PROMESSE : « Zero to Hero » (Slide 9)                    |
+--------------------------------------------------------------------------------------+
| 12:30 - 14:00 | POSTURE ZERO-TRUST RÉSEAU ET DONNÉES (Slides 9 - 10)                  |
+--------------------------------------------------------------------------------------+
| 14:00 - 14:30 | SÉCURITÉ RUNTIME : POURQUOI eBPF (Slide 11)                           |
+--------------------------------------------------------------------------------------+
| 14:30 - 17:30 | DÉMONSTRATION 4 LIVE : VAULT + FALCO (Slide 12, 3 minutes)            |
+--------------------------------------------------------------------------------------+
| 17:30 - 18:00 | CONCLUSION & TRANSITION VERS P4 (WIDAD)                               |
+--------------------------------------------------------------------------------------+
```

---

## 🗣️ 2. Script textuel (ce que je dis)

### [12:00 - 12:30] Transition et promesse
> *« Merci Amira. Une application bancaire n'est aussi sûre que le socle sur lequel elle tourne. Je suis [prénom nom], responsable de l'infrastructure et de la sécurité runtime. Ma promesse tient en trois phrases : on peut **reconstruire** toute l'infrastructure depuis Git ; **aucun mot de passe** ne vit dans Git ; et si un conteneur est compromis, **nous le voyons au niveau du noyau Linux**. »*

### [12:30 - 14:00] Reproductibilité et posture Zero-Trust *(Slides 9 et 10)*
> *« Tout est du code. Le cluster K3s est installé par Ansible, les trois environnements, `omnipay-dev`, `recette` et `prod`, sont créés par Terraform avec un état séparé pour chacun. Pour tester notre plan de reprise, nous avons détruit puis reconstruit la plateforme depuis les dépôts Git : [**<durée mesurée>** : 8 min 42 s si confirmé] pour un objectif de moins de 15 minutes. »*
>
> *« Côté réseau, la règle est le **refus par défaut** : chaque namespace démarre avec une NetworkPolicy deny-all, puis nous ouvrons uniquement les flux nécessaires, port par port. Le service de notification, par exemple, ne peut pas joindre la base PostgreSQL, et aucun pod ne peut sortir sur Internet. »*
>
> *« Côté données, **Git ne contient que des références**. Les mots de passe sont générés dans HashiCorp Vault. External Secrets Operator les recopie dans des Secrets Kubernetes, et seul lui parle à Vault : les pods applicatifs n'ont aucun chemin vers le coffre. Un secret changé dans Vault arrive dans le cluster **sans commit et sans redéploiement**. Aujourd'hui ce sont des secrets rotatables à chaud ; émettre des identifiants de base éphémères est notre prochaine étape. »*
>
> *« Enfin, aucun conteneur ne tourne en root : le niveau de sécurité de pod *restricted* est imposé sur les trois environnements. »*

### [14:00 - 14:30] Pourquoi Falco eBPF *(Slide 11)*
> *« Les politiques préventives, réseau et admission, ne couvrent pas tout. Il faut aussi **voir** ce qui se passe dans un conteneur. Falco observe les appels système directement dans le noyau grâce à eBPF : pas de module noyau à compiler, pas d'agent dans les pods, et le contexte Kubernetes, pod et namespace, est attaché à chaque alerte. Il détecte un shell interactif, la lecture de fichiers sensibles, l'écriture dans un répertoire de binaires. Montrons-le. »*

### [14:30 - 17:30] Démo 4 live : guidage minute par minute

| Temps | Je fais | Je dis |
|---|---|---|
| 14:30 | Console Vault → `secret/omnipay/` | « Voici les secrets d'OmniPay, versionnés. Dans Git, il n'y a que des références : voyez » → `git grep` |
| 15:15 | `kubectl get externalsecret -n omnipay-dev` | « Synchronisé vers Kubernetes, sans que l'application ne contacte Vault. » |
| 15:30 | `./infra/falco/scripts/trigger-falco-alerts.sh --attack all` | « Je joue l'attaquant dans un conteneur mal configuré : un shell, une lecture de `/etc/shadow`, une écriture dans `/usr/bin`. » |
| 16:15 | Les lignes `>>> ALERTE FALCO` s'affichent | « Trois attaques, trois alertes, générées par le noyau au moment de l'appel système. » |
| 16:45 | Alertmanager / Grafana | « L'alerte part vers l'astreinte : personne n'a besoin de lire un log. » |
| 17:10 | Le script supprime le bac à sable | « Retour à l'état nominal, automatiquement. » |

> **Argument défense en profondeur à glisser :** *« Dans un vrai pod OmniPay, non-root et en lecture seule, ces attaques échouent déjà. Falco est la dernière ligne, pour le jour où une configuration est mauvaise. »*

### [17:30 - 18:00] Conclusion et transition vers P4
> *« En résumé : une infrastructure reconstruisible depuis Git, des secrets qui ne sont jamais écrits dans le code, et un noyau sous surveillance. Reste une question : **comment être certain que ce qui s'exécute sur ce socle est bien ce que nous avons construit ?** C'est la chaîne de confiance des images. Je passe la parole à Widad El Gharzaz, qui va vous montrer la signature Cosign, le registre Harbor, l'admission Kyverno et le déploiement GitOps. »*

---

## 🎯 3. Top 5 des questions pièges et réponses préparées

### Q1. « Pourquoi eBPF plutôt que ptrace ou auditd pour Falco ? »
> *« **ptrace** attache un traceur à chaque processus et le **ralentit**, il est intrusif et contournable (un processus ne peut être tracé qu'une fois). **auditd** passe par le sous-système d'audit : c'est lourd avec beaucoup de règles, sans contexte conteneur ni Kubernetes, et ses journaux sont à corréler à la main. **eBPF** exécute de petits programmes **vérifiés** dans le noyau : on lit les appels système au plus près, avec un faible coût, sans module noyau à maintenir (un module peut faire planter le noyau), et Falco enrichit chaque événement avec le pod et le namespace. Nous utilisons la sonde *modern eBPF*. »*

### Q2. « Comment gérez-vous le quorum et les clés d'unseal de Vault en cas de sinistre ? »
> *« Vault est initialisé avec **3 parts et un seuil de 2** (Shamir) : deux personnes distinctes doivent coopérer pour le déverrouiller. Cas 1, **redémarrage de Vault** : les données sont sur un volume persistant, on le déverrouille avec 2 parts, et External Secrets se reconnecte seul (c'est ce que `verify-vault-resilience.sh` démontre). Cas 2, **perte du cluster** : le volume disparaît avec lui, on recrée un Vault vide (`init-vault.sh`) et on réinjecte les secrets. Point honnête : en laboratoire, les parts sont dans un Secret Kubernetes ; en production elles seraient **hors cluster, détenues par des personnes différentes**, avec auto-unseal via un KMS. »*

### Q3. « Quel est l'overhead CPU de Falco sur K3s ? »
> *« Je ne citerai pas un pourcentage que je n'ai pas mesuré. Ce que je peux dire : Falco est un DaemonSet avec **requests 100m / 128 Mi et limites 500m / 256 Mi**, et la sonde modern eBPF est conçue pour un coût faible. Pendant notre test de charge k6, j'ai relevé `kubectl top pod -n falco` : **[valeur relevée]**. Le coût dépend du nombre d'appels système, donc de la charge. »*
> *(Compléter la valeur avant le jour J.)*

### Q4. « Vous annoncez un RPO de 0. Et les données de Vault ? »
> *« Le RPO de 0 concerne la **configuration** : infrastructure, politiques, manifests, tout est dans Git. Les **données de Vault** sont sur un volume persistant sans sauvegarde automatique pour l'instant : leur RPO est celui de la dernière sauvegarde. La suite logique est un stockage Raft avec des *snapshots* planifiés, copiés hors du cluster. Je préfère le dire que le laisser deviner. »*

### Q5. « Vos secrets sont-ils vraiment dynamiques ? Et si quelqu'un lit le Secret Kubernetes ? »
> *« Ils sont **centralisés, versionnés et rotatables à chaud**, mais pas encore **éphémères** : ce serait le moteur *database* de Vault, avec des identifiants à TTL court. Quant au Secret Kubernetes, il est en base64 : il est protégé par les droits d'accès (RBAC), par le fait qu'aucun pod ne le monte hors de son besoin, et par Falco qui alerte sur la lecture du jeton de ServiceAccount. Le chiffrement des secrets dans etcd est une option K3s à activer et à vérifier. »*

### Bonus (si le temps le permet)
| Question | Réponse courte |
|---|---|
| « Falco bloque-t-il l'attaque ? » | Non, il **détecte** et alerte. Le blocage vient de PSS, des NetworkPolicies et de Kyverno. Une réponse automatique (Falco Talon) est une évolution. |
| « Pourquoi pas Sealed Secrets ? » | Le secret chiffré reste **dans Git et statique** : pas de rotation ni de révocation immédiate (ADR-011). |
| « Que se passe-t-il si Vault est scellé ? » | Les Secrets Kubernetes et les pods ne changent pas ; ESO signale l'erreur, puis se reconnecte au déverrouillage. Démontré par script. |
| « Pourquoi ne pas démontrer sur un vrai pod de production ? » | Il est non-root en lecture seule : l'attaque y échoue déjà. Le bac à sable simule une mauvaise configuration pour montrer Falco. |

---

## ✅ 4. Checklist de passage

- [ ] Vault descellé, `kubectl get externalsecret -A` en `SecretSynced`
- [ ] `trigger-falco-alerts.sh --attack all` répété : 3/3 détectées
- [ ] Terminal A (logs Falco) et onglet Vault déjà ouverts
- [ ] Valeur du **RTO** et de l'**overhead Falco** relevées et notées ci-dessus
- [ ] Phrase de transition apprise : « … je passe la parole à Widad El Gharzaz … »
