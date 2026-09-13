import { beforeEach, describe, expect, it } from "vitest";
import { clearUserId, getUserId, setUserId } from "./session";

const UUID = "00000000-0000-4000-8000-000000000001";

/** Remove qualquer cookie deixado por um teste anterior do mesmo arquivo. */
function wipeCookies(): void {
  for (const entry of document.cookie.split("; ")) {
    const name = entry.split("=")[0];
    if (name) document.cookie = `${name}=;path=/;max-age=0`;
  }
}

beforeEach(() => {
  wipeCookies();
});

describe("getUserId", () => {
  it("devolve null quando não há cookie", () => {
    expect(getUserId()).toBeNull();
  });

  it("devolve o id gravado por setUserId", () => {
    setUserId(UUID);

    expect(getUserId()).toBe(UUID);
  });

  it("devolve null quando o cookie existe mas está vazio", () => {
    document.cookie = "userId=;path=/";

    expect(getUserId()).toBeNull();
  });

  it("decodifica o valor quando ele foi gravado URL-encoded", () => {
    document.cookie = `userId=${encodeURIComponent("maria souza@example.com")};path=/`;

    expect(getUserId()).toBe("maria souza@example.com");
  });

  it("encontra o cookie no meio de outros", () => {
    document.cookie = "a=1;path=/";
    document.cookie = `userId=${UUID};path=/`;
    document.cookie = "b=2;path=/";

    expect(document.cookie).toContain("a=1");
    expect(document.cookie).toContain("b=2");
    expect(getUserId()).toBe(UUID);
  });

  it("devolve null quando só existem outros cookies", () => {
    document.cookie = "a=1;path=/";
    document.cookie = "outroUserId=abc;path=/";

    expect(getUserId()).toBeNull();
  });
});

describe("setUserId", () => {
  it("grava o cookie com path, max-age de um ano e SameSite=Lax", () => {
    let written = "";
    const original = Object.getOwnPropertyDescriptor(Document.prototype, "cookie")!;
    Object.defineProperty(document, "cookie", {
      configurable: true,
      set(value: string) {
        written = value;
        original.set!.call(document, value);
      },
      get() {
        return original.get!.call(document);
      },
    });

    try {
      setUserId(UUID);
    } finally {
      delete (document as unknown as Record<string, unknown>).cookie;
    }

    expect(written).toBe(`userId=${UUID};path=/;max-age=31536000;SameSite=Lax`);
  });

  it("codifica o valor antes de gravar", () => {
    setUserId("a b");

    expect(document.cookie).toContain("userId=a%20b");
    expect(getUserId()).toBe("a b");
  });

  it("sobrescreve uma sessão anterior", () => {
    setUserId(UUID);
    setUserId("outro-id");

    expect(getUserId()).toBe("outro-id");
  });
});

describe("clearUserId", () => {
  it("remove a sessão existente", () => {
    setUserId(UUID);

    clearUserId();

    expect(getUserId()).toBeNull();
  });

  it("é no-op quando não há sessão", () => {
    expect(() => clearUserId()).not.toThrow();
    expect(getUserId()).toBeNull();
  });

  it("preserva os demais cookies", () => {
    document.cookie = "a=1;path=/";
    setUserId(UUID);

    clearUserId();

    expect(document.cookie).toContain("a=1");
    expect(getUserId()).toBeNull();
  });
});
