import { describe, expect, it } from "vitest";
import { ENTRY_KIND, type EntryKind, versionTint } from "./entry-types";

const percentOf = (tint: string) => Number(/ (\d+)%/.exec(tint)?.[1]);

describe("ENTRY_KIND", () => {
  it.each([
    ["avulsa", "Avulsa", "#3b5bdb"],
    ["parcelada", "Parcelada", "#c2660a"],
    ["recorrente", "Recorrente", "#6841c7"],
    ["fixa", "Fixa", "#2d7a4a"],
  ] as [EntryKind, string, string][])("define rótulo e cor de %s", (kind, label, color) => {
    expect(ENTRY_KIND[kind].label).toBe(label);
    expect(ENTRY_KIND[kind].color).toBe(color);
    expect(ENTRY_KIND[kind].badgeCls).toContain(`text-tipo-${kind}`);
    expect(ENTRY_KIND[kind].dotCls).toBe(`bg-tipo-${kind}`);
  });
});

describe("versionTint", () => {
  it("mistura a cor do tipo com branco", () => {
    expect(versionTint("recorrente", 0, 1)).toBe("color-mix(in oklab, #6841c7 100%, white)");
  });

  it("produz tons crescentes por índice, terminando na cor cheia", () => {
    const tints = [0, 1, 2, 3].map((i) => percentOf(versionTint("fixa", i, 4)));

    expect(tints).toEqual([...tints].sort((a, b) => a - b));
    expect(new Set(tints).size).toBe(4);
    expect(tints[0]).toBeGreaterThan(35);
    expect(tints[3]).toBe(100);
  });
});
