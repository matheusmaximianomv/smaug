# Research: Atualizações de plataforma — Next.js 16, Tailwind 4 e Node 24

**Feature**: [spec.md](./spec.md) | **Plano**: [plan.md](./plan.md)

Cada decisão segue o formato Decisão · Razão · Alternativas descartadas. As três etapas foram ensaiadas
inteiras numa cópia descartável do repositório antes de serem aplicadas; os números citados vêm desses
ensaios e da verificação final na branch. Decisões numeradas por etapa: **N** (Next 16), **T**
(Tailwind 4), **P** (Node 24 + Prisma 7).

## Ponto de partida verificado no código

- **web/**: `next@15.0.3`, React/React DOM `19.0.0-rc-66855b96-20241106`, `@types/react*` `^18`,
  ESLint 8 com `.eslintrc.json` e `"lint": "next lint"`, `web/.npmrc` com `legacy-peer-deps=true`,
  Tailwind 3.4.19 com `tailwind.config.ts`, `tailwind-merge` 3.5.0, `web/middleware.ts` guardando as
  rotas pelo cookie `userId`. O app é todo Client Components: nenhum `cookies()`/`headers()`,
  `params`/`searchParams` de página, `next/image`, runtime config ou cache de `fetch`.
- **npm audit do web**: 21 achados (1 crítico, 17 altos, 3 moderados); o `next` sozinho somava 20
  advisories, entre elas RCE no protocolo de Server Components (CVE-2025-66478), bypass de middleware,
  SSRF e DoS.
- **Defeitos latentes de CSS**: o `tailwind-merge` 3.5.0 aplica regras da v4 sobre CSS da v3 e descarta
  `outline` quando vem com `outline-2` — o anel de foco das linhas do extrato não era desenhado e o
  contorno do mês corrente da Ficha dependia de um remendo `[outline-style:solid]`. As classes
  `animate-in`/`fade-in`/`slide-in-from-bottom-2` (Toast e overlay do Modal) vinham de um plugin nunca
  instalado e não geravam CSS.
- **Runtime**: Node 22 (fim de suporte 2027-04-30) sem fonte única — `node-version: 22` em três jobs de
  CI, `engines` divergentes (`>=22.0.0`, `>=22`, ausente no web), `@types/node` em três majors
  (`^25.3.0`, `^20`, `^22.10.0`). CI instalava com `npm run install:all` (`npm install`).
- **Prisma 4.16.2**, sem correções desde 2023-06-30: `url = env("DATABASE_URL")` no schema, client com
  `datasources`, engine Rust baixado de `binaries.prisma.sh`, testes de integração com
  `npx prisma db push --force-reset --skip-generate` repetido em 10 arquivos.

---

## Etapa 1 — Next.js 16.4.2 + React 19.3.1

### N1 — Salto direto para a 16.4.2 com o codemod oficial, sem adoção de recursos

- **Decisão**: `npx @next/codemod@latest upgrade latest --yes --skip-adoption`, com revisão do diff e
  limpeza das sobras (`.eslintrc.json`, `__dirname` sem uso, bloco `overrides` de `@types/react`).
- **Razão**: na 16.4.2 o `next` some do audit. Sem `--skip-adoption` o codemod espalharia
  `export const instant = false` em 6 arquivos de `app/` — ruído para quem não usa `cacheComponents`.
- **Alternativas**: parar na 15.5.28 (`backport`) — também ensaiada; resolve as críticas, mas mantém o
  `next` moderado via `postcss`, exige a mesma troca do `next lint` e deixa a 16 por fazer. Ficar na
  15.0.8 — ainda 33 advisories, 3 críticas.

### N2 — React 19.3.1 estável e fim do `--legacy-peer-deps`, lock reconciliado e não regerado

- **Decisão**: `react`/`react-dom` 19.3.1 e `@types/react`/`@types/react-dom` 19.3.0, versões exatas;
  `web/.npmrc` removido; lock reconciliado uma única vez com o npm 11 (muda só `vitest`/`@vitest/*` →
  4.1.11 e `chai`, além do codemod).
- **Razão**: com React estável todos os peers casam. O lock antigo tinha `vitest@4.1.5` contra um
  `@vitest/coverage-v8@4.1.11` que exige a mesma versão — a flag escondia isso, e sem ela o npm 10
  quebrava (`Cannot read properties of null (reading 'edgesOut')`).
- **Alternativas**: manter a flag (esconde a classe de erro que já tinha sumido com
  `@testing-library/dom` no passado); apagar o lock e reinstalar — subiria `lucide-react` de 1.12 para
  1.59, que renomeia classes e quebra testes.

### N3 — ESLint 9 com configuração flat; `eslint .` como script

- **Decisão**: `web/eslint.config.mjs` com `eslint-config-next/core-web-vitals` +
  `eslint-config-next/typescript`, `coverage/**` ignorado e o mesmo override de testes do antigo
  `.eslintrc.json` (apagado). ESLint fixado em 9.39.5 no web; a raiz e o server seguem no ESLint 10.
- **Razão**: a 16 removeu o `next lint` e o `next build` deixou de lintar; o `eslint-config-next@16` só
  existe em flat config e exige ESLint ≥ 9. O ESLint 10 roda, mas `eslint-plugin-react`,
  `-import` e `-jsx-a11y` declaram peer `eslint ≤ 9` e trariam o `--legacy-peer-deps` de volta. O lint
  passa a cobrir `features/`, `shared/`, `infra/` e `tests/`, que o `next lint` não varria.

### N4 — Erros novos do React Compiler: supressão justificada, não refatoração

- **Decisão**: os 2 erros `react-hooks/set-state-in-effect` (`shared/hooks/useMediaQuery.ts`,
  `features/auth/hooks/useAuth.ts`) recebem `eslint-disable-next-line` precedido do porquê; os 8 avisos
  novos (mais 1 antigo) ficam. Resultado: **0 erros, 9 avisos**.
- **Razão**: os dois hooks sincronizam estado com algo que só existe no browser depois da hidratação
  (`matchMedia`, cookie) — o padrão é intencional.
- **Alternativas**: reescrever `useMediaQuery` com `useSyncExternalStore` — passou nos testes, mas
  derrubou a cobertura de `shared/hooks/**` abaixo de 100% (o `getServerSnapshot` só roda em `node`).
  Fica como follow-up.

### N5 — lint-staged com o ESLint CLI sobre os arquivos staged

- **Decisão**: a entrada `web/**/*.{ts,tsx}` de `.lintstagedrc.js` vira uma função que roda
  `npm --prefix web exec -- eslint --config web/eslint.config.mjs <arquivos entre aspas>` e
  `prettier --write <arquivos>`, ainda sem `--fix`.
- **Razão**: o ESLint CLI aceita os caminhos com parênteses (`app/(app)`, `app/(auth)`) que o
  `next lint` rejeitava — antes o lint-staged rodava o lint inteiro do web. O `--config` explícito é
  necessário porque o ESLint 9 resolve a config a partir do cwd (a raiz, com a config do ESLint 10).

### N6 — `middleware.ts` → `proxy.ts`, só o nome

- **Decisão**: `git mv` de `middleware.ts`/`middleware.test.ts` para `proxy.ts`/`proxy.test.ts`; a
  função exportada vira `proxy`; `config.matcher` intacto; `vitest.config.ts` troca `middleware` por
  `proxy` nos globs, mantendo 100%.
- **Razão**: convenção da 16 (a antiga fica deprecada). O proxy roda sempre em `nodejs`, e o projeto
  não declarava `runtime: "edge"`.
- **Alternativas**: manter `middleware.ts` com aviso de depreciação — só empurra a troca para a 17.

### N7 — E2E local em modo `build` por padrão

- **Decisão**: `E2E_WEB_MODE` passa de `CI ? "build" : "dev"` para `"build"` em
  `e2e/scripts/run-e2e.mjs` e `e2e/playwright.config.ts`; `E2E_WEB_MODE=dev` continua opcional.
- **Razão**: na 16 o `next dev` trava uma instância por diretório (`.next/dev`); com o `npm run dev`
  aberto o E2E local falhava com "Another next dev server is already running". O modo `build` foi mais
  rápido no ensaio (38 s contra 1,2 min) e exercita o mesmo artefato do CI.

### N8 — Ajustes gerados pelo `next build` e pelo `next dev`

- **Decisão**: commitar o `tsconfig.json` reescrito pelo build (`jsx: "react-jsx"`,
  `.next/dev/types/**/*.ts` no `include`), formatado pelo Prettier; pôr `/AGENTS.md` no
  `web/.gitignore` (gerado pelo `next dev` 16.2+ quando detecta um agente de IA).
- **Razão**: builds seguintes não sujam a árvore; a fonte de verdade para agentes é `CLAUDE.md` +
  `.claude/skills/`.
- **Alternativas** para o `AGENTS.md`: commitar (duplica e envelhece a cada upgrade);
  `agentRules: false` no `next.config.ts` (tira o arquivo também de quem o quer localmente).

### N9 — `axios` no escopo; o resto do audit fica para depois

- **Decisão**: `npm audit fix` sem `--force` sobe o `axios` de 1.15.2 para 1.20.0, dentro de `^1`.
- **Razão**: é a única dependência de runtime com advisories altas restantes (ReDoS por nome de cookie,
  alocação sem limite, vazamento de `Proxy-Authorization`), com correção semver-compatível. O audit do
  web cai para 12 achados, todos de desenvolvimento/build.

---

## Etapa 2 — Tailwind CSS 4.3.3

### T1 — Codemod oficial + revisão manual; configuração CSS-first sem `@config`

- **Decisão**: `npx @tailwindcss/upgrade` e revisão arquivo a arquivo. Tokens vão para `@theme` em
  `app/globals.css` com os mesmos nomes (`--color-red`, `--color-tipo-avulsa-light`, `--font-sans`,
  `--width-nav`…); `tailwind.config.ts` apagado; PostCSS passa a `@tailwindcss/postcss`.
  `--font-sans` fica com o nome da fonte entre aspas.
- **Razão**: nenhuma classe de token muda, e o tema passa a ter um único lugar.
- **Alternativas**: manter o `.ts` via `@config` — duas fontes de verdade e um modo de compatibilidade
  a remover depois.

### T2 — `tailwind-merge` ^3.7.0, sem configuração extra

- **Decisão**: subir para 3.7.0, que cobre Tailwind 4.0–4.3.
- **Razão**: com merge e CSS na mesma versão, `outline-2` já aplica `outline-style` sólido e o par
  `outline outline-2` volta a ser coerente.
- **Alternativas**: `extendTailwindMerge` — nenhum conflito real exige.

### T3 — Animações com `tw-animate-css` 1.4.0

- **Decisão**: `@import "tw-animate-css"` logo após `@import "tailwindcss"`.
- **Razão**: CSS puro (`@utility`/`@theme`), MIT, mantido, substituto adotado pelo ecossistema para a
  v4; mantém os nomes já usados no código (`animate-in`, `fade-in`, `slide-in-from-bottom-2`) e oferece
  `animate-out`, `fade-out`, `zoom-in-95`/`zoom-out-95`, `slide-*-bottom-4`. Só as utilidades usadas
  entram no CSS.
- **Alternativas**: `@plugin "tailwindcss-animate"` (parado desde 2023, JS para a API da v3);
  `@keyframes` + `@utility` à mão — zero dependência, mas ~40 linhas a manter; continua sendo o plano B.

### T4 — Movimento reduzido por `motion-safe:` nas utilidades de animação

- **Decisão**: todas as utilidades de animação de Toast e Modal vão sob `motion-safe:`.
- **Razão**: a lib não trata `prefers-reduced-motion`. Sem `animation-name`, o Radix desmonta o modal
  na hora.
- **Alternativas**: regra global `@media (prefers-reduced-motion: reduce) { * { animation-duration:
.01ms !important } }` — congelaria também `animate-spin` e `animate-pulse`, que comunicam
  carregamento.

### T5 — Classes alvo

- **Toast**: `motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2` (só
  entrada).
- **Overlay do Modal**: `data-[state=open]:` `animate-in fade-in`; `data-[state=closed]:`
  `animate-out fade-out`.
- **Painel do Modal**: entrada `fade-in` + `md:zoom-in-95` ou `max-md:slide-in-from-bottom-4`; saída
  `fade-out` + `md:zoom-out-95` ou `max-md:slide-out-to-bottom-4`. Duração padrão da lib (150 ms).
- O `data-state` vem do Radix e só muda na camada de cima, então a confirmação sobre a Ficha anima
  sozinha.

### T6 — Testes: o jsdom neutraliza a saída; assertar classes, não tempo

- **Decisão**: testes de `Modal` e `Toast` assertam a presença das classes `motion-safe:*`; o efeito
  real é verificado no navegador com emulação de `prefers-reduced-motion`.
- **Razão**: sem CSS no jsdom, `animationName` é vazio e o Radix desmonta na hora — os testes que
  esperam o diálogo sumir continuam síncronos. No Playwright o actionability check re-tenta ações atrás
  de um overlay saindo; a contingência `use.reducedMotion: "reduce"` não foi necessária.

### T7 — Correções de padrão da v4 em vez de blocos de compatibilidade

- **Cor de borda**: o bloco `--color-gray-200` inserido pelo codemod sai (redundante com
  `* { @apply border-border }`).
- **Anel do `Button`**: `focus-visible:ring-red` vai para a classe base. Na v4 o anel herdaria
  `currentColor` — branco na variante `danger`.
- **Cursor**: regra base `button:not(:disabled), [role="button"]:not(:disabled) { cursor: pointer }` —
  a v4 devolveu ao `<button>` o cursor padrão do navegador.
- **Placeholder**: `placeholder:text-text-subtle` no `MoneyField`, que senão herdaria a cor do valor.
- **Contornos**: `MonthCells` volta a `outline-2 outline-offset-2 outline-text`, sem o remendo;
  `EntryRow` fica com `focus-visible:outline-2 focus-visible:outline-offset-1
focus-visible:outline-red`.

### T8 — Erros do codemod revertidos à mão

- O codemod trocou o valor de prop `variant: "outline"` do `Button` por `"outline-solid"`
  (`Button.tsx`, `Button.test.tsx`), quebrando o `tsc` em 5 consumidores e o `next build`; também
  adulterou um comentário de `MonthCells.tsx`. Ambos revertidos.
- Aceitas: `shadow-sm`→`shadow-xs`, `rounded`→`rounded-sm`, `rounded-sm`→`rounded-xs`,
  `outline-none`→`outline-hidden`, `@layer utilities`→`@utility` (`bg-stripes`, `bg-hatch`),
  `z-[60]`→`z-60`, `[&>*]:`→`*:`, `leading-[1.5]`→`leading-normal`,
  `max-md:[scrollbar-width:none]`→`max-md:scrollbar-none`, hex do `VersionCard` → tokens `tipo-*`.

### T9 — Achados da implementação, não previstos no desenho inicial

- **`ModalGate`** (em `shared/components/Modal.tsx`): `DespesasScreen`/`ReceitasScreen` montavam Ficha
  e assistente só enquanto abertos, e fechar os desmontava sem animação de saída. O portão deixa a tela
  baixar o `open` do Radix sem desmontar quem desenha o modal; as telas guardam
  `{ modal, isOpen, key, origin }` e trocam a `key` a cada abertura. _Alternativa descartada_: passar
  `isOpen` por ~13 componentes de Ficha/assistente.
- **Devolução do foco**: sem `Dialog.Trigger`, o Radix devolvia o foco ao `<body>` (já era assim antes).
  O `Modal` guarda quem tinha o foco ao abrir e o devolve no `onCloseAutoFocus`; na Ficha de série, que
  troca de `Modal` com a camada aberta, a origem vem do `ModalGate` e a troca não devolve o foco.
- **Saída da folha inferior**: até 768 px a saída é `slide-out-to-bottom-4` (inverso da entrada), e
  não `zoom-out-95`.
- **Foco base**: controles crus sem foco próprio (links do menu, setas do mês, "Fechar") ganham
  `:focus-visible { outline: 2px solid var(--color-red); outline-offset: 2px }` no `@layer base`; as
  utilidades dos componentes continuam vencendo.
- **`Button`**: com `ring-red` na base, `default` e `danger` passam a ter as mesmas classes; o teste do
  `ConfirmDialog` que comparava as duas virou teste do anel vermelho nas variantes `danger` e `ghost`.
- **Diferenças visuais aceitas**: na v4 `text-xs`/`text-sm` definem `line-height` sem unidade e filhos
  com `text-[Npx]` herdam a razão (selo "Vigente" 2 px mais baixo); ~1 px na linha de total das tabelas
  do Dashboard (`border-collapse` + `border-t-2` no preflight novo).

---

## Etapa 3 — Node.js 24.22.0 + Prisma 7.10.1

### P1 — Node 24 com `.nvmrc` contendo só o major

- **Decisão**: `.nvmrc` na raiz com `24`; `nvm`/`fnm` e `actions/setup-node` resolvem para o patch mais
  recente da linha (24.22.0 na data).
- **Razão**: LTS com suporte até 2028-04-30; patches de segurança entram sem commit.
- **Alternativas**: fixar `24.22.0` (um commit por patch, sem automação de dependências no projeto);
  **Node 26** — vira Active LTS em 2026-10-28 e o ecossistema não foi ensaiado nele; reavaliar depois.

### P2 — CI lê o `.nvmrc` e instala com `npm ci` por pacote

- **Decisão**: `node-version-file: .nvmrc` nos três `actions/setup-node@v4` (`ci.yml` principal e
  `migrations`, `e2e.yml`); o passo `npm run install:all` vira
  `npm ci && npm ci --prefix server && npm ci --prefix web && npm ci --prefix e2e`.
- **Razão**: o `install:all` usa `npm install`, que pode reescrever o lock no runner e mascarar um lock
  fora de sincronia — justamente o que esta feature mexe. `npm ci` falha nesse caso e é mais rápido. O
  `install:all` segue existindo para uso local.

### P3 — `engines` em `>=24`, npm `>=11` na raiz; `@types/node` `^24` nos três pacotes

- **Decisão**: raiz `node >=24`, `npm >=11`; `server/`, `web/` (campo novo) e `e2e/` `node >=24`;
  `@types/node` `^24` (24.19.2) em `server/` (descendo de `^25`), `web/` (de `^20`) e `e2e/` (de `^22`).
- **Razão**: `>=` documenta o mínimo testado sem aviso falso em quem já estiver na 26; sem
  `engine-strict` o campo é aviso, não bloqueio. Os tipos devem descrever o runtime.

### P4 — Locks reconciliados com o npm 11, não regerados

- **Decisão**: `npm install` em cada pacote com Node 24, sem apagar lock nem `node_modules`.
- **Razão**: `web/`/`e2e/` só mudam `@types/node`/`undici-types`; `server/` perde a entrada do peer
  opcional `jiti`; a raiz poda 203 entradas órfãs (370 → 167 pacotes, nenhum `name@version` novo) —
  sobra antiga que o npm 10 também poda. Locks seguem em `lockfileVersion: 3`.

### P5 — `tsup` com `target: "node24"`

- **Decisão**: `server/tsup.config.ts` acompanha o runtime.
- **Razão**: não rebaixar sintaxe à toa. Como o Docker continua no 22, foi conferido que o bundle
  `node24` roda na imagem — rodou, antes e depois do Prisma 7.

### P6 — Prisma 7.10.1, o salto longo

- **Decisão**: `prisma` e `@prisma/client` de `^4.16.2` para `^7.10.1`, ambos em `dependencies` (o
  `runner` do Docker precisa do CLI para o `migrate:deploy`).
- **Razão**: linha mantida; engines `^20.19 || ^22.12 || >=24`, satisfeitos no Node 24 e na imagem
  `node:22-alpine` (22.22.2). O lock do server ganha 166 pacotes (CLI 7: Studio, `@prisma/dev`,
  `effect`, PGlite).
- **Alternativas**: 6.19.3 — mesmo modelo de engine e config do 4, mas adia todo o trabalho de
  adapters para a próxima subida; `8.0.0-rc.*` — não é estável.

### P7 — Generator continua `prisma-client-js`

- **Decisão**: manter o generator depreciado (funcional e sem aviso no 7.10.1), com client em
  `node_modules/.prisma/client`, já sem engine Rust.
- **Razão**: mantém intactos os 11 imports de `@prisma/client` em `src/`, a detecção de provider do
  `run-e2e.mjs` e o `COPY --from=builder /app/node_modules/.prisma` do `Dockerfile`.
- **Alternativas**: generator `prisma-client` — `output` obrigatório fora de `node_modules` (relativo
  ao schema derivado), imports trocados e o `generate` **não cria `node_modules/.prisma`**, quebrando o
  build da imagem. Vai para a change de Docker.

### P8 — Driver adapters por provider num módulo próprio

- **Decisão**: `src/infrastructure/database/prisma-adapter.ts` exporta
  `createPrismaAdapter(provider, url)` — `PrismaPg({ connectionString, connectionTimeoutMillis: 5_000 })`
  ou `PrismaBetterSqlite3({ url }, { timestampFormat: "unixepoch-ms" })` — sem depender do `env.ts`,
  para o harness de testes usar o mesmo adapter. `config.ts` monta
  `new PrismaClient({ adapter })`, com `memory` → `sqlite` (o adapter só abre o arquivo na primeira
  query).
- **Razão**: o Prisma 7 exige adapter. Os dois ajustes preservam o Prisma 4, ambos medidos:
  - o `pg` não tem timeout de conexão por padrão — com host inalcançável o `/health` ficava pendurado
    mais de 30 s (Prisma 4: 503 em 5,10 s; com o ajuste: 5,08 s; o `HEALTHCHECK` do Docker usa
    `--timeout=5s`);
  - o Prisma 4 gravava `DateTime` no SQLite como INTEGER em ms; o padrão do adapter (`iso8601`) grava
    TEXT, e o SQLite ordena todo INTEGER antes de qualquer TEXT — um `dev.db` existente misturaria
    formatos e quebraria `orderBy`.
- **Observação**: `?schema=public` na URL do PostgreSQL é ignorado pelo `pg` sem efeito (o padrão já é
  `public`). Client e adapter de providers diferentes falham na construção com
  `PrismaClientInitializationError`.

### P9 — `prisma.config.ts` em `server/prisma/`, passado pelo wrapper

- **Decisão**: a linha `url = env("DATABASE_URL")` sai do datasource (o 7.10.1 a recusa com `P1012`) —
  único diff do schema. `server/prisma/prisma.config.ts` (novo) lê `SMAUG_PRISMA_PROVIDER` (posto pelo
  wrapper; lança erro com a instrução de usar os scripts se faltar) e declara schema, migrations,
  `datasource.url: process.env.DATABASE_URL ?? ""` e `shadowDatabaseUrl` por
  `SMAUG_SHADOW_DATABASE_URL`.
- **Razão de morar em `prisma/`**: o `runner` do Dockerfile só copia `scripts/`, `prisma/`, `dist/` e
  `node_modules/.prisma`; na raiz do `server/` a config não chegaria à imagem. URL vazia em vez de
  `env()` porque o `prisma:generate` do CI roda sem `DATABASE_URL`.
- **Alternativas**: uma config por provider — duas cópias quase iguais e o mesmo `--config` explícito.

### P10 — Wrapper ajustado às flags do CLI 7

- **Decisão**: `runPrisma(provider, args, { capture, input, env })` acrescenta `--config` e
  `SMAUG_PRISMA_PROVIDER`; `migrate diff` usa `--to-schema` e o banco sombra pela config;
  `db execute` sem `--url` (URL por `DATABASE_URL`); `scripts/prisma.mjs` recusa `--schema` **e
  `--config`** e deixa de passar `--schema`. `migrate:new`/`migrate:check` mantêm interface e saída.
- **Razão**: o CLI 7 removeu `--to-schema-datamodel`, `--shadow-database-url` e `db execute --url`, e não
  lê mais `.env` (o wrapper já carregava `server/.env` com `dotenv`). Caminho SQLite relativo seguiria
  resolvido de lugares diferentes pelo CLI (pasta da config) e pelo `better-sqlite3` (cwd), então o
  `resolveSqliteUrl` do wrapper e do `env.ts` continua necessário.

### P11 — Migrations intocadas

- **Decisão**: nenhuma migration nova ou editada; `migration_lock.toml` iguais.
- **Verificação**: `migrate:check` verde contra Postgres 16 (inclusive criando o banco sombra
  inexistente); um campo acrescentado de propósito gera o mesmo `ALTER TABLE "t_users" ADD COLUMN
"nickname" TEXT` nos dois dialetos e faz o check falhar (revertido). Como os arquivos não mudam, os
  checksums em `_prisma_migrations` dos bancos existentes continuam batendo.

### P12 — Harness de testes sem `--force-reset`

- **Decisão**: `server/tests/helpers/sqlite-test-database.ts` — `sqliteTestDatabase(name)` com `url`,
  `push()` (apaga o arquivo e roda `db push` pelo wrapper), `client()` (mesmo adapter da app) e
  `remove()` (arquivo + `-journal`/`-wal`/`-shm`). Os 10 testes de integração com banco migram para ele
  (−158/+70 linhas). `e2e/scripts/run-e2e.mjs` faz `db push` sem `--force-reset`/`--skip-generate`.
- **Razão**: `--skip-generate` não existe mais; o CLI 7 **recusa ações destrutivas** (`--force-reset`,
  `migrate reset`) quando detecta um agente de IA no ambiente (`CLAUDECODE`, `AI_AGENT`,
  `CURSOR_AGENT`, …), exigindo `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION`. Como cada arquivo de teste
  e cada run E2E usa um banco novo, apagar o arquivo dispensa o reset — sem contornar a trava.

### P13 — Docker funciona sem alteração (fora do escopo, ensaiado)

- Com P7 e P9, o `server/Dockerfile` atual, sem uma linha alterada, constrói, roda `migrate:deploy`,
  sobe e fica `healthy` contra `postgres:16-alpine` numa rede Docker `--internal` (sem internet).
- A imagem vai de **301 MB para 666 MB** (`node_modules/@prisma` 169 MB, `prisma` 40 MB, `effect`
  34 MB, `@electric-sql` 25 MB, `typescript` 23 MB como peer).
- O defeito pré-existente de ordem no `runner` (`npm ci --omit=dev` antes de `apk add --no-cache curl
openssl`), que no Prisma 4 fazia o `migrate:deploy` baixar engine e falhar offline
  (`getaddrinfo EAI_AGAIN binaries.prisma.sh`), deixa de se manifestar: o Prisma 7 não tem query engine
  e instala o `schema-engine` musl já no `npm ci`.

---

## Ajustes posteriores às três etapas

### A1 — `turbopack: { root: __dirname }` em `web/next.config.ts`

- **Decisão**: declarar a raiz do Turbopack.
- **Razão**: o `package-lock.json` da raiz do monorepo fazia o Next inferir a raiz do repositório como
  workspace e emitir o aviso "inferred workspace root" a cada `dev`/`build`.
- **Desvio**: o desenho da etapa Next tinha "não mexer no `next.config.ts`" como não-objetivo, e o da
  etapa Node listava o aviso como pré-existente e fora do escopo. Foi resolvido por ser uma linha sem
  efeito no bundle.

### A2 — `settings.next.rootDir` absoluto em `web/eslint.config.mjs`

- **Decisão**: `{ settings: { next: { rootDir: import.meta.dirname } } }`.
- **Razão**: o lint-staged chama o ESLint a partir da raiz do repositório, onde não há `pages/`, e o
  `@next/eslint-plugin-next` emitia "Pages directory cannot be found". Desvia da config "tradução 1:1
  do `.eslintrc.json`" prevista em N3.

### A3 — Timeout de 15 s num teste de integração do web

- **Decisão**: o teste "revisa uma fixa alterável sem término e uma avulsa" de
  `web/tests/integration/receitas-page.test.tsx` ganha timeout de 15 s, com comentário.
- **Razão**: percorre o assistente inteiro duas vezes e, sob carga (suíte completa com cobertura),
  estourava o limite padrão de 5 s. A instabilidade já existia antes das três etapas e não envolve
  código tocado.

## Riscos aceitos

- **Docker em `node:22-alpine`** com local/CI em 24 — paridade de runtime temporariamente quebrada; o
  código não usa API exclusiva do 24 e o bundle `node24` rodou na imagem.
- **Imagem 2,2× maior** (666 MB) por causa do CLI do Prisma 7 no `runner`.
- **`prisma-client-js` depreciado** — pode sair numa major futura; a troca está desenhada (P7).
- **Driver adapters mudam o caminho de execução** (query compiler WASM + `pg`/`better-sqlite3`); os dois
  desvios encontrados estão fixados em P8. Pool do `pg` (10 conexões) irrelevante para o volume.
- **`better-sqlite3` é módulo nativo** e dependência de produção mesmo na imagem PostgreSQL (import
  estático do adapter); prebuilds para Node 24 (glibc) e musl instalam sem toolchain.
- **Deep imports internos do Next** (`next/dist/shared/lib/*`) nos testes de roteamento podem mudar numa
  minor; ficam isolados em `tests/router.tsx` e `infra/router-adapter.test.tsx`.
- **Deriva visual sem rede automática** — coberta por comparação manual de capturas.
- **`tw-animate-css` com um mantenedor principal** — só CSS, substituível pelo plano B de T3 sem tocar
  nos componentes.
- **Avisos `allowScripts` do npm 11** no log do `npm ci` — ruído aceito; o npm 12 pode bloquear.
