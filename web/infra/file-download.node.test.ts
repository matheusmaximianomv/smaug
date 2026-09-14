/**
 * @vitest-environment node
 *
 * Cobre o guard `typeof document === "undefined"`, inalcançável no jsdom.
 */
import { describe, expect, it } from "vitest";
import { downloadBlob } from "./file-download";

describe("downloadBlob sem document (ambiente node)", () => {
  it("confirma que não existe document neste ambiente", () => {
    expect(typeof document).toBe("undefined");
  });

  it("é no-op e não lança", () => {
    expect(() => downloadBlob("arquivo.csv", new Blob(["a"]))).not.toThrow();
  });
});
