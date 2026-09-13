/** Mesma origem que `infra/api-client.ts` resolve a partir de NEXT_PUBLIC_API_URL. */
export const API = "http://localhost:3000";

export const url = (path: string): string => `${API}${path}`;
