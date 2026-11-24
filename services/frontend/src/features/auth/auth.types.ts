/**
 * Types stricts pour l'authentification et les sessions OmniPay
 */

export type Role = 'ROLE_USER' | 'ROLE_ADMIN' | 'ROLE_AUDITOR';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  type: string;
  status: string;
  username: string;
  roles: Role[];
  expiresAt: number; // timestamp en secondes
}

export interface UserSession {
  username: string;
  roles: Role[];
  token: string;
  expiresAt: number; // epoch seconds
}

export interface AuthState {
  session: UserSession | null;
  isAuthenticated: boolean;
  requiresMfa: boolean;
  pendingUsername: string | null;
  pendingResponse: LoginResponse | null;
  sessionRemainingSeconds: number;
  login: (req: LoginRequest) => Promise<void>;
  verifyMfa: (code: string) => Promise<void>;
  logout: () => void;
  updateRemainingTime: () => void;
}
