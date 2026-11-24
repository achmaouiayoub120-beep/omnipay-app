# ==============================================================================
# OmniPay Zero-Trust - Modern Multi-Stage Dockerfile (React 18 + Vite + TS)
# Non-root runtime (UID 101), port 8080, compatible Pod Security Standards "restricted"
# ==============================================================================

# --- Stage 1 : Build de l'application React Vite en Node 20 ---
FROM node:20-alpine AS builder
WORKDIR /app

# Optimisation du cache de couches Docker
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

# Copie des sources et compilation de production
COPY . .
RUN npm run build

# Durcissement des permissions des fichiers générés (lecture seule 0555/0444)
RUN find dist -type d -exec chmod 0555 {} + \
    && find dist -type f -exec chmod 0444 {} +

# --- Stage 2 : Runtime Nginx Unprivileged durci ---
FROM nginxinc/nginx-unprivileged:1.27-alpine

COPY nginx.conf /etc/nginx/nginx.conf
COPY upstreams.conf /etc/nginx/upstreams.conf
COPY --from=builder /app/dist/ /usr/share/nginx/html/

USER 101
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD ["wget", "-q", "--spider", "http://127.0.0.1:8080/health"]
