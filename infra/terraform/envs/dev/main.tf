###############################################################################
# Environnement dev - developpement (quotas reduits)
#
# Racine Terraform autonome : son etat est isole des autres environnements.
#   cd infra/terraform/envs/dev
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

  # Etat distant avec verrouillage : Secret "tfstate-default-omnipay-dev" dans
  # kube-system ; le verrou est une Lease Kubernetes (coordination.k8s.io).
  # Le kubeconfig est lu depuis KUBE_CONFIG_PATH (un bloc backend n'accepte pas
  # de variables). Voir infra/terraform/README.md.
  backend "kubernetes" {
    secret_suffix = "omnipay-dev"
    namespace     = "kube-system"
  }
}

provider "kubernetes" {
  config_path = var.kubeconfig_path
}

module "namespaces" {
  source = "../../modules/namespaces"

  environments   = ["dev"]
  pss_level      = "restricted"
  cluster_domain = var.cluster_domain

  quota = {
    requests_cpu    = "2"
    requests_memory = "2Gi"
    limits_cpu      = "4"
    limits_memory   = "4Gi"
    pods            = 20
  }
}

module "network" {
  source = "../../modules/network"

  expose_nodeports = true
}
