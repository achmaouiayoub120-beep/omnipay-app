# syntax=docker/dockerfile:1.7
# Build context = racine du depot (le POM parent est necessaire) :
#   docker build -f services/transaction/Dockerfile -t omnipay/transaction-service .

# ---------- Stage 1 : build ----------
FROM maven:3.9-eclipse-temurin-21-alpine AS builder
WORKDIR /build

# POM d'abord : les dependances restent en cache tant que les pom.xml ne changent pas
COPY pom.xml ./
COPY services/auth/pom.xml services/auth/pom.xml
COPY services/transaction/pom.xml services/transaction/pom.xml
COPY services/notification/pom.xml services/notification/pom.xml
RUN --mount=type=cache,target=/root/.m2 \
    mvn -B -q -pl services/transaction -am dependency:resolve dependency:resolve-plugins

COPY services/transaction/src services/transaction/src
RUN --mount=type=cache,target=/root/.m2 \
    mvn -B -q -pl services/transaction -am package -DskipTests \
    && cp services/transaction/target/transaction-service-*-SNAPSHOT.jar /build/app.jar

# ---------- Stage 2 : runtime ----------
FROM eclipse-temurin:21-jre-alpine
RUN addgroup -g 10001 -S omnigroup && adduser -u 10001 -S omniuser -G omnigroup
WORKDIR /app
COPY --from=builder --chown=omniuser:omnigroup /build/app.jar app.jar

USER 10001:10001
EXPOSE 8082

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD wget -qO- http://localhost:8082/api/transactions/health || exit 1

ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
