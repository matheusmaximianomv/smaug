import { fixtureUuid } from "./fixtures";

/**
 * `infra/session.ts` é `document.cookie` puro — não mockamos, para que o
 * interceptor de request do api-client exercite a leitura real.
 * `vi.mock("@/infra/session")` fica reservado para asserções sobre `clearUserId`.
 */
export function loginAs(userId: string = fixtureUuid(1)): string {
  document.cookie = `userId=${encodeURIComponent(userId)};path=/`;
  return userId;
}

export function logout(): void {
  document.cookie = "userId=;path=/;max-age=0";
}
