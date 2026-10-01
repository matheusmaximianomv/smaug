# Implementation Plan: Migrations Multi-Banco

**Branch**: `007-migrations-multi-banco` | **Date**: 2026-09-30 | **Spec**: [spec.md](./spec.md)

> Plano escrito junto com a implementação: as decisões abaixo foram validadas contra o código da
> branch (SQLite, PostgreSQL 16 em container e a imagem Docker), não só projetadas.

## Summary

Os comandos do Prisma passam a rodar por um wrapper (`server/scripts/prisma.mjs`) que resolve o
provider pelo ambiente e, na falta, pelo `server/.env`, deriva `prisma/<provider>/schema.prisma` do
schema de origem (que deixa de ser reescrito) e passa esse caminho em `--schema`. Como o Prisma 4
procura as migrations ao lado do schema, cada provider ganha a sua pasta versionada. Dois scripts
novos, `migrate:new` e `migrate:check`, mantêm as pastas em paridade, e o CI roda o segundo.

## Technical Context

**Language/Version**: Node 22, ESM (`.mjs`) — scripts de ferramental, fora de `server/src`
**Primary Dependencies**: nenhuma nova — `dotenv` (já dependência do server) e o CLI do Prisma 4.16
**Storage**: SQLite (dev/testes) e PostgreSQL 16 (Docker/produção)
**Testing**: suíte existente (Vitest unit + integração, Playwright) sem mudança de asserção; os
cenários das user stories foram exercitados à mão contra SQLite e um Postgres descartável
**Constraints**: Prisma 4 não aceita diretório de migrations configurável nem `env()` no `provider`
do datasource — daí o schema derivado por pasta

## Constitution Check

_GATE: avaliado em 2026-09-30 contra o código da branch._

- **I. Clean Architecture — PASS.** Em `server/src` só mudam `env.ts` e `container.ts`, os dois em
  `infrastructure/` (ver D5); a persistência continua atrás dos ports.
- **II. Clean Code — PASS.** A lógica comum (ambiente, provider, schema derivado, paridade, banco
  sombra) está num módulo só, `scripts/lib/prisma-env.mjs`, consumido pelos três scripts.
  `prisma-prepare.mjs` foi **removido**, não deixado como código morto.
- **III. Independência de Frameworks — PASS (não se aplica).** Mudança só de ferramental.
- **IV. Baixo Acoplamento — PASS.** O E2E e os testes de integração dependem só do caminho do schema
  derivado; o E2E usa o wrapper em vez de reimplementar a resolução do provider.
- **V. Sustentabilidade / YAGNI — PASS.** Dois providers fixos, nenhuma abstração para um terceiro.
  O `migrate dev` foi bloqueado, em vez de reimplementado, porque criaria migration num dialeto só.

## Decisões

### D1 — Layout

```
server/prisma/
├── schema.prisma               fonte única (versionado, nunca reescrito)
├── sqlite/{schema.prisma, migrations/}       derivado (gitignored) + migrations SQLite
└── postgresql/{schema.prisma, migrations/}   derivado (gitignored) + migrations PostgreSQL
```

O `provider` escrito na fonte (`sqlite`) só existe para ela continuar um schema válido (editor,
postinstall do `@prisma/client`); os scripts sempre o substituem na cópia derivada.

### D2 — Resolução do ambiente

`dotenv.config({ path: server/.env })` sem `override`: o sistema vence o arquivo, exatamente como o
`env.ts`. O caminho do `.env` é absoluto a partir do script, então `--prefix` e qualquer diretório
corrente funcionam. Provider ausente ou fora de `postgresql|sqlite|memory` → erro, sem padrão.

### D3 — Baseline PostgreSQL com os mesmos nomes

Para manter FR-006 (mesmos nomes), a baseline PostgreSQL não é uma migration única: são as duas
migrations existentes, geradas com `migrate diff --from-schema-datamodel`. O estado intermediário é o
schema do commit `614d782` (receitas). Antes de gerar, conferimos que a migration SQLite 1 reproduz
exatamente aquele schema e que as duas reproduzem o schema atual.

### D4 — `migrate:new` e `migrate:check`

Os dois usam `migrate diff --from-migrations <pasta> --to-schema-datamodel <derivado>`, que exige um
banco sombra. No SQLite ele é um arquivo temporário. No PostgreSQL ele vem de
`POSTGRES_SHADOW_DATABASE_URL`, é **apagado** a cada uso e, se não existir, é criado pela base
`postgres` do mesmo servidor (`db execute`), porque o `migrate diff` não o cria. `migrate:new`
recusa um nome repetido, pastas já divergentes e schema sem mudança. Os nomes seguem o formato do
`migrate dev`, `AAAAMMDDhhmmss_nome` em UTC.

### D5 — Caminho relativo do SQLite parte de `server/`

O Prisma resolve caminho SQLite relativo a partir da pasta do schema, tanto no CLI quanto no client
gerado (`relativePath`). Com o schema derivado em `prisma/sqlite/`, isso fazia
`file:./prisma/sqlite/dev.db` virar `prisma/sqlite/prisma/sqlite/dev.db`, e ninguém lê o `.env`
esperando essa regra. A regra adotada é: **caminho relativo parte de `server/`**, a pasta do `.env`.
O wrapper (`resolveSqliteUrl` em `scripts/lib/prisma-env.mjs`) e o runtime (`env.ts`, via
`infrastructure/config/sqlite-url.ts`) tornam o caminho absoluto antes de entregá-lo ao Prisma. O `container.ts` passou a usar o
client único de `database/config.ts`, que recebe a URL já resolvida; antes ele criava um segundo
`PrismaClient` sem URL, que leria a variável crua. Isso reverte a NFR-002 (sem mudança em
`server/src`) em dois arquivos de infraestrutura.

Os testes de integração passaram a usar caminho absoluto, porque o CLI, o client do próprio teste e
o app precisam abrir o mesmo arquivo.

### D6 — Docker

Além de gerar o client e aplicar as migrations pelo wrapper, a imagem tinha três defeitos anteriores
à feature, que impediam SC-003 e foram corrigidos:

- `tsup.config.ts` não era copiado, e o `npm run build` falhava;
- `npm ci --omit=dev` rodava o `prepare` (husky, que é devDependency);
- sem `openssl`, o Prisma não detectava a libssl no Alpine e escolhia a engine errada.

## Verificação

| Cenário                                                | Resultado                                   |
| ------------------------------------------------------ | ------------------------------------------- |
| US1-1/2 — generate + deploy só com `.env`              | client SQLite, migrations aplicadas         |
| US1-4/5 — provider ausente / inválido                  | erro com a variável e os valores aceitos    |
| US1-6 — banco migrado no layout antigo, movido         | "No pending migrations to apply"            |
| D5 — `file:./prisma/sqlite/dev.db` no CLI e no runtime | os dois abrem `server/prisma/sqlite/dev.db` |
| US2-1/3 — imagem contra Postgres vazio                 | 2 migrations aplicadas, `/health` 200       |
| US2-4 — importar/exportar/consultar em Postgres        | 5 tipos de lançamento gravados e relidos    |
| US3-1 — `migrate:new` após adicionar um campo          | mesma pasta nos dois dialetos               |
| US3-2 — migration órfã                                 | `migrate:check` falha apontando a órfã      |
| US3-3 — schema alterado sem migration                  | `migrate:check` falha nos dois providers    |
| Edge — nome repetido no `migrate:new`                  | recusado listando as duas pastas            |
| SC-002 — `git status` após os comandos                 | nenhum arquivo versionado alterado          |
| SC-006 — suíte do server                               | 98 arquivos, 858 testes passando            |
| SC-006 — E2E (Playwright)                              | 121 testes passando                         |
