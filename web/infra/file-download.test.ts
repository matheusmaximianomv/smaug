import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { downloadBlob, filenameFromContentDisposition } from "./file-download";

describe("downloadBlob", () => {
  const createObjectURL = vi.fn(() => "blob:fake-url");
  const revokeObjectURL = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("cria uma URL a partir do blob", () => {
    const blob = new Blob(["a"], { type: "text/csv" });

    downloadBlob("arquivo.csv", blob);

    expect(createObjectURL).toHaveBeenCalledWith(blob);
  });

  it("dispara o clique em uma âncora com o nome pedido", () => {
    const click = vi.fn();
    const anchor = document.createElement("a");
    anchor.click = click;
    const createElement = vi.spyOn(document, "createElement").mockReturnValue(anchor);

    downloadBlob("smaug-lancamentos-2026-09-14.csv", new Blob(["a"]));

    expect(anchor.download).toBe("smaug-lancamentos-2026-09-14.csv");
    expect(anchor.href).toContain("blob:fake-url");
    expect(click).toHaveBeenCalledTimes(1);
    createElement.mockRestore();
  });

  it("remove a âncora do documento depois do clique", () => {
    downloadBlob("arquivo.csv", new Blob(["a"]));

    expect(document.querySelector("a[download]")).toBeNull();
  });

  it("libera a URL somente depois que o download começou", () => {
    downloadBlob("arquivo.csv", new Blob(["a"]));

    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:fake-url");
  });
});

describe("filenameFromContentDisposition", () => {
  it("extrai o nome entre aspas", () => {
    expect(
      filenameFromContentDisposition(
        'attachment; filename="smaug-lancamentos-2026-09-14.csv"',
        "fallback.csv",
      ),
    ).toBe("smaug-lancamentos-2026-09-14.csv");
  });

  it("extrai o nome sem aspas", () => {
    expect(filenameFromContentDisposition("attachment; filename=dados.csv", "fallback.csv")).toBe(
      "dados.csv",
    );
  });

  it("usa o fallback quando o cabeçalho está ausente", () => {
    expect(filenameFromContentDisposition(undefined, "fallback.csv")).toBe("fallback.csv");
  });

  it("usa o fallback quando o cabeçalho não traz filename", () => {
    expect(filenameFromContentDisposition("attachment", "fallback.csv")).toBe("fallback.csv");
  });
});
