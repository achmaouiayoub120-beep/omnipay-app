# Portail web OmniPay : Nginx non-root (UID 101), port 8080, compatible Pod Security Standards "restricted".
# Build : docker build -t omnipay/frontend-service services/frontend   (le contexte est le dossier du service)

# --- Etape 1 : verification et preparation des fichiers statiques (lecture seule) ---
FROM alpine:3.20 AS assets
WORKDIR /site
COPY src/ ./
RUN test -f index.html && test -f app.js && test -f styles.css \
    && find . -type d -exec chmod 0555 {} + \
    && find . -type f -exec chmod 0444 {} +

# --- Etape 2 : image d'execution ---
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY nginx.conf /etc/nginx/nginx.conf
COPY upstreams.conf /etc/nginx/upstreams.conf
COPY --from=assets /site/ /usr/share/nginx/html/

USER 101
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD ["wget", "-q", "--spider", "http://127.0.0.1:8080/health"]
