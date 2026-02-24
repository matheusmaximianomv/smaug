import { z } from "zod";

export const createUserSchema = z.object({
  name: z
    .string({ error: "Name is required" })
    .min(1, "Name must be between 1 and 255 characters")
    .max(255, "Name must be between 1 and 255 characters"),
  email: z
    .string({ error: "Email is required" })
    .email("Invalid email format"),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;

export interface UserResponseDto {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}
