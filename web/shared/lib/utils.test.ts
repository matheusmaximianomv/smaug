import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("junta várias classes em uma string", () => {
    expect(cn("px-2", "text-sm")).toBe("px-2 text-sm");
  });

  it("resolve conflito de utilitários Tailwind mantendo a última", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("resolve conflito entre classes com o mesmo grupo", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("ignora false, undefined e null", () => {
    expect(cn("px-2", false, undefined, null, "py-1")).toBe("px-2 py-1");
  });

  it("aceita array de classes", () => {
    expect(cn(["px-2", "py-1"], "text-sm")).toBe("px-2 py-1 text-sm");
  });

  it("aceita objeto condicional", () => {
    expect(cn("base", { active: true, disabled: false })).toBe("base active");
  });

  it("devolve string vazia sem argumentos", () => {
    expect(cn()).toBe("");
  });
});
