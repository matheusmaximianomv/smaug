/**
 * Ids determinísticos e sequenciais. Nada de Math.random/faker: um teste que
 * falha precisa falhar com a mesma mensagem na próxima execução.
 * `resetFixtureIds()` roda no afterEach global.
 */
let seq = 0;

export function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}-${String(seq).padStart(3, "0")}`;
}

export function resetFixtureIds(): void {
  seq = 0;
}

/** UUID v4 válido e estável — o middleware e a API exigem formato UUID. */
export function fixtureUuid(n = 1): string {
  const tail = String(n).padStart(12, "0");
  return `00000000-0000-4000-8000-${tail}`;
}

export const FIXED_DATE = "2026-01-01T00:00:00.000Z";
