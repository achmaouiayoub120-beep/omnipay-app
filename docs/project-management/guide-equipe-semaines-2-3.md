# 📋 Guide Détaillé par Membre d'Équipe — OmniPay Zero-Trust
## Semaines 2–3 : Développement, Infrastructure, Déploiement & Observabilité

> **Projet :** OmniPay Zero-Trust — Mini-banque simulée (ESTC)
> **Date :** Novembre 2026
> **Branche de travail :** Chaque membre crée `feature/<nom-tâche>` depuis `develop`
> **Règle absolue :** Aucun push direct sur `main` ou `develop` — Pull Request obligatoire

---

## 🏗️ Architecture Globale de Référence

```
┌───────────────┐     ┌──────────────────┐     ┌────────────────────┐
│  GitHub Repos │────▶│  Jenkins CI/CD   │────▶│  Harbor Registry   │
│  omnipay-app  │     │  (JCasC, port    │     │  (Images Docker    │
│  omnipay-gitops│     │   8088)          │     │   signées)         │
└───────────────┘     └──────────────────┘     └────────────────────┘
                                                        │
                                                        ▼
┌───────────────┐     ┌──────────────────┐     ┌────────────────────┐
│  Prometheus   │◀────│  K3s / Kubernetes │◀────│  ArgoCD (GitOps)   │
│  + Grafana    │     │  (Helm charts)   │     │  omnipay-gitops    │
└───────────────┘     └──────────────────┘     └────────────────────┘
```

---

# 👤 P2 — Développeur Backend, Microservices Spring Boot

## Rôle
Développer les trois microservices Java/Spring Boot : Auth, Transaction, Notification.

## Prérequis
- Java 21 (JDK Temurin)
- Maven 3.9+
- Docker Desktop
- Git configuré avec Conventional Commits

## Étapes Détaillées

### Étape 1 — Cloner le dépôt et créer sa branche
```bash
git clone https://github.com/achmaouiayoub120-beep/omnipay-app.git
cd omnipay-app
git checkout develop
git pull origin develop
git checkout -b feature/microservices-spring-boot
```

### Étape 2 — Initialiser le projet parent Maven
Créer le fichier `pom.xml` à la racine du dépôt :
```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
         https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>com.omnipay</groupId>
    <artifactId>omnipay-parent</artifactId>
    <version>1.0.0-SNAPSHOT</version>
    <packaging>pom</packaging>
    <name>OmniPay Zero-Trust Parent</name>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.4.1</version>
        <relativePath/>
    </parent>

    <modules>
        <module>services/auth</module>
        <module>services/transaction</module>
        <module>services/notification</module>
    </modules>

    <properties>
        <java.version>21</java.version>
        <maven.compiler.source>21</maven.compiler.source>
        <maven.compiler.target>21</maven.compiler.target>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-actuator</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>
</project>
```

### Étape 3 — Auth Service (`services/auth/`)
Créer `services/auth/pom.xml` :
```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
         https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>com.omnipay</groupId>
        <artifactId>omnipay-parent</artifactId>
        <version>1.0.0-SNAPSHOT</version>
        <relativePath>../../pom.xml</relativePath>
    </parent>

    <artifactId>auth-service</artifactId>
    <name>OmniPay Auth Service</name>
    <description>Service d'authentification Zero-Trust</description>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-api</artifactId>
            <version>0.12.6</version>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-impl</artifactId>
            <version>0.12.6</version>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-jackson</artifactId>
            <version>0.12.6</version>
            <scope>runtime</scope>
        </dependency>
    </dependencies>
</project>
```

Créer `services/auth/src/main/java/com/omnipay/auth/AuthServiceApplication.java` :
```java
package com.omnipay.auth;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class AuthServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(AuthServiceApplication.class, args);
    }
}
```

Créer `services/auth/src/main/java/com/omnipay/auth/controller/AuthController.java` :
```java
package com.omnipay.auth.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @PostMapping("/login")
    public ResponseEntity<Map<String, String>> login(@RequestBody Map<String, String> credentials) {
        // Simulation — pas de vraie authentification
        String username = credentials.getOrDefault("username", "anonymous");
        return ResponseEntity.ok(Map.of(
            "token", "simulated-jwt-token-for-" + username,
            "type", "Bearer",
            "message", "Authentification simulée réussie"
        ));
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "UP", "service", "auth-service"));
    }
}
```

Créer `services/auth/src/main/resources/application.yml` :
```yaml
server:
  port: 8081
spring:
  application:
    name: auth-service
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics
```

Créer un test : `services/auth/src/test/java/com/omnipay/auth/AuthServiceApplicationTests.java` :
```java
package com.omnipay.auth;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class AuthServiceApplicationTests {
    @Test
    void contextLoads() {
    }
}
```

### Étape 4 — Transaction Service (`services/transaction/`)
Même structure que Auth Service, mais :
- `artifactId` = `transaction-service`
- Port = `8082`
- Package = `com.omnipay.transaction`
- Controller : `TransactionController` sur `/api/transactions`
- Endpoints :
  - `POST /api/transactions/transfer` — simuler un transfert (entrée : `from`, `to`, `amount`)
  - `GET /api/transactions/health` — health check

### Étape 5 — Notification Service (`services/notification/`)
Même structure, mais :
- `artifactId` = `notification-service`
- Port = `8083`
- Package = `com.omnipay.notification`
- Controller : `NotificationController` sur `/api/notifications`
- Endpoints :
  - `POST /api/notifications/send` — simuler l'envoi d'une notification
  - `GET /api/notifications/health` — health check

### Étape 6 — Dockerfile pour chaque service
Créer un `Dockerfile` dans chaque dossier `services/<nom>/` :
```dockerfile
FROM eclipse-temurin:21-jre-alpine
LABEL maintainer="omnipay-team"
ARG JAR_FILE=target/*.jar
COPY ${JAR_FILE} app.jar
EXPOSE 8081
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost:8081/api/auth/health || exit 1
ENTRYPOINT ["java", "-jar", "/app.jar"]
```
> ⚠️ Adapter le port et le chemin du health check pour chaque service (8081, 8082, 8083).

### Étape 7 — Compiler et tester
```bash
# Depuis la racine omnipay-app/
mvn clean install -DskipTests   # D'abord compiler
mvn test                         # Ensuite tester
```

### Étape 8 — Construire les images Docker
```bash
cd services/auth
mvn clean package -DskipTests
docker build -t omnipay/auth-service:latest .
# Répéter pour transaction et notification
```

### Étape 9 — Committer et créer la PR
```bash
git add -A
git commit -m "feat(services): implementer les trois microservices spring boot"
git push origin feature/microservices-spring-boot
# Créer une Pull Request vers develop sur GitHub
```

### ✅ Critères d'Acceptation P2
- [ ] `mvn clean install` réussit sans erreur
- [ ] `mvn test` — tous les tests passent
- [ ] Chaque service démarre sur son port respectif
- [ ] `GET /api/<service>/health` retourne `{"status":"UP"}`
- [ ] 3 images Docker construites avec succès
- [ ] Aucun secret codé en dur dans le code source
- [ ] PR créée vers `develop` avec description complète

---

# 👤 P3 — Infrastructure, Terraform, Ansible & K3s

## Rôle
Provisionner l'infrastructure : installer K3s, configurer le cluster avec Ansible, et préparer les manifestes Terraform.

## Prérequis
- Machine Linux (VM ou WSL2)
- `kubectl` installé
- Terraform 1.6+
- Ansible 2.15+

## Étapes Détaillées

### Étape 1 — Cloner et créer sa branche
```bash
git clone https://github.com/achmaouiayoub120-beep/omnipay-app.git
cd omnipay-app
git checkout develop
git checkout -b feature/infra-k3s-terraform
```

### Étape 2 — Installer K3s
```bash
# Sur la VM cible (ou WSL2 pour simulation)
curl -sfL https://get.k3s.io | sh -s - --write-kubeconfig-mode 644
# Vérifier
kubectl get nodes
kubectl get pods -A
```

### Étape 3 — Terraform — Déclaration de l'infrastructure
Créer les fichiers dans `infra/terraform/` :

`infra/terraform/main.tf` :
```hcl
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

# Namespace pour OmniPay
resource "kubernetes_namespace" "omnipay_dev" {
  metadata {
    name = "omnipay-dev"
    labels = {
      project     = "omnipay"
      environment = "dev"
      managed-by  = "terraform"
    }
  }
}

resource "kubernetes_namespace" "omnipay_recette" {
  metadata {
    name = "omnipay-recette"
    labels = {
      project     = "omnipay"
      environment = "recette"
      managed-by  = "terraform"
    }
  }
}

resource "kubernetes_namespace" "omnipay_prod" {
  metadata {
    name = "omnipay-prod"
    labels = {
      project     = "omnipay"
      environment = "prod"
      managed-by  = "terraform"
    }
  }
}
```

`infra/terraform/variables.tf` :
```hcl
variable "kubeconfig_path" {
  description = "Chemin vers le fichier kubeconfig K3s"
  type        = string
  default     = "/etc/rancher/k3s/k3s.yaml"
}
```

`infra/terraform/outputs.tf` :
```hcl
output "namespaces" {
  value = [
    kubernetes_namespace.omnipay_dev.metadata[0].name,
    kubernetes_namespace.omnipay_recette.metadata[0].name,
    kubernetes_namespace.omnipay_prod.metadata[0].name,
  ]
}
```

### Étape 4 — Ansible — Playbook de configuration
Créer `infra/ansible/inventory.ini` :
```ini
[k3s_master]
localhost ansible_connection=local

[k3s_master:vars]
ansible_python_interpreter=/usr/bin/python3
```

Créer `infra/ansible/playbook-k3s-setup.yml` :
```yaml
---
- name: Configuration du cluster K3s pour OmniPay Zero-Trust
  hosts: k3s_master
  become: true
  tasks:
    - name: Vérifier que K3s est installé
      command: kubectl get nodes
      register: k3s_status
      changed_when: false

    - name: Afficher les nœuds
      debug:
        var: k3s_status.stdout_lines

    - name: Créer le namespace omnipay-dev
      command: kubectl create namespace omnipay-dev --dry-run=client -o yaml | kubectl apply -f -
      changed_when: false

    - name: Vérifier les namespaces
      command: kubectl get namespaces
      register: ns_list
      changed_when: false

    - name: Afficher les namespaces
      debug:
        var: ns_list.stdout_lines

    - name: Appliquer les labels de sécurité
      command: >
        kubectl label namespace omnipay-dev
        pod-security.kubernetes.io/enforce=restricted
        --overwrite
      changed_when: false
```

### Étape 5 — Exécuter Terraform
```bash
cd infra/terraform
terraform init
terraform plan -out=tfplan
terraform apply tfplan
# Vérifier
kubectl get namespaces | grep omnipay
```

### Étape 6 — Exécuter Ansible
```bash
cd infra/ansible
ansible-playbook -i inventory.ini playbook-k3s-setup.yml
```

### Étape 7 — Committer et créer la PR
```bash
git add -A
git commit -m "feat(infra): configurer K3s, Terraform namespaces et Ansible playbook"
git push origin feature/infra-k3s-terraform
```

### ✅ Critères d'Acceptation P3
- [ ] K3s installé et `kubectl get nodes` retourne `Ready`
- [ ] `terraform apply` crée les 3 namespaces (dev, recette, prod)
- [ ] Ansible playbook s'exécute sans erreur
- [ ] Namespaces visibles avec les bons labels
- [ ] PR créée vers `develop`

---

# 👤 P4 — Registry Harbor & GitOps ArgoCD

## Rôle
Déployer Harbor comme registre d'images Docker et ArgoCD pour le déploiement continu GitOps.

## Prérequis
- K3s fonctionnel (dépend de P3)
- Helm 3.x
- `kubectl` configuré

## Étapes Détaillées

### Étape 1 — Cloner et créer sa branche
```bash
# Pour omnipay-app
git clone https://github.com/achmaouiayoub120-beep/omnipay-app.git
cd omnipay-app && git checkout develop
git checkout -b feature/harbor-argocd

# Cloner aussi omnipay-gitops
cd ..
git clone https://github.com/achmaouiayoub120-beep/omnipay-gitops.git
```

### Étape 2 — Installer Harbor via Helm
```bash
# Ajouter le repo Helm Harbor
helm repo add harbor https://helm.goharbor.io
helm repo update

# Créer le namespace
kubectl create namespace harbor

# Installer Harbor
helm install harbor harbor/harbor \
  --namespace harbor \
  --set expose.type=nodePort \
  --set expose.tls.enabled=false \
  --set externalURL=http://harbor.omnipay.local:30002 \
  --set harborAdminPassword=HarborAdmin2026! \
  --set persistence.enabled=false

# Vérifier
kubectl get pods -n harbor
```

> ⚠️ **Note :** `persistence.enabled=false` est acceptable pour la simulation académique. En production, activer le stockage persistant.

### Étape 3 — Configurer Harbor
1. Accéder à l'interface : `http://<IP_NODE>:30002`
2. Se connecter : `admin` / `HarborAdmin2026!`
3. Créer un projet : `omnipay`
4. Créer un compte robot : `robot-omnipay-ci` avec permission push/pull sur le projet `omnipay`

### Étape 4 — Tester le push d'une image
```bash
# Tagger l'image (une fois P2 a créé les images)
docker tag omnipay/auth-service:latest harbor.omnipay.local:30002/omnipay/auth-service:latest

# Se connecter à Harbor
docker login harbor.omnipay.local:30002 -u robot-omnipay-ci

# Pousser
docker push harbor.omnipay.local:30002/omnipay/auth-service:latest
```

### Étape 5 — Installer ArgoCD via Helm
```bash
kubectl create namespace argocd

helm repo add argo https://argoproj.github.io/argo-helm
helm repo update

helm install argocd argo/argo-cd \
  --namespace argocd \
  --set server.service.type=NodePort

# Récupérer le mot de passe admin
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

### Étape 6 — Configurer ArgoCD pour GitOps
Créer l'Application ArgoCD dans `omnipay-gitops/platform/argocd/application-dev.yaml` :
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: omnipay-dev
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/achmaouiayoub120-beep/omnipay-gitops.git
    targetRevision: main
    path: envs/dev
  destination:
    server: https://kubernetes.default.svc
    namespace: omnipay-dev
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

### Étape 7 — Préparer les manifestes GitOps
Dans `omnipay-gitops/envs/dev/`, créer les manifestes Kubernetes pour chaque service :

`omnipay-gitops/envs/dev/auth-deployment.yaml` :
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
  namespace: omnipay-dev
  labels:
    app: auth-service
spec:
  replicas: 1
  selector:
    matchLabels:
      app: auth-service
  template:
    metadata:
      labels:
        app: auth-service
    spec:
      containers:
        - name: auth-service
          image: harbor.omnipay.local:30002/omnipay/auth-service:latest
          ports:
            - containerPort: 8081
          livenessProbe:
            httpGet:
              path: /api/auth/health
              port: 8081
            initialDelaySeconds: 30
            periodSeconds: 10
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: auth-service
  namespace: omnipay-dev
spec:
  selector:
    app: auth-service
  ports:
    - port: 8081
      targetPort: 8081
  type: ClusterIP
```

> Répéter pour `transaction-deployment.yaml` (port 8082) et `notification-deployment.yaml` (port 8083).

### Étape 8 — Committer et créer les PRs
```bash
# Dans omnipay-app
git add -A
git commit -m "feat(ci): ajouter configuration Harbor et ArgoCD"
git push origin feature/harbor-argocd

# Dans omnipay-gitops
cd ../omnipay-gitops
git checkout -b feature/gitops-manifests
git add -A
git commit -m "feat(gitops): ajouter manifestes K8s et application ArgoCD"
git push origin feature/gitops-manifests
```

### ✅ Critères d'Acceptation P4
- [ ] Harbor est accessible et le projet `omnipay` est créé
- [ ] Le push d'une image Docker vers Harbor réussit
- [ ] ArgoCD est installé et accessible
- [ ] L'Application ArgoCD pointe vers `omnipay-gitops/envs/dev`
- [ ] Les manifestes de déploiement sont prêts pour les 3 services
- [ ] PRs créées sur les deux dépôts

---

# 👤 P5 — Observabilité : Prometheus, Grafana & Monitoring

## Rôle
Déployer la stack d'observabilité : Prometheus pour la collecte de métriques, Grafana pour les dashboards, alertes basiques.

## Prérequis
- K3s fonctionnel (dépend de P3)
- Helm 3.x
- `kubectl` configuré

## Étapes Détaillées

### Étape 1 — Cloner et créer sa branche
```bash
git clone https://github.com/achmaouiayoub120-beep/omnipay-gitops.git
cd omnipay-gitops
git checkout -b feature/monitoring-stack
```

### Étape 2 — Installer kube-prometheus-stack via Helm
```bash
kubectl create namespace monitoring

helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --set grafana.service.type=NodePort \
  --set grafana.adminPassword=GrafanaOmniPay2026! \
  --set prometheus.service.type=NodePort

# Vérifier
kubectl get pods -n monitoring
```

### Étape 3 — Configurer le ServiceMonitor pour les microservices
Créer `platform/monitoring/servicemonitor-omnipay.yaml` :
```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: omnipay-services
  namespace: monitoring
  labels:
    release: monitoring
spec:
  namespaceSelector:
    matchNames:
      - omnipay-dev
      - omnipay-recette
      - omnipay-prod
  selector:
    matchLabels:
      monitored: "true"
  endpoints:
    - port: http
      path: /actuator/prometheus
      interval: 15s
```

### Étape 4 — Dashboard Grafana
Créer `platform/monitoring/grafana-dashboard-omnipay.json` avec un dashboard contenant :
- **Panel 1 :** Nombre de requêtes HTTP par service (rate)
- **Panel 2 :** Temps de réponse moyen (histogram)
- **Panel 3 :** Utilisation CPU/RAM par pod
- **Panel 4 :** Statut des health checks

> 💡 **Astuce :** Importer le dashboard ID `4701` (JVM Micrometer) depuis grafana.com comme base, puis le personnaliser.

### Étape 5 — Règles d'alerte Prometheus
Créer `platform/monitoring/alertrules-omnipay.yaml` :
```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: omnipay-alerts
  namespace: monitoring
  labels:
    release: monitoring
spec:
  groups:
    - name: omnipay.rules
      rules:
        - alert: ServiceDown
          expr: up{namespace=~"omnipay-.*"} == 0
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "Service {{ $labels.job }} est DOWN"
            description: "Le service {{ $labels.job }} dans {{ $labels.namespace }} ne répond pas depuis 1 minute."

        - alert: HighErrorRate
          expr: rate(http_server_requests_seconds_count{status=~"5..",namespace=~"omnipay-.*"}[5m]) > 0.1
          for: 2m
          labels:
            severity: warning
          annotations:
            summary: "Taux d'erreur élevé sur {{ $labels.job }}"

        - alert: HighMemoryUsage
          expr: container_memory_working_set_bytes{namespace=~"omnipay-.*"} / container_spec_memory_limit_bytes > 0.85
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Utilisation mémoire > 85% pour {{ $labels.pod }}"
```

### Étape 6 — Ajouter la dépendance Prometheus aux microservices
> **Coordonner avec P2** : Demander d'ajouter la dépendance suivante dans chaque `pom.xml` de service :
```xml
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-registry-prometheus</artifactId>
</dependency>
```
Et dans chaque `application.yml` :
```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  metrics:
    export:
      prometheus:
        enabled: true
```

### Étape 7 — Vérifier l'installation
```bash
# Prometheus
kubectl port-forward -n monitoring svc/monitoring-kube-prometheus-prometheus 9090:9090 &
# Accéder : http://localhost:9090 — Vérifier les targets

# Grafana
kubectl port-forward -n monitoring svc/monitoring-grafana 3000:80 &
# Accéder : http://localhost:3000 — admin / GrafanaOmniPay2026!
```

### Étape 8 — Committer et créer la PR
```bash
git add -A
git commit -m "feat(monitoring): deployer Prometheus, Grafana et alertes OmniPay"
git push origin feature/monitoring-stack
```

### ✅ Critères d'Acceptation P5
- [ ] Prometheus est déployé et collecte les métriques du cluster
- [ ] Grafana est accessible avec le dashboard OmniPay
- [ ] ServiceMonitor cible les namespaces `omnipay-*`
- [ ] Au moins 3 règles d'alerte sont configurées
- [ ] Les métriques Spring Boot Actuator sont exposées (coordination P2)
- [ ] PR créée vers `main` sur `omnipay-gitops`

---

# 🔗 Matrice de Dépendances entre les Rôles

| Tâche | Dépend de | Bloque |
|-------|-----------|--------|
| P2 : Microservices | — (autonome) | P4 (images Docker), P5 (métriques Actuator) |
| P3 : K3s + Terraform | — (autonome) | P4 (cluster requis), P5 (cluster requis) |
| P4 : Harbor | P3 (cluster K3s) | Pipeline CI complet (push images) |
| P4 : ArgoCD | P3 (cluster K3s), P2 (images) | Déploiement automatisé |
| P5 : Prometheus/Grafana | P3 (cluster K3s) | — |
| P5 : Métriques services | P2 (dépendance Micrometer) | — |
| P1 : Pipeline CI complet | P2 (pom.xml), P4 (Harbor) | — |

## Ordre de priorité recommandé
```
Semaine 2 :
  P2 + P3 travaillent en PARALLÈLE (aucune dépendance mutuelle)
  P1 met à jour le pipeline dès que P2 fournit les pom.xml

Semaine 3 :
  P4 dès que P3 a terminé K3s
  P5 dès que P3 a terminé K3s
  P4 intègre les images P2 dans Harbor
  P1 finalise le pipeline CI complet (build → Harbor → ArgoCD)
```

---

# 📅 Planning Résumé

| Jour | P1 (CI/CD) | P2 (Backend) | P3 (Infra) | P4 (Harbor/ArgoCD) | P5 (Monitoring) |
|------|-----------|--------------|------------|-------------------|----------------|
| J1 | Mettre à jour Jenkinsfile pour Maven | Init projet Maven parent | Installer K3s | Préparer les Helm values | Étudier kube-prometheus-stack |
| J2 | Intégrer SonarQube au pipeline | Auth Service complet | Terraform namespaces | Installer Harbor | Installer Prometheus |
| J3 | Tests pipeline avec vrais builds | Transaction Service | Ansible playbook | Configurer Harbor (projet, robot) | Installer Grafana |
| J4 | Étape Harbor dans pipeline | Notification Service | Vérifications finales | Installer ArgoCD | ServiceMonitor + alertes |
| J5 | Pipeline complet end-to-end | Dockerfiles + tests | PR + documentation | Manifestes GitOps | Dashboard + PR |

---

# ⚠️ Règles de Travail pour Tous

1. **Conventional Commits** obligatoires : `feat(scope):`, `fix(scope):`, `docs(scope):`, `ci(scope):`
2. **Jamais de push direct** sur `main` ou `develop` — toujours via Pull Request
3. **Zéro secret** dans le code — utiliser des variables d'environnement
4. **Tester avant de committer** — ne pas pousser du code cassé
5. **Documenter** — chaque PR doit avoir une description claire
6. **Communiquer** — signaler les blocages immédiatement dans le groupe

---

> **Document préparé par P1 (Chef Technique) — OmniPay Zero-Trust — ESTC 2026**
