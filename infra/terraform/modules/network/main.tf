###############################################################################
# Module network : parametres reseau et regles de pare-feu du noeud K3s.
#
# Terraform ne pilote aucune API cloud ici (cluster sur machine/VM etudiante) :
# le module calcule, valide et expose la configuration reseau que consomme le
# playbook Ansible (infra/ansible) pour installer K3s et configurer UFW.
# Source unique de verite : les CIDR et ports ne sont definis qu'ici.
###############################################################################

locals {
  # Ports TCP a ouvrir sur le noeud, avec leur justification.
  firewall_rules = concat(
    [
      { name = "ssh", port = "22", proto = "tcp", source = var.admin_cidr, reason = "Administration SSH" },
      { name = "k3s-api", port = "6443", proto = "tcp", source = var.admin_cidr, reason = "API server Kubernetes" },
      { name = "http", port = "80", proto = "tcp", source = "any", reason = "Ingress NGINX (redirection HTTPS)" },
      { name = "https", port = "443", proto = "tcp", source = "any", reason = "Ingress NGINX (TLS)" },
    ],
    var.expose_nodeports ? [
      { name = "nodeports", port = "30000:32767", proto = "tcp", source = var.admin_cidr, reason = "NodePorts outils (Harbor 30002, ArgoCD 30080, Grafana 30300, Prometheus 30900)" },
    ] : []
  )

  # Flux inter-noeuds (uniquement utiles en multi-noeuds).
  cluster_internal_rules = var.multi_node ? [
    { name = "flannel-vxlan", port = "8472", proto = "udp", source = var.node_cidr, reason = "Reseau de pods (Flannel VXLAN)" },
    { name = "kubelet", port = "10250", proto = "tcp", source = var.node_cidr, reason = "Kubelet / metrics" },
  ] : []

  # UFW : les noeuds etant en deny-incoming par defaut, chaque regle est explicite.
  ufw_commands = [
    for r in concat(local.firewall_rules, local.cluster_internal_rules) :
    r.source == "any"
    ? "ufw allow ${r.port}/${r.proto} comment '${r.name}'"
    : "ufw allow from ${r.source} to any port ${r.port} proto ${r.proto} comment '${r.name}'"
  ]

  # Arguments serveur K3s : CIDR de pods/services explicites, Traefik desactive (ADR-001).
  k3s_server_args = join(" ", [
    "--write-kubeconfig-mode 600",
    "--disable traefik",
    "--cluster-cidr ${var.pod_cidr}",
    "--service-cidr ${var.service_cidr}",
  ])
}
