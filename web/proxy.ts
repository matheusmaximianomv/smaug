import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/login", "/cadastro"];

/**
 * Indicador de sessão escrito por `infra/session.ts`. Não é credencial — o refresh token fica no
 * cookie `httpOnly` da API —, só decide a rota: se divergir do estado real, a renovação recusada
 * apaga o indicador antes de mandar para `/login`, sem laço.
 */
const SESSION_HINT_COOKIE = "smaug_session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  const hasSession = request.cookies.get(SESSION_HINT_COOKIE)?.value === "1";

  if (!isPublic && !hasSession) {
    // Leva a rota pretendida em `?next=` para o login devolver o usuário a ela (design D8). A raiz
    // não vai: depois do login ela cairia em `/dashboard` de qualquer jeito.
    const login = new URL("/login", request.url);
    if (pathname !== "/") login.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(login);
  }

  if (isPublic && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
