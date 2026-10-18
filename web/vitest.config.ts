import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
      "@/features": path.resolve(__dirname, "./features"),
      "@/shared": path.resolve(__dirname, "./shared"),
      "@/infra": path.resolve(__dirname, "./infra"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    environmentOptions: {
      // Origem do app. O api-client usa `baseURL: "/api"` (mesma origem), então
      // o MSW casa `http://localhost:3001/api/*` (`tests/msw/base.ts`).
      jsdom: { url: "http://localhost:3001/" },
    },
    setupFiles: ["./vitest.setup.ts"],
    // Sem `include` explícito o glob padrão varreria .next/ e out/.
    include: [
      "{app,features,infra,shared}/**/*.test.{ts,tsx}",
      "tests/**/*.test.{ts,tsx}",
      "proxy.test.ts",
    ],
    exclude: ["node_modules/**", ".next/**", "out/**", "coverage/**"],
    // Aplicado no worker ANTES de qualquer módulo de teste carregar.
    env: {
      TZ: "UTC",
    },
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: [
        "app/**/*.{ts,tsx}",
        "features/**/*.{ts,tsx}",
        "infra/**/*.ts",
        "shared/**/*.{ts,tsx}",
        "proxy.ts",
      ],
      exclude: [
        "**/*.test.{ts,tsx}",
        "**/types/index.ts",
        "app/layout.tsx", // RSC shell: <html>/<body>/fontes
        "app/page.tsx", // RSC: um único redirect("/login"), coberto pelo proxy
        "app/providers.tsx", // monta o singleton de produção + devtools
        "next.config.ts",
      ],
      // `thresholds` entra por fase junto com os testes (catraca), para que
      // `test:coverage` fique verde em todo commit. Alvos finais:
      //   100% em shared/lib, infra, proxy.ts, shared/hooks, */services
      //   100/95/100/100 em features/*/hooks
      //   piso global 90/85/90/90
      thresholds: {
        // Piso global. Só branches fica abaixo de 100%, por causa de um único
        // idioma defensivo na página de Categorias — ver o comentário de `app/**`.
        lines: 100,
        functions: 100,
        branches: 99,
        statements: 100,

        // Tudo abaixo está em 100% nas quatro métricas e deve permanecer.
        "shared/lib/**": { lines: 100, functions: 100, branches: 100, statements: 100 },
        "infra/**": { lines: 100, functions: 100, branches: 100, statements: 100 },
        "proxy.ts": { lines: 100, functions: 100, branches: 100, statements: 100 },
        "shared/hooks/**": { lines: 100, functions: 100, branches: 100, statements: 100 },
        "shared/components/**": { lines: 100, functions: 100, branches: 100, statements: 100 },
        "features/*/services/**": { lines: 100, functions: 100, branches: 100, statements: 100 },
        "features/*/hooks/**": { lines: 100, functions: 100, branches: 100, statements: 100 },
        "features/*/components/**": {
          lines: 100,
          functions: 100,
          branches: 100,
          statements: 100,
        },

        // A página de Categorias retém 2 ramos falsos inalcançáveis, do idioma
        // de guarda de nulo sobre estado que a condição de render já garante
        // preenchido:
        //
        //   <ConfirmDialog isOpen={!!deleteTarget}
        //     onConfirm={() => { if (deleteTarget) … }} />
        //
        // O diálogo (e portanto o botão) só existe quando `deleteTarget` é
        // verdadeiro, então o ramo falso nunca executa. Deliberadamente NÃO
        // removemos a guarda: sem ela o TypeScript exigiria `!`, trocando uma
        // checagem barata por uma asserção que silencia o compilador. Também
        // não usamos `v8 ignore`. Receitas e Despesas, que repetiam o idioma,
        // passaram a renderizar só a tela da feature (redesign v3), onde os
        // modais são montados sob a condição e a guarda deixou de existir.
        "app/**": { lines: 100, functions: 100, branches: 96, statements: 100 },
      },
    },
  },
});
