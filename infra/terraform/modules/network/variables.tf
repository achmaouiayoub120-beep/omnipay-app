variable "node_cidr" {
  description = "Sous-reseau des noeuds K3s (ex: reseau host-only de la VM)."
  type        = string
  default     = "192.168.56.0/24"

  validation {
    condition     = can(cidrhost(var.node_cidr, 0))
    error_message = "node_cidr doit etre un CIDR IPv4 valide."
  }
}

variable "admin_cidr" {
  description = "Plage autorisee pour l'administration (SSH, API 6443). Ne pas mettre 0.0.0.0/0."
  type        = string
  default     = "192.168.56.0/24"

  validation {
    condition     = can(cidrhost(var.admin_cidr, 0)) && var.admin_cidr != "0.0.0.0/0"
    error_message = "admin_cidr doit etre un CIDR valide et different de 0.0.0.0/0."
  }
}

variable "pod_cidr" {
  description = "CIDR des pods (defaut K3s : 10.42.0.0/16)."
  type        = string
  default     = "10.42.0.0/16"

  validation {
    condition     = can(cidrhost(var.pod_cidr, 0))
    error_message = "pod_cidr doit etre un CIDR IPv4 valide."
  }
}

variable "service_cidr" {
  description = "CIDR des Services (defaut K3s : 10.43.0.0/16). Ne doit pas chevaucher pod_cidr."
  type        = string
  default     = "10.43.0.0/16"

  validation {
    condition     = can(cidrhost(var.service_cidr, 0))
    error_message = "service_cidr doit etre un CIDR IPv4 valide."
  }
}

variable "expose_nodeports" {
  description = "Ouvre la plage NodePort 30000-32767 (outils de la plateforme) a admin_cidr."
  type        = bool
  default     = true
}

variable "multi_node" {
  description = "Cluster a plusieurs noeuds : ouvre les flux inter-noeuds (VXLAN, kubelet)."
  type        = bool
  default     = false
}
