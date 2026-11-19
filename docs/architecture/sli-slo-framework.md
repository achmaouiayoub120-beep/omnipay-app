# Cadrage SRE — Matrice SLI / SLO / Golden Signals

> **Projet** : OmniPay Zero-Trust — Mini-banque en ligne (ESTC)  
> **Rôle** : P5 — Fiabilité, Observabilité & Retour d'expérience  
> **Version** : 1.0.0 — Semaine 1  
> **Statut** : Proposé (enforcement SLO en Semaine 2)

---

## 1. Introduction

Ce document formalise le cadre SRE (Site Reliability Engineering) appliqué à la plateforme OmniPay Zero-Trust. Il définit les **Service Level Indicators (SLI)**, les **Service Level Objectives (SLO)** préliminaires, et leur alignement avec les **4 Golden Signals** de Google SRE.

### 1.1 Périmètre des microservices

| Microservice | Port | Package Java | Endpoints principaux |
|---|---|---|---|
| **Auth Service** | 8081 | `com.omnipay.auth` | `POST /api/auth/login`, `GET /api/auth/health` |
| **Transaction Service** | 8082 | `com.omnipay.transaction` | `POST /api/transactions/transfer`, `GET /api/transactions/health` |
| **Notification Service** | 8083 | `com.omnipay.notification` | `POST /api/notifications/send`, `GET /api/notifications/health` |

### 1.2 Sources de métriques

- **Métriques applicatives** : Spring Boot Actuator + Micrometer Registry Prometheus (`/actuator/prometheus`)
- **Métriques infrastructure** : `node-exporter`, `kube-state-metrics`, `cAdvisor` (via kube-prometheus-stack)
- **Collecte** : Prometheus Operator avec `ServiceMonitor` (intervalle de scrape : 15 s)

---

## 2. Les 4 Golden Signals appliqués à OmniPay

### 2.1 Latence (Latency)

> *Temps nécessaire pour traiter une requête.*

**Contexte OmniPay** : Un temps de réponse élevé sur le login (`/api/auth/login`) ou les virements (`/api/transactions/transfer`) dégrade directement l'expérience utilisateur et peut provoquer des doublons de transactions (retry côté client).

**Métriques clés** :
- Percentile P95 et P99 du temps de réponse HTTP
- Distinction entre requêtes réussies et en erreur

### 2.2 Trafic (Traffic)

> *Volume de demandes traitées par le système.*

**Contexte OmniPay** : Le débit de transactions est l'indicateur business principal. Une chute soudaine du trafic peut signaler une panne en amont (gateway, auth).

**Métriques clés** :
- Requêtes HTTP par seconde (RPS) par service et par endpoint
- Nombre de transactions financières par seconde

### 2.3 Erreurs (Errors)

> *Taux de requêtes qui échouent.*

**Contexte OmniPay** : Dans un contexte bancaire, même un taux d'erreur de 0.1 % sur les virements est inacceptable. Les erreurs 5xx signalent des défaillances internes pouvant entraîner des pertes financières.

**Métriques clés** :
- Taux de réponses HTTP 5xx (erreurs serveur)
- Taux de réponses HTTP 4xx (erreurs client — surveillance secondaire)

### 2.4 Saturation (Saturation)

> *Degré d'utilisation des ressources par rapport à leur capacité maximale.*

**Contexte OmniPay** : Un pod proche de ses limites CPU ou mémoire sera throttled ou OOMKilled par Kubernetes, provoquant une interruption de service.

**Métriques clés** :
- Utilisation mémoire heap JVM (% de la mémoire max)
- Utilisation CPU du conteneur (% des limits Kubernetes)
- Threads JVM actifs

---

## 3. Matrice complète des SLI par microservice

### 3.1 Auth Service (`auth-service`, port 8081)

| # | Signal | Indicateur (SLI) | Requête PromQL | SLO cible (S2) |
|---|---|---|---|---|
| A1 | **Erreurs** | Taux de requêtes HTTP 5xx | `sum(rate(http_server_requests_seconds_count{status=~"5..",application="auth-service"}[5m])) / sum(rate(http_server_requests_seconds_count{application="auth-service"}[5m]))` | < 0.1 % |
| A2 | **Latence** | P95 latence — `/api/auth/login` | `histogram_quantile(0.95, sum(rate(http_server_requests_seconds_bucket{uri="/api/auth/login",application="auth-service"}[5m])) by (le))` | < 200 ms |
| A3 | **Latence** | P99 latence — `/api/auth/login` | `histogram_quantile(0.99, sum(rate(http_server_requests_seconds_bucket{uri="/api/auth/login",application="auth-service"}[5m])) by (le))` | < 500 ms |
| A4 | **Trafic** | Débit RPS global | `sum(rate(http_server_requests_seconds_count{application="auth-service"}[1m]))` | Suivi baseline |
| A5 | **Saturation** | Utilisation heap JVM | `jvm_memory_used_bytes{area="heap",application="auth-service"} / jvm_memory_max_bytes{area="heap",application="auth-service"}` | < 80 % |
| A6 | **Saturation** | CPU pod | `rate(container_cpu_usage_seconds_total{container="auth-service"}[5m]) / on(pod) kube_pod_container_resource_limits{resource="cpu",container="auth-service"}` | < 70 % |
| A7 | **Saturation** | Threads JVM actifs | `jvm_threads_live_threads{application="auth-service"}` | < 200 |

### 3.2 Transaction Service (`transaction-service`, port 8082)

| # | Signal | Indicateur (SLI) | Requête PromQL | SLO cible (S2) |
|---|---|---|---|---|
| T1 | **Erreurs** | Taux de requêtes HTTP 5xx | `sum(rate(http_server_requests_seconds_count{status=~"5..",application="transaction-service"}[5m])) / sum(rate(http_server_requests_seconds_count{application="transaction-service"}[5m]))` | < 0.05 % |
| T2 | **Erreurs** | Taux d'échec virements | `sum(rate(http_server_requests_seconds_count{status=~"5..",uri="/api/transactions/transfer",application="transaction-service"}[5m])) / sum(rate(http_server_requests_seconds_count{uri="/api/transactions/transfer",application="transaction-service"}[5m]))` | < 0.01 % |
| T3 | **Latence** | P95 latence — `/api/transactions/transfer` | `histogram_quantile(0.95, sum(rate(http_server_requests_seconds_bucket{uri="/api/transactions/transfer",application="transaction-service"}[5m])) by (le))` | < 300 ms |
| T4 | **Latence** | P99 latence — `/api/transactions/transfer` | `histogram_quantile(0.99, sum(rate(http_server_requests_seconds_bucket{uri="/api/transactions/transfer",application="transaction-service"}[5m])) by (le))` | < 800 ms |
| T5 | **Trafic** | Débit RPS virements | `sum(rate(http_server_requests_seconds_count{uri="/api/transactions/transfer",application="transaction-service"}[1m]))` | Suivi baseline |
| T6 | **Saturation** | Utilisation heap JVM | `jvm_memory_used_bytes{area="heap",application="transaction-service"} / jvm_memory_max_bytes{area="heap",application="transaction-service"}` | < 80 % |
| T7 | **Saturation** | Connexions DB actives | `hikaricp_connections_active{application="transaction-service"}` | < 80 % du pool |

### 3.3 Notification Service (`notification-service`, port 8083)

| # | Signal | Indicateur (SLI) | Requête PromQL | SLO cible (S2) |
|---|---|---|---|---|
| N1 | **Erreurs** | Taux de requêtes HTTP 5xx | `sum(rate(http_server_requests_seconds_count{status=~"5..",application="notification-service"}[5m])) / sum(rate(http_server_requests_seconds_count{application="notification-service"}[5m]))` | < 0.5 % |
| N2 | **Latence** | P95 latence — `/api/notifications/send` | `histogram_quantile(0.95, sum(rate(http_server_requests_seconds_bucket{uri="/api/notifications/send",application="notification-service"}[5m])) by (le))` | < 500 ms |
| N3 | **Trafic** | Débit RPS global | `sum(rate(http_server_requests_seconds_count{application="notification-service"}[1m]))` | Suivi baseline |
| N4 | **Saturation** | Utilisation heap JVM | `jvm_memory_used_bytes{area="heap",application="notification-service"} / jvm_memory_max_bytes{area="heap",application="notification-service"}` | < 80 % |
| N5 | **Saturation** | Threads JVM actifs | `jvm_threads_live_threads{application="notification-service"}` | < 150 |

---

## 4. Synthèse des SLO préliminaires

| Service | SLO | Objectif | Budget d'erreur (30j) | Priorité |
|---|---|---|---|---|
| Auth Service | Disponibilité | 99.9 % | 43.2 min | 🔴 Critique |
| Auth Service | Latence P95 login | < 200 ms | — | 🟠 Haute |
| Transaction Service | Disponibilité | 99.95 % | 21.6 min | 🔴 Critique |
| Transaction Service | Latence P95 virement | < 300 ms | — | 🔴 Critique |
| Transaction Service | Taux d'échec virement | < 0.01 % | — | 🔴 Critique |
| Notification Service | Disponibilité | 99.5 % | 3.6 h | 🟡 Moyenne |

### 4.1 Calcul du budget d'erreur

```
budget_erreur = (1 - SLO) × fenêtre_totale
```

**Exemple — Transaction Service (SLO = 99.95 %)** :
```
budget = (1 - 0.9995) × 30 × 24 × 60 = 0.0005 × 43 200 = 21.6 minutes
```

---

## 5. Métriques d'infrastructure (couche cluster)

| Signal | Métrique | PromQL | Seuil d'alerte |
|---|---|---|---|
| Saturation | CPU nœud | `1 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) by (instance)` | > 85 % |
| Saturation | Mémoire nœud | `1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)` | > 90 % |
| Saturation | Disque nœud | `1 - (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"})` | > 85 % |
| Erreurs | Pods CrashLoop | `kube_pod_container_status_waiting_reason{reason="CrashLoopBackOff"}` | > 0 |

---

## 6. Exigences transmises à P2 (Développement)

Chaque microservice **DOIT** inclure :

**Dépendances Maven** (`pom.xml`) :
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-registry-prometheus</artifactId>
</dependency>
```

**Configuration** (`application.yml`) :
```yaml
spring:
  application:
    name: auth-service  # ou transaction-service, notification-service
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  prometheus:
    metrics:
      export:
        enabled: true
  metrics:
    tags:
      application: ${spring.application.name}
```

**Labels Kubernetes** (Service) :
```yaml
metadata:
  labels:
    monitored: "true"
spec:
  ports:
    - name: http
      port: 808x
      targetPort: 808x
```

---

## 7. Références

- [Google SRE Book — Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)
- [Google SRE Workbook — Implementing SLOs](https://sre.google/workbook/implementing-slos/)
- [Micrometer Prometheus Registry](https://micrometer.io/docs/registry/prometheus)
- [Spring Boot Actuator](https://docs.spring.io/spring-boot/docs/current/reference/html/actuator.html)
- [kube-prometheus-stack Helm Chart](https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack)
