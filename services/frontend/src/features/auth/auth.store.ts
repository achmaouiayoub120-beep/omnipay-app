import { create } from 'zustand';
import { AuthState, LoginRequest, Role } from './auth.types';
import { loginApi } from './auth.api';

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  isAuthenticated: false,
  requiresMfa: false,
  pendingUsername: null,
  pendingResponse: null,
  sessionRemainingSeconds: 0,

  login: async (req: LoginRequest) => {
    const res = await loginApi(req);
    // Dans notre architecture bancaire Zero-Trust, l'authentification forte (MFA)
    // est requise pour finaliser la création de session.
    set({
      requiresMfa: true,
      pendingUsername: res.username,
      pendingResponse: res,
    });
  },

  verifyMfa: async (code: string) => {
    const { pendingResponse } = get();
    if (!pendingResponse) {
      throw new Error('Aucune demande d’authentification en attente.');
    }

    // Le code doit être un code à 6 chiffres
    if (!/^[0-9]{6}$/.test(code)) {
      throw new Error('Le code MFA doit comporter 6 chiffres.');
    }

    // Validation du code MFA (dans la simulation, n'importe quel code à 6 chiffres est accepté)
    const now = Math.floor(Date.now() / 1000);
    const ttl = Math.max(0, pendingResponse.expiresAt - now);

    set({
      session: {
        username: pendingResponse.username,
        roles: pendingResponse.roles as Role[],
        token: pendingResponse.token,
        expiresAt: pendingResponse.expiresAt,
      },
      isAuthenticated: true,
      requiresMfa: false,
      pendingUsername: null,
      pendingResponse: null,
      sessionRemainingSeconds: ttl,
    });
  },

  logout: () => {
    set({
      session: null,
      isAuthenticated: false,
      requiresMfa: false,
      pendingUsername: null,
      pendingResponse: null,
      sessionRemainingSeconds: 0,
    });
  },

  updateRemainingTime: () => {
    const { session, logout } = get();
    if (!session) return;

    const now = Math.floor(Date.now() / 1000);
    const remaining = session.expiresAt - now;

    if (remaining <= 0) {
      logout();
    } else {
      set({ sessionRemainingSeconds: remaining });
    }
  },
}));
