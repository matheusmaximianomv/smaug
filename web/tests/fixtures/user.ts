import type { User } from "@/features/auth/types";
import { FIXED_DATE, fixtureUuid } from "./ids";

export function makeUser(o: Partial<User> = {}): User {
  return {
    id: fixtureUuid(1),
    name: "Maria Souza",
    email: "maria@example.com",
    createdAt: FIXED_DATE,
    ...o,
  };
}
