output "namespaces" {
  description = "Namespaces crees pour cet environnement."
  value       = module.namespaces.namespaces
}

output "namespace_security_labels" {
  description = "Labels Pod Security Standards appliques."
  value       = module.namespaces.namespace_security_labels
}

output "firewall_rules" {
  description = "Regles de pare-feu a appliquer sur le noeud K3s."
  value       = module.network.firewall_rules
}

output "k3s_server_args" {
  description = "Valeur d'INSTALL_K3S_EXEC pour K3s."
  value       = module.network.k3s_server_args
}
