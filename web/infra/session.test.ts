import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearSession, getAccessToken, hasSessionHint, setSession } from "./session";

/** Remove qualquer cookie deixado por um teste anterior do mesmo arquivo. */
function wipeCookies(): void {
  for (const entry of document.cookie.split("; ")) {
    const name = entry.split("=")[0];
    if (name) document.cookie = `${name}=;path=/;max-age=0`;
  }
}

/** Captura o que foi atribuído a `document.cookie` durante `run`. */
function cookieWrites(run: () => void): string[] {
  const writes: string[] = [];
  const original = Object.getOwnPropertyDescriptor(Document.prototype, "cookie")!;
  Object.defineProperty(document, "cookie", {
    configurable: true,
    set(value: string) {
      writes.push(value);
      original.set!.call(document, value);
    },
    get() {
      return original.get!.call(document);
    },
  });
  try {
    run();
  } finally {
    delete (document as unknown as Record<string, unknown>).cookie;
  }
  return writes;
}

beforeEach(() => {
  clearSession();
  wipeCookies();
});

describe("setSession", () => {
  it("guarda o access token em memória", () => {
    setSession("token-1");

    expect(getAccessToken()).toBe("token-1");
  });

  it("escreve só o indicador smaug_session=1, com path, 30 dias e SameSite=Lax", () => {
    const writes = cookieWrites(() => setSession("token-1"));

    expect(writes).toEqual(["smaug_session=1;path=/;max-age=2592000;SameSite=Lax"]);
    expect(hasSessionHint()).toBe(true);
  });

  it("nunca grava o access token em cookie, localStorage ou sessionStorage", () => {
    setSession("token-secreto");

    expect(document.cookie).not.toContain("token-secreto");
    expect(JSON.stringify({ ...localStorage })).not.toContain("token-secreto");
    expect(JSON.stringify({ ...sessionStorage })).not.toContain("token-secreto");
  });

  it("substitui o token anterior", () => {
    setSession("token-1");
    setSession("token-2");

    expect(getAccessToken()).toBe("token-2");
  });
});

describe("clearSession", () => {
  it("esquece o token e apaga o indicador", () => {
    setSession("token-1");

    clearSession();

    expect(getAccessToken()).toBeNull();
    expect(hasSessionHint()).toBe(false);
  });

  it("preserva os demais cookies", () => {
    document.cookie = "a=1;path=/";
    setSession("token-1");

    clearSession();

    expect(document.cookie).toContain("a=1");
  });

  it("é no-op quando não há sessão", () => {
    expect(() => clearSession()).not.toThrow();
    expect(getAccessToken()).toBeNull();
  });
});

describe("hasSessionHint", () => {
  it("é falso sem cookie", () => {
    expect(hasSessionHint()).toBe(false);
  });

  it("acha o indicador no meio de outros cookies", () => {
    document.cookie = "a=1;path=/";
    document.cookie = "smaug_session=1;path=/";
    document.cookie = "b=2;path=/";

    expect(hasSessionHint()).toBe(true);
  });

  it.each(["smaug_session=", "smaug_session=0", "outro_smaug_session=1"])(
    "não aceita %s como indicador",
    (cookie) => {
      document.cookie = `${cookie};path=/`;

      expect(hasSessionHint()).toBe(false);
    },
  );

  it("não depende do token em memória: a aba recarregada tem só o indicador", () => {
    document.cookie = "smaug_session=1;path=/";

    expect(getAccessToken()).toBeNull();
    expect(hasSessionHint()).toBe(true);
  });
});

describe("cookie userId legado", () => {
  it("é apagado ao carregar o módulo e não conta como sessão", async () => {
    document.cookie = "userId=00000000-0000-4000-8000-000000000001;path=/";
    vi.resetModules();

    const fresh = await import("./session");

    expect(document.cookie).not.toContain("userId=");
    expect(fresh.hasSessionHint()).toBe(false);
    expect(fresh.getAccessToken()).toBeNull();
  });
});
