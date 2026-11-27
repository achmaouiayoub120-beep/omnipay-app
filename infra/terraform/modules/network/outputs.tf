output "firewall_rules" {
  description = "Regles de pare-feu (nom, port, protocole, source, justification)."
  value       = concat(local.firewall_rules, local.cluster_internal_rules)
}

output "ufw_commands" {
  description = "Commandes UFW equivalentes aux regles de pare-feu."
  value       = local.ufw_commands
}

output "k3s_server_args" {
  description = "Valeur d'INSTALL_K3S_EXEC pour l'installation du serveur K3s."
  value       = local.k3s_server_args
}

output "pod_cidr" {
  description = "CIDR des pods."
  value       = var.pod_cidr
}

output "service_cidr" {
  description = "CIDR des Services."
  value       = var.service_cidr
}
