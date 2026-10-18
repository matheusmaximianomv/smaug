import { apiClient } from "@/infra/api-client";
import type { AuthSessionResponse, LoginInput, RegisterInput, User } from "../types";

export const AuthService = {
  register: async (data: RegisterInput): Promise<AuthSessionResponse> => {
    const { data: session } = await apiClient.post("/auth/register", data);
    return session;
  },

  login: async (payload: LoginInput): Promise<AuthSessionResponse> => {
    const { data } = await apiClient.post("/auth/login", payload);
    return data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post("/auth/logout");
  },

  logoutAll: async (): Promise<void> => {
    await apiClient.post("/auth/logout-all");
  },

  getMe: async (): Promise<User> => {
    const { data } = await apiClient.get("/users/me");
    return data;
  },
};
