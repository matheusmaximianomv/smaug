"use client";

import { useMutation } from "@tanstack/react-query";
import { AuthService } from "../services/AuthService";
import type { RegisterInput } from "../types";

export function useRegister() {
  return useMutation({
    mutationFn: (data: RegisterInput) => AuthService.register(data),
  });
}
