output "namespaces" {
  description = "Namespaces OmniPay crees."
  value       = [for ns in kubernetes_namespace.omnipay : ns.metadata[0].name]
}

output "namespace_security_labels" {
  description = "Labels Pod Security Standards appliques a chaque namespace."
  value = {
    for env, ns in kubernetes_namespace.omnipay :
    ns.metadata[0].name => {
      for k, v in ns.metadata[0].labels : k => v
      if startswith(k, "pod-security.kubernetes.io/")
    }
  }
}
