###############################################################################
# Module namespaces : namespaces applicatifs OmniPay + labels PSS "restricted"
# + quotas de ressources.
#
# Le niveau PSS "restricted" fait refuser par l'API server tout pod root, sans
# seccomp, avec privilege escalation ou capabilities superflues.
###############################################################################

terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
  }
}

locals {
  common_labels = {
    project    = "omnipay"
    managed-by = "terraform"
  }

  pss_labels = {
    "pod-security.kubernetes.io/enforce" = var.pss_level
    "pod-security.kubernetes.io/warn"    = var.pss_level
    "pod-security.kubernetes.io/audit"   = var.pss_level
  }
}

resource "kubernetes_namespace" "omnipay" {
  for_each = toset(var.environments)

  metadata {
    name = "omnipay-${each.key}"

    labels = merge(
      local.common_labels,
      local.pss_labels,
      { environment = each.key }
    )

    annotations = {
      "omnipay.io/cluster-domain" = var.cluster_domain
    }
  }
}

# Quotas : plafonnent la consommation d'un namespace (isolation des environnements
# sur un cluster mono-noeud). Les pods doivent donc declarer requests et limits.
resource "kubernetes_resource_quota_v1" "omnipay" {
  for_each = var.enable_quotas ? kubernetes_namespace.omnipay : {}

  metadata {
    name      = "omnipay-quota"
    namespace = each.value.metadata[0].name
  }

  spec {
    hard = {
      "requests.cpu"    = var.quota.requests_cpu
      "requests.memory" = var.quota.requests_memory
      "limits.cpu"      = var.quota.limits_cpu
      "limits.memory"   = var.quota.limits_memory
      "pods"            = tostring(var.quota.pods)
    }
  }
}
