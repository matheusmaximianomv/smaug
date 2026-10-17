/** Mesma origem que `infra/api-client.ts` resolve a partir de NEXT_PUBLIC_API_URL. */
export const API = "http://localhost:3000";

export const url = (path: string): string => `${API}${path}`;

/**
 * "Agora" do servidor simulado: o mês corrente em UTC, lido do relógio a cada
 * resposta. Testes que dependem da situação das competências congelam o `Date`
 * (`freezeDateOnly`) — sem isso o resultado mudaria com a data real.
 */
export function serverReference(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}
