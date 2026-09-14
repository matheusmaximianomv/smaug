import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { cleanup, configure } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// O default de 1s do `waitFor` é apertado demais quando a suíte roda com cobertura: a
// instrumentação do v8 deixa cada worker bem mais lento e os arquivos de integração mais pesados
// estouravam o prazo esperando o MSW responder. Os testes passavam sozinhos e em série, e só
// falhavam sob contenção — sintoma de prazo curto, não de bug.
configure({ asyncUtilTimeout: 5000 });
import { TextDecoder, TextEncoder } from "node:util";
import { ReadableStream, TransformStream, WritableStream } from "node:stream/web";
import { server } from "./tests/msw/server";
import { resetDb } from "./tests/msw/db";
import { drainToasts } from "./tests/toast";
import { resetFixtureIds } from "./tests/fixtures";

// ---------------------------------------------------------------------------
// 1. Globais de stream/encoder que o MSW usa para montar Response.
//    O ambiente jsdom do Vitest ACRESCENTA as chaves do jsdom ao global do Node
//    (não remove as do Node), então na prática elas já existem — definimos
//    defensivamente, a custo zero, para não depender desse detalhe.
// ---------------------------------------------------------------------------
for (const [key, value] of Object.entries({
  TextEncoder,
  TextDecoder,
  ReadableStream,
  TransformStream,
  WritableStream,
})) {
  if (typeof (globalThis as Record<string, unknown>)[key] === "undefined") {
    Object.defineProperty(globalThis, key, { value, writable: true, configurable: true });
  }
}

// ---------------------------------------------------------------------------
// 2. Buracos do jsdom 29. Verificados como AUSENTES: matchMedia,
//    ResizeObserver, IntersectionObserver, hasPointerCapture/setPointerCapture/
//    releasePointerCapture e scrollIntoView.
// ---------------------------------------------------------------------------

// useMediaQuery/useIsMobile → AppShell, Sidebar, BottomNav.
// Desktop por padrão; testes mobile chamam setMatchMedia(true).
let mediaMatches = false;

export function setMatchMedia(matches: boolean): void {
  mediaMatches = matches;
}

/**
 * Alguns arquivos declaram `@vitest-environment node` (middleware, guards de
 * `typeof document === "undefined"`). Este setup roda para eles também, então
 * tudo que depende do DOM fica atrás deste guard.
 */
const hasDom = typeof window !== "undefined";

if (hasDom) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn((query: string) => ({
      media: query,
      get matches() {
        return mediaMatches;
      },
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

Object.defineProperty(globalThis, "ResizeObserver", {
  writable: true,
  configurable: true,
  value: class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
});

Object.defineProperty(globalThis, "IntersectionObserver", {
  writable: true,
  configurable: true,
  value: class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  },
});

// Radix (Dialog/Tabs) + simulação de ponteiro do user-event.
if (hasDom && !Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
}
if (hasDom && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// ---------------------------------------------------------------------------
// 3. Ciclo de vida do MSW.
//    `onUnhandledRequest: "error"` é o ponto central: sem ele, uma requisição
//    não prevista cai no XHR real do jsdom e ou trava até o timeout de 10 s do
//    axios, ou devolve um ECONNREFUSED confuso.
// ---------------------------------------------------------------------------
beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  if (hasDom) cleanup();
  server.resetHandlers();
  resetDb();
  resetFixtureIds();
  drainToasts();
  // O `document` do jsdom é recriado por ARQUIVO, não por teste: sem isto, um
  // setUserId() vaza o header X-User-Id para o teste seguinte.
  if (hasDom) document.cookie = "userId=;path=/;max-age=0;SameSite=Lax";
  vi.unstubAllEnvs();
});

afterAll(() => {
  server.close();
});
