import { vi } from "vitest";

/** TZ=UTC vem de `test.env` no vitest.config.ts — datas são determinísticas. */
export const NOW = new Date("2026-09-13T12:00:00.000Z");

/** Competência correspondente a NOW. */
export const NOW_COMPETENCE = { year: 2026, month: 9 } as const;

/**
 * Congela o relógio. Lembre que `shared/lib/competence.ts` aceita `reference`
 * explícito na maioria das funções — prefira passar a referência a congelar o
 * relógio quando for possível.
 */
export function freezeTime(date: Date = NOW): void {
  vi.useFakeTimers();
  vi.setSystemTime(date);
}

/**
 * Congela só o `Date`, deixando `setTimeout`/`setInterval` reais.
 *
 * É o que testes com MSW + axios precisam: `vi.setSystemTime` exige timers
 * falsos, mas falsear os timers de verdade trava o transporte HTTP.
 */
export function freezeDateOnly(date: Date = NOW): void {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(date);
}

export function unfreezeTime(): void {
  vi.useRealTimers();
}
