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
      // Origem do app, deliberadamente DIFERENTE da origem da API
      // (http://localhost:3000), para que asserções sobre
      // window.location.pathname tenham significado.
      jsdom: { url: "http://localhost:3001/" },
    },
    setupFiles: ["./vitest.setup.ts"],
    // Sem `include` explícito o glob padrão varreria .next/ e out/.
    include: [
      "{app,features,infra,shared}/**/*.test.{ts,tsx}",
      "tests/**/*.test.{ts,tsx}",
      "middleware.test.ts",
    ],
    exclude: ["node_modules/**", ".next/**", "out/**", "coverage/**"],
    // Aplicado no worker ANTES de qualquer módulo de teste carregar.
    // Precisa ser aqui, e não no setup: infra/api-client.ts lê
    // NEXT_PUBLIC_API_URL em tempo de avaliação do módulo, então vi.stubEnv
    // dentro de um teste chegaria tarde demais para mudar o baseURL.
    env: {
      TZ: "UTC",
      NEXT_PUBLIC_API_URL: "http://localhost:3000",
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
        "middleware.ts",
      ],
      exclude: [
        "**/*.test.{ts,tsx}",
        "**/types/index.ts",
        "app/layout.tsx", // RSC shell: <html>/<body>/fontes
        "app/page.tsx", // RSC: um único redirect("/login"), coberto pelo middleware
        "app/providers.tsx", // monta o singleton de produção + devtools
        "next.config.ts",
        "tailwind.config.ts",
      ],
      // `thresholds` entra por fase junto com os testes (catraca), para que
      // `test:coverage` fique verde em todo commit. Alvos finais:
      //   100% em shared/lib, infra, middleware.ts, shared/hooks, */services
      //   100/95/100/100 em features/*/hooks
      //   piso global 90/85/90/90
      thresholds: {
        // Piso global. Funções e linhas estão em 100%; statements e branches
        // ficam ligeiramente abaixo por causa de um único idioma defensivo nas
        // três páginas de CRUD — ver o comentário de `app/**` abaixo.
        lines: 100,
        functions: 100,
        branches: 98,
        statements: 99,

        // Tudo abaixo está em 100% nas quatro métricas e deve permanecer.
        "shared/lib/**": { lines: 100, functions: 100, branches: 100, statements: 100 },
        "infra/**": { lines: 100, functions: 100, branches: 100, statements: 100 },
        "middleware.ts": { lines: 100, functions: 100, branches: 100, statements: 100 },
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

        // As três páginas de CRUD retêm 13 ramos falsos inalcançáveis, todos do
        // MESMO idioma: uma guarda de nulo sobre estado que a condição de render
        // já garante preenchido. Exemplos:
        //
        //   <ConfirmDialog isOpen={!!deleteTarget}
        //     onConfirm={() => { if (deleteTarget) … }} />
        //
        // O diálogo (e portanto o botão) só existe quando `deleteTarget` é
        // verdadeiro, então o ramo falso nunca executa. O mesmo vale para
        // `if (!selectedFixed) return` e `modal === "edit" && selected`.
        //
        // Deliberadamente NÃO removemos essas guardas: sem elas o TypeScript
        // exigiria `!` em cada uso, trocando uma checagem barata por uma
        // asserção que silencia o compilador. Também não usamos `v8 ignore`,
        // que espalharia 13 anotações pelo JSX. O número fica registrado aqui.
        "app/**": { lines: 100, functions: 100, branches: 86, statements: 97 },
      },
    },
  },
});
