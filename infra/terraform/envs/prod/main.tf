###############################################################################
# Environnement prod - production (quotas eleves, NodePorts fermes)
#
# Racine Terraform autonome : son etat est isole des autres environnements.
#   cd infra/terraform/envs/prod
#   export KUBE_CONFIG_PATH=~/.kube/config
#   terraform init
#   terraform plan -var-file=../../terraform.tfvars
#   terraform apply -var-file=../../terraform.tfvars
###############################################################################

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
  }

  # Etat distant avec verrouillage : Secret "tfstate-default-omnipay-prod" dans
  # kube-system ; le verrou est une Lease Kubernetes (coordination.k8s.io).
  # Le kubeconfig est lu depuis KUBE_CONFIG_PATH (un bloc backend n'accepte pas
  # de variables). Voir infra/terraform/README.md.
  backend "kubernetes" {
    secret_suffix = "omnipay-prod"
    namespace     = "kube-system"
  }
}

provider "kubernetes" {
  config_path = var.kubeconfig_path
}

module "namespaces" {
  source = "../../modules/namespaces"

  environments   = ["prod"]
  pss_level      = "restricted"
  cluster_domain = var.cluster_domain

  quota = {
    requests_cpu    = "6"
    requests_memory = "6Gi"
    limits_cpu      = "12"
    limits_memory   = "12Gi"
    pods            = 60
  }
}

module "network" {
  source = "../../modules/network"

  expose_nodeports = false
}
