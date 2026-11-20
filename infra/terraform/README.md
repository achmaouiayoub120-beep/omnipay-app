# Terraform - OmniPay Zero-Trust

```
infra/terraform/
  modules/
    namespaces/   namespaces omnipay-<env> + labels PSS restricted + ResourceQuota
    network/      CIDR, regles de pare-feu (UFW) et arguments K3s (calcul + validation)
  envs/
    dev/ recette/ prod/   une racine Terraform par environnement (etat isole)
  terraform.tfvars.example
```

Chaque `envs/<env>` instancie les modules avec ses propres valeurs (quotas, exposition
des NodePorts). Le module `namespaces` sait creer les 3 namespaces d'un coup
(`environments` par defaut) ; chaque environnement ne gere que le sien.

## Utilisation

```bash
cd infra/terraform/envs/dev
export KUBE_CONFIG_PATH=~/.kube/config
terraform init
terraform plan  -var-file=../../terraform.tfvars
terraform apply -var-file=../../terraform.tfvars
```

## Etat distant et verrouillage (state locking)

Backend `kubernetes` : l'etat est stocke dans le Secret `tfstate-default-omnipay-<env>`
du namespace `kube-system`, et le verrou est une `Lease` Kubernetes
(`lease-tfstate-default-omnipay-<env>`). Consequences :

- Deux `terraform apply` simultanes sur le meme environnement : le second echoue avec
  `Error acquiring the state lock` au lieu de corrompre l'etat.
- Un environnement = un Secret = un verrou : `dev` n'est jamais bloque par `prod`.
- Verrou reste apres un crash : `terraform force-unlock <LOCK_ID>` (apres avoir verifie
  que personne n'applique), ou `kubectl -n kube-system delete lease lease-tfstate-default-omnipay-<env>`.
- L'etat est protege par le RBAC du cluster : restreindre l'acces aux Secrets `tfstate-*`.

Amorcage : le cluster K3s doit exister (playbook Ansible) avant `terraform init`.

## Ce qui n'est PAS ici

Ingress NGINX + cert-manager : `infra/ingress/`. NetworkPolicies : `infra/network-policies/`.
