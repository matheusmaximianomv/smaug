/**
 * Repasse de mesma origem `/api/*` → `API_ORIGIN/*` (design D6, plano B do spike 1.1 — ver a
 * seção do spike em `specs/010-autenticacao/plan.md`). O navegador só fala com o web; o cookie
 * `smaug_refresh` emitido pela API vira cookie da origem do web.
 *
 * - `API_ORIGIN` (variável de servidor, sem `NEXT_PUBLIC_`) é lido **a cada requisição**: a mesma
 *   imagem serve aos cenários "mesma máquina" e "máquinas diferentes", e `rewrites()` congelaria o
 *   destino no `next build`.
 * - **`API_ORIGIN` ausente → 500 sem corpo, por requisição.** O `next build` não pode exigir a
 *   variável (o destino só existe no start), então ela não é validada ao carregar o módulo; validar
 *   no boot pediria um `instrumentation.ts` só para isso. Um 500 em toda chamada é tão visível
 *   quanto, e o `api-client` o trata como transitório, sem derrubar a sessão.
 * - Destino montado de `request.url`, não de `params.path`: o path decodificado perderia `%2F`/`%20`.
 * - `X-Forwarded-For` vai como o Next o preenche (IP do socket, se o cliente não mandou um); o
 *   rate limit da API depende de um proxy reverso na frente quando o web é exposto.
 * - API inalcançável → 502 sem corpo.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Cabeçalhos de salto (RFC 9110 §7.6.1) e os que o `fetch` recalcula. */
const HOP_BY_HOP = [
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "proxy-connection",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
];

function upstreamRequestHeaders(request: Request): Headers {
  const headers = new Headers(request.headers);
  for (const name of HOP_BY_HOP) headers.delete(name);
  return headers;
}

function downstreamResponseHeaders(upstream: Response): Headers {
  const headers = new Headers();
  // O `fetch` já entrega o corpo descomprimido: repassar `Content-Encoding` mentiria ao navegador.
  upstream.headers.forEach((value, name) => {
    if (name === "set-cookie" || name === "content-encoding" || HOP_BY_HOP.includes(name)) return;
    headers.set(name, value);
  });
  for (const cookie of upstream.headers.getSetCookie()) headers.append("set-cookie", cookie);
  return headers;
}

async function forward(request: Request): Promise<Response> {
  const apiOrigin = process.env.API_ORIGIN?.replace(/\/+$/, "");
  if (!apiOrigin) return new Response(null, { status: 500 });

  const url = new URL(request.url);
  const target = `${apiOrigin}${url.pathname.slice("/api".length)}${url.search}`;
  const hasBody = request.method !== "GET" && request.method !== "HEAD";

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers: upstreamRequestHeaders(request),
      body: hasBody ? await request.arrayBuffer() : undefined,
      redirect: "manual",
      cache: "no-store",
    });
  } catch {
    return new Response(null, { status: 502 });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: downstreamResponseHeaders(upstream),
  });
}

export const GET = forward;
export const HEAD = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
export const OPTIONS = forward;
