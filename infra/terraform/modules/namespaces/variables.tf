variable "environments" {
  description = "Environnements : un namespace omnipay-<env> par entree. Defaut : les 3 namespaces applicatifs."
  type        = list(string)
  default     = ["dev", "recette", "prod"]
}

variable "pss_level" {
  description = "Niveau Pod Security Standards (enforce, warn et audit). Zero-Trust : restricted."
  type        = string
  default     = "restricted"

  validation {
    condition     = contains(["privileged", "baseline", "restricted"], var.pss_level)
    error_message = "pss_level doit valoir privileged, baseline ou restricted."
  }
}

variable "cluster_domain" {
  description = "Domaine DNS interne du cluster (annotation)."
  type        = string
  default     = "omnipay.local"
}

variable "enable_quotas" {
  description = "Cree un ResourceQuota dans chaque namespace."
  type        = bool
  default     = true
}

variable "quota" {
  description = "Plafonds du ResourceQuota applique a chaque namespace."
  type = object({
    requests_cpu    = string
    requests_memory = string
    limits_cpu      = string
    limits_memory   = string
    pods            = number
  })
  default = {
    requests_cpu    = "2"
    requests_memory = "2Gi"
    limits_cpu      = "4"
    limits_memory   = "4Gi"
    pods            = 20
  }
}
