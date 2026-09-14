import { afterEach } from "vitest";
import { server } from "./msw";

// `server.resetHandlers()` não desregistra listeners de evento. Registrado no
// import para que todo arquivo que use `recordRequests` limpe os seus.
afterEach(() => {
  server.events.removeAllListeners("request:start");
});

export interface RecordedRequest {
  method: string;
  path: string;
  search: URLSearchParams;
  /** Corpo da requisição, resolvido sob demanda: `JSON.parse(await r.text)`. */
  text: Promise<string>;
  headers: Headers;
}

/**
 * Grava verbo + path de cada requisição que sai pelo axios.
 *
 * A asserção mais valiosa dos testes de service é justamente essa: `PUT` vs
 * `PATCH` e `/:id` vs `/:id/terminate` são fáceis de errar e invisíveis para o
 * TypeScript. O push é síncrono (o MSW emite `request:start` antes de resolver o
 * handler); só a leitura do corpo é assíncrona.
 *
 * `server.events.removeAllListeners()` é responsabilidade do arquivo de teste
 * quando ele registra mais de um gravador.
 */
export function recordRequests(): RecordedRequest[] {
  const calls: RecordedRequest[] = [];

  server.events.on("request:start", ({ request }: { request: Request }) => {
    const url = new URL(request.url);
    calls.push({
      method: request.method,
      path: url.pathname,
      search: url.searchParams,
      text: request.clone().text(),
      headers: request.headers,
    });
  });

  return calls;
}

/** `["POST /users", "GET /users/abc"]` — formato legível para `toEqual`. */
export function signatures(calls: RecordedRequest[]): string[] {
  return calls.map((c) => `${c.method} ${c.path}`);
}

export async function bodyOf(call: RecordedRequest): Promise<unknown> {
  const text = await call.text;
  return text ? JSON.parse(text) : undefined;
}
