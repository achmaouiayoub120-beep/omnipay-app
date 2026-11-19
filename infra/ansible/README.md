# Ansible - Installation et durcissement K3s

Automatise les prerequis noyau, le pare-feu minimal et l'installation de K3s
(Traefik desactive : Ingress NGINX sera deploye en Semaine 2).

## Prerequis

- Machine cible Linux (Ubuntu/Debian recommande), acces `sudo`.
- Ansible >= 2.15 sur la machine qui execute le playbook.
- Collections Ansible :

```bash
ansible-galaxy collection install community.general ansible.posix
```

- Pour une cible distante : acces SSH par cle (aucun mot de passe dans l'inventaire).

## Utilisation

Adapter `inventory.ini` (execution locale par defaut), puis :

```bash
cd infra/ansible
ansible-playbook -i inventory.ini playbook-k3s-setup.yml --syntax-check
ansible-playbook -i inventory.ini playbook-k3s-setup.yml --ask-become-pass
```

## Ce que fait le playbook

1. Prerequis : swap desactive, modules `overlay` et `br_netfilter`, sysctl reseau.
2. Pare-feu (UFW si present) : 22, 6443 (API), 30000-32767 (NodePorts).
3. Installation K3s via `get.k3s.io` avec `--write-kubeconfig-mode 644 --disable traefik`.
4. Validation : API sur 6443, noeud `Ready`.
5. Copie de `/etc/rancher/k3s/k3s.yaml` vers `~/.kube/config` (mode 0600).

## Ensuite

```bash
cd ../terraform
cp terraform.tfvars.example terraform.tfvars
terraform init && terraform apply
```

> Le playbook est idempotent : le relancer ne reinstalle pas K3s.
