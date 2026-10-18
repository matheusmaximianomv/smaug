# Quickstart: atualizar o ambiente e validar

**Feature**: [spec.md](./spec.md) | **Deploy em detalhe**: [plan.md § Deploy](./plan.md#deploy)

Para quem já tinha o Smaug rodando no Node 22 e puxa esta branch. Todos os comandos rodam a partir da
raiz do repositório.

## 1. Node 24 e npm 11

```bash
nvm install && nvm use      # lê o .nvmrc ("24"); com fnm: fnm use
node -v                     # v24.x (verificado com v24.22.0)
npm -v                      # 11.x (verificado com 11.19.1)
```

`engines` pede `node >=24` (e `npm >=11` na raiz). Sem `engine-strict`, um Node 22 só gera aviso — mas
nada foi testado nele.

## 2. Reinstalar os quatro pacotes

Os quatro lockfiles mudaram; o `node_modules` antigo do `server/` ainda tem o Prisma 4.

```bash
npm ci && npm ci --prefix server && npm ci --prefix web && npm ci --prefix e2e
```

- O `web/` **não usa mais `--legacy-peer-deps`**: `web/.npmrc` foi removido. Não volte a relaxar peers.
- Avisos do npm 11 sobre scripts de instalação (`prisma`, `@prisma/engines`, `better-sqlite3`,
  `@swc/core`, `esbuild`…) são esperados; os scripts rodam. O `better-sqlite3` é nativo e usa prebuild
  para Node 24.
- `npm run install:all` continua funcionando localmente, mas usa `npm install` (pode reescrever locks);
  o CI usa `npm ci`.

## 3. Client do Prisma

```bash
DATABASE_PROVIDER=sqlite npm run --prefix server prisma:generate
```

- Esperado: `Loaded Prisma config from prisma/prisma.config.ts` e
  `Generated Prisma Client (v7.10.1)`.
- O client é de **um provider por vez**. Para PostgreSQL, gere com `DATABASE_PROVIDER=postgresql`; os
  testes de integração e o E2E exigem o client SQLite (o `run-e2e.mjs` recusa outro).
- **Não use `npx prisma …`**: sem o wrapper o CLI não acha a config. Use
  `npm run --prefix server prisma -- <args>`, `prisma:generate`, `migrate:deploy`, `migrate:new`,
  `migrate:check`.

## 4. Banco existente

```bash
npm run --prefix server migrate:deploy   # sem migration nova: nada a aplicar num banco já em dia
```

O `server/prisma/sqlite/dev.db` existente segue válido: o Prisma 7 grava `DateTime` no mesmo formato
(inteiro em ms) do Prisma 4. Variáveis de ambiente (`server/.env`, `web/.env.local`) **não mudam**.

## 5. Rodar

```bash
npm run dev                  # server :3000 + web :3001
curl -s localhost:3000/health   # 200 "healthy"
curl -sI localhost:3001/dashboard | head -1   # 307 (sem cookie → /login)
```

## 6. Validar

```bash
npm run lint                               # 0 erros, 9 avisos (web, pré-existentes)
npm run validate:deps                      # sem violações
npm run --prefix server typecheck && npm run --prefix web typecheck && npm run --prefix e2e typecheck
npm run --prefix server test:coverage      # 101 arquivos, 925 testes, 100%
npm run --prefix web test:coverage         # 123 arquivos, 1248 testes, thresholds verdes
NEXT_PUBLIC_API_URL=http://localhost:3000 npm run build
npm run test:e2e                           # 96 testes; modo build por padrão
```

- O E2E agora usa `next build` por padrão e **convive** com o `npm run dev` aberto. Para hot reload:
  `E2E_WEB_MODE=dev npm run test:e2e`, **com o `npm run dev` fechado** (a Next 16 admite um `next dev`
  por diretório).
- Paridade de migrations (opcional, precisa de um PostgreSQL **descartável** — ele é apagado):

  ```bash
  POSTGRES_SHADOW_DATABASE_URL=postgresql://postgres:postgres@localhost:55432/smaug_shadow \
    npm run --prefix server migrate:check
  ```

## 7. Conferir as mudanças visíveis

Com `npm run dev` aberto, em `/despesas`:

1. **Foco visível** — navegue com Tab até uma linha do extrato: contorno vermelho de 2 px. Clique numa
   linha: a Ficha abre sem o contorno. Na confirmação de remoção, Tab até "Remover" e "Cancelar": anel
   vermelho nos dois.
2. **Animação** — abra a Ficha e pressione Esc: entra e sai com transição, e o foco volta à linha. Abra
   a confirmação sobre a Ficha e feche: só ela anima. Em 375 px, o assistente sobe da base.
3. **Movimento reduzido** — no DevTools, _Rendering → Emulate CSS media feature
   prefers-reduced-motion: reduce_: toasts e modais aparecem e somem sem transição.

## Problemas comuns

| Sintoma                                                              | Causa e solução                                                                                            |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `Rode o CLI do Prisma pelos scripts do server…`                      | Prisma chamado sem o wrapper. Use `npm run --prefix server prisma -- <args>`.                              |
| `The Driver Adapter … is not compatible with the provider …`         | Client gerado para outro provider. Rode `prisma:generate` com o `DATABASE_PROVIDER` certo.                 |
| `db push --force-reset`/`migrate reset` recusado sob um agente de IA | Trava do CLI do Prisma 7. Apague o arquivo SQLite em vez de resetar, ou dê o consentimento explicitamente. |
| `Another next dev server is already running`                         | E2E em modo `dev` com o `npm run dev` aberto. Feche-o ou use o modo padrão (`build`).                      |
| `EBADENGINE` no `npm ci`                                             | Node abaixo de 24. `nvm use`.                                                                              |
| `Cannot find module` / ABI do `better-sqlite3`                       | `node_modules` instalado com outro Node. Rode de novo o `npm ci --prefix server` no Node 24.               |
