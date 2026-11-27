# Plan d'infrastructure - OmniPay Zero-Trust (Semaine 1)

Porteur : P3 - Plateforme, IaC, reseau et conformite.

## 1. Topologie du cluster

```
                       +--------------------------------------------+
  Poste / VM  -------> |  Noeud K3s (k3s_master, single-node en S1)  |
  (Ansible, Terraform) |  API Server :6443  | containerd | Flannel   |
                       |                                            |
                       |  ns omnipay-dev     (microservices P2)     |
                       |  ns omnipay-recette (microservices P2)     |
                       |  ns omnipay-prod    (microservices P2)     |
                       |  + outils : Harbor (P4), ArgoCD (P4),      |
                       |    Prometheus / Grafana (P5)               |
                       +--------------------------------------------+
```

- **k3s_master** : control plane + charges de travail (cluster mono-noeud en S1).
- **k3s_agents** : noeuds optionnels, vides en S1 (cf. `infra/ansible/inventory.ini`).
- Les microservices Java de P2 sont deployes dans les 3 namespaces applicatifs ; P4 et P5
  deployent leurs outils sur le meme cluster.
- Ingress NGINX (Traefik desactive) arrive en Semaine 2.

## 2. Matrice des flux et ports

| Port | Service | Type d'exposition | Responsable |
| :--- | :--- | :--- | :--- |
| 6443 | API Server Kubernetes | Hote | P3 |
| 8088 | Jenkins CI (controleur) | Hote | P4 |
| 30002 | Harbor Registry | NodePort | P4 |
| 30003 | SonarQube | NodePort | P4 |
| 30005 | ArgoCD Server | NodePort | P4 |
| 30006 | Vault UI | NodePort | P3 |
| 30300 | Grafana | NodePort | P5 |
| 30900 | Prometheus | NodePort | P5 |
| 5432 | PostgreSQL | Interne cluster (non expose) | P2 |

Le pare-feu (UFW via Ansible) autorise 22, 6443 et la plage NodePort 30000-32767. Tout le reste
est ferme par defaut. PostgreSQL ne doit jamais etre expose hors du cluster.

## 3. Standard de securite : Pod Security Standards

Les 3 namespaces applicatifs (`omnipay-dev`, `omnipay-recette`, `omnipay-prod`) sont crees par
Terraform avec les labels PSS au niveau **restricted** :

| Label | Valeur | Effet |
| :--- | :--- | :--- |
| `pod-security.kubernetes.io/enforce` | `restricted` | Refuse les pods root, sans seccomp, avec privileges |
| `pod-security.kubernetes.io/warn` | `restricted` | Avertit l'utilisateur lors du deploiement |
| `pod-security.kubernetes.io/audit` | `restricted` | Journalise les violations |

Consequence pour P2/P4/P5 : les pods doivent definir `runAsNonRoot: true`, un `seccompProfile`
`RuntimeDefault`, `allowPrivilegeEscalation: false` et abandonner toutes les capabilities.

## 4. Strategie de micro-segmentation (Semaines 2-3)

1. NetworkPolicy `default-deny` (ingress + egress) dans chaque namespace applicatif.
2. Ouvertures explicites : service -> PostgreSQL, ingress controller -> services, Prometheus
   -> endpoints de metriques, resolution DNS.
3. Verification : un pod sans policy autorisee ne peut joindre aucun autre pod.
> Le CNI par defaut de K3s (Flannel) n'applique pas les NetworkPolicies ; K3s embarque un
> controleur de NetworkPolicy (kube-router) actif par defaut tant qu'il n'est pas desactive.

## 5. Reproductibilite

Aucune ressource n'est creee manuellement : Ansible installe K3s, Terraform cree les namespaces.
`terraform destroy && terraform apply` doit reconstruire l'ensemble (test de la Semaine 4).

## 6. Semaine 2 : durcissement reseau (P3)

| Livrable | Emplacement |
| :--- | :--- |
| Modules Terraform `namespaces` (PSS restricted + quotas) et `network` (CIDR, pare-feu, arguments K3s) | `infra/terraform/modules/` |
| Environnements isoles (etat distant + verrou Lease Kubernetes) | `infra/terraform/envs/{dev,recette,prod}/` |
| Ingress NGINX (HSTS, X-Frame-Options, X-Content-Type-Options), CA interne cert-manager, Ingress `api.omnipay.local` | `infra/ingress/` |
| NetworkPolicies `default-deny-all` + flux bancaires autorises | `infra/network-policies/` |
| Test de micro-segmentation, audit Checkov | `infra/scripts/` |
| Decision d'architecture | `docs/adr/ADR-009.md` |

Entree du trafic : `https://api.omnipay.local` (443, TLS cert-manager) -> Ingress NGINX -> services
`/api/auth` (8081), `/api/transactions` (8082), `/api/notifications` (8083). Le pare-feu autorise
desormais 80 et 443 ; les NodePorts restent reserves aux outils de la plateforme (admin_cidr).

Ordre de mise en oeuvre : Ansible (K3s) -> `terraform apply` (envs/<env>) -> Helm cert-manager puis
ingress-nginx -> `kubectl apply` des Issuers, des Ingress puis des NetworkPolicies.
