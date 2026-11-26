/**
 * OmniPay Zero-Trust - Base des appels API.
 *
 * Par défaut : chemins RELATIFS (`/api/...`). Le navigateur appelle la même origine que le portail :
 *  - conteneur Nginx (:8080) et Ingress Kubernetes : reverse-proxy `/api/auth/` et `/api/transactions` (voir nginx.conf) ;
 *  - Vite dev (:3000) : proxy défini dans vite.config.ts.
 * Aucun appel inter-origines : le portail fonctionne quel que soit le nom d'hôte utilisé (localhost, IP du poste,
 * nom DNS) sans dépendre de la configuration CORS des microservices.
 *
 * `VITE_API_URL` (build) permet de cibler explicitement un autre hôte, par exemple http://localhost:8082.
 */
export const API_BASE_URL: string =
  (import.meta as unknown as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL?.replace(/\/+$/, '') ?? '';
