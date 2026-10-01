import { describe, expect, it } from "vitest";
import { resolveSqliteUrl } from "@src/infrastructure/config/sqlite-url.ts";

describe("resolveSqliteUrl", () => {
  it("should make a relative path absolute from the base directory, keeping the query", () => {
    expect(resolveSqliteUrl("file:./dev.db?connection_limit=1", "/srv/server")).toBe(
      "file:/srv/server/dev.db?connection_limit=1",
    );
  });

  it("should keep an absolute SQLite path untouched", () => {
    expect(resolveSqliteUrl("file:/tmp/e2e.db", "/srv/server")).toBe("file:/tmp/e2e.db");
  });

  it("should keep a non-SQLite URL untouched", () => {
    const url = "postgresql://postgres:postgres@localhost:5432/smaug?schema=public";
    expect(resolveSqliteUrl(url, "/srv/server")).toBe(url);
  });
});
