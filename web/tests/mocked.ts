import { vi, type Mock } from "vitest";

/** Cada método vira um `vi.fn()` que continua satisfazendo a assinatura original. */
export type Mocked<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R ? Mock<(...args: A) => R> : T[K];
};

/**
 * Auto-mocka todo método de um service literal, preservando os tipos.
 * Adaptado de `server/tests/helpers/repository-mocks.ts`.
 *
 * Política: services e testes de integração usam MSW (axios + interceptors
 * reais). `mockService` é para testes de HOOK cujo assunto é a fiação do hook
 * (query key, invalidação, mensagem de toast, callback de retry) e não o
 * transporte.
 */
export function mockService<T extends object>(
  real: T,
  overrides: Partial<Mocked<T>> = {},
): Mocked<T> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(real)) {
    const value = (real as Record<string, unknown>)[key];
    out[key] = typeof value === "function" ? vi.fn() : value;
  }
  return Object.assign(out, overrides) as Mocked<T>;
}
