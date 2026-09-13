import { delay, http, HttpResponse } from "msw";
import { server } from "./server";
import { url } from "./base";

export { server } from "./server";
export { db, resetDb, seedDb, type Db } from "./db";
export { API, url } from "./base";

type Method = "get" | "post" | "put" | "patch" | "delete";

interface ApiErrorBody {
  error?: string;
  message?: string;
  details?: Record<string, string[]>;
}

/** Sobrescreve uma rota para devolver um erro de negócio da API. */
export function mockApiError(
  method: Method,
  path: string,
  status: number,
  body: ApiErrorBody = {},
): void {
  server.use(http[method](url(path), () => HttpResponse.json(body, { status })));
}

/**
 * Falha de rede. O axios devolve `{ request, response: undefined }` — exatamente
 * a forma que o terceiro ramo de `getApiErrorMessage` verifica.
 */
export function mockNetworkError(method: Method, path: string): void {
  server.use(http[method](url(path), () => HttpResponse.error()));
}

/** Deixa a rota pendente para sempre, para assertar o estado de carregamento. */
export function mockPending(method: Method, path: string): void {
  server.use(
    http[method](url(path), async () => {
      await delay("infinite");
      return HttpResponse.json([]);
    }),
  );
}
