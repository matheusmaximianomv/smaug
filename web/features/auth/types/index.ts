export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  userId: string | null;
  isAuthenticated: boolean;
}

export interface RegisterInput {
  name: string;
  email: string;
}

export interface LoginInput {
  userId: string;
}
