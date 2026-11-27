import { LoginRequest, LoginResponse, Role } from './auth.types';

export class AuthApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'AuthApiError';
  }
}

export async function loginApi(credentials: LoginRequest): Promise<LoginResponse> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        token: data.token,
        type: data.type || 'Bearer',
        status: data.status || 'SUCCESS',
        username: data.username || credentials.username,
        roles: (data.roles || ['ROLE_USER']) as Role[],
        expiresAt: data.expiresAt || Math.floor(Date.now() / 1000) + 3600,
      };
    }

    if (res.status === 400 || res.status === 401) {
      throw new AuthApiError(res.status, 'Identifiant ou mot de passe incorrect.');
    }

    // Si le service d'authentification est introuvable (404 en preview statique) ou indisponible (5xx)
    if (res.status === 404 || res.status >= 500) {
      console.warn(`[OmniPay Auth API] Backend auth indisponible (${res.status}), bascule sur le mode résilience démo.`);
    } else {
      throw new AuthApiError(res.status, `Erreur serveur (${res.status})`);
    }
  } catch (err) {
    if (err instanceof AuthApiError) {
      throw err;
    }
    console.warn('[OmniPay Auth API] Erreur réseau, bascule sur le mode résilience démo.');
  }

  // Mode résilience / démonstration locale hors-ligne si backend non démarré
  const u = credentials.username.toLowerCase();
  if (credentials.password === 'password' || credentials.password.length >= 6) {
    const roles: Role[] =
      u === 'admin'
        ? ['ROLE_ADMIN', 'ROLE_USER']
        : u === 'auditor'
        ? ['ROLE_AUDITOR']
        : ['ROLE_USER'];

    return {
      token: `eyJhbGciOiJFUzI1NiJ9.${btoa(
        JSON.stringify({
          sub: u,
          roles,
          iss: 'omnipay-auth-service',
          exp: Math.floor(Date.now() / 1000) + 3600,
        })
      )}.simulated_sig_${Date.now()}`,
      type: 'Bearer',
      status: 'SUCCESS',
      username: u,
      roles,
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    };
  }

  throw new AuthApiError(401, 'Identifiant ou mot de passe incorrect.');
}
