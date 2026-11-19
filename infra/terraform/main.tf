###############################################################################
# OmniPay Zero-Trust - Socle Kubernetes (K3s) : namespaces applicatifs
# Role : P3 - Plateforme, IaC, reseau et conformite (Semaine 1)
#
# Chaque namespace est cree avec les labels Pod Security Standards (PSS)
# au niveau le plus strict ("restricted") : enforce + warn + audit.
###############################################################################

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
  }
}

provider "kubernetes" {
  config_path = var.kubeconfig_path
}

provider "helm" {
  kubernetes {
    config_path = var.kubeconfig_path
  }
}

locals {
  environments = toset(var.environments)

  common_labels = {
    project    = "omnipay"
    managed-by = "terraform"
  }

  # Standard Pod Security Standards : niveau "restricted" partout.
  pss_labels = {
    "pod-security.kubernetes.io/enforce" = var.pss_level
    "pod-security.kubernetes.io/warn"    = var.pss_level
    "pod-security.kubernetes.io/audit"   = var.pss_level
  }
}

resource "kubernetes_namespace" "omnipay" {
  for_each = local.environments

  metadata {
    name = "omnipay-${each.key}"

    labels = merge(
      local.common_labels,
      local.pss_labels,
      {
        environment = each.key
      }
    )

    annotations = {
      "omnipay.io/cluster-domain" = var.cluster_domain
    }
  }
}
