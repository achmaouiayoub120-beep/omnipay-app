variable "kubeconfig_path" {
  description = "Chemin du kubeconfig du cluster K3s."
  type        = string
  default     = "~/.kube/config"
}

variable "cluster_domain" {
  description = "Domaine DNS interne du cluster."
  type        = string
  default     = "omnipay.local"
}
