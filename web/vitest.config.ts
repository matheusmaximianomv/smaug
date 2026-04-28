import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./vitest.setup.ts",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
      "@/features": path.resolve(__dirname, "./features"),
      "@/shared": path.resolve(__dirname, "./shared"),
      "@/infra": path.resolve(__dirname, "./infra"),
    },
  },
});
