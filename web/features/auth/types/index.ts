export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

/** Corpo de `POST /auth/register` e `POST /auth/login`: a sessão aberta e o perfil. */
export interface AuthSessionResponse {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  user: User;
}
