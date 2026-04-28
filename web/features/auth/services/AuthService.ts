import { apiClient } from "@/infra/api-client";
import type { User, RegisterInput } from "../types";

export const AuthService = {
  register: async (data: RegisterInput): Promise<User> => {
    const response = await apiClient.post("/users", data);
    return response.data;
  },

  getUserById: async (userId: string): Promise<User> => {
    const response = await apiClient.get(`/users/${userId}`);
    return response.data;
  },
};
