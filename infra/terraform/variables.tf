variable "kubeconfig_path" {
  description = "Chemin du kubeconfig utilise par les providers kubernetes et helm (ex: ~/.kube/config ou /etc/rancher/k3s/k3s.yaml)."
  type        = string
  default     = "~/.kube/config"
}

variable "cluster_domain" {
  description = "Domaine DNS interne du cluster, ajoute en annotation sur les namespaces."
  type        = string
  default     = "omnipay.local"
}

variable "environments" {
  description = "Environnements a provisionner. Chaque entree cree un namespace omnipay-<env>."
  type        = list(string)
  default     = ["dev", "recette", "prod"]
}

variable "pss_level" {
  description = "Niveau Pod Security Standards applique (enforce/warn/audit). Zero-Trust : restricted."
  type        = string
  default     = "restricted"

  validation {
    condition     = contains(["privileged", "baseline", "restricted"], var.pss_level)
    error_message = "pss_level doit valoir privileged, baseline ou restricted."
  }
}
