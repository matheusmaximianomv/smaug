import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
const listen = vi.fn((_port: number, callback: () => void) => callback());
const createHttpServer = vi.fn(() => ({ listen }));
const env: { PORT?: number } = { PORT: 3000 };

vi.mock("@src/infrastructure/config/env.ts", () => ({ env }));
vi.mock("@src/infrastructure/config/container.ts", () => ({
  container: { resolve: vi.fn(() => logger) },
}));
vi.mock("@src/infrastructure/http/server.ts", () => ({ createHttpServer }));

describe("bootstrap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("should start the HTTP server on the configured port", async () => {
    env.PORT = 4000;

    await import("@src/main.ts");

    expect(createHttpServer).toHaveBeenCalled();
    expect(listen).toHaveBeenCalledWith(4000, expect.any(Function));
    expect(logger.info).toHaveBeenCalledWith("HTTP server listening on port 4000");
  });

  it("should fall back to port 3000 when PORT is not set", async () => {
    env.PORT = undefined;

    await import("@src/main.ts");

    expect(listen).toHaveBeenCalledWith(3000, expect.any(Function));
    expect(logger.info).toHaveBeenCalledWith("HTTP server listening on port 3000");
  });
});
