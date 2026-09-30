# Implementation Plan: Importar e Exportar Dados

**Branch**: `006-importar-exportar-dados` | **Date**: 2026-09-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-importar-exportar-dados/spec.md`

> Plano escrito **retroativamente**: a feature foi implementada antes de a pasta de spec existir. O
> Constitution Check abaixo foi feito contra o código que está na branch, não contra uma intenção —
> os pontos que reprovaram viraram correção, e estão marcados como tal.

## Summary

Área de Dados: exportar os lançamentos para um CSV que abre no Excel pt-BR e importar lançamentos de
fora, com prévia antes de gravar. O motor inteiro (serialização, leitura, reconstrução de séries,
gravação transacional) vive no servidor; o web só dispara o download e sobe o arquivo.

## Technical Context

**Language/Version**: TypeScript 5 strict (ESM), Node 22
**Primary Dependencies**: nenhuma nova — o CSV é lido e escrito à mão (formato estreito e fechado;
uma biblioteca traria mais superfície do que valor)
**Storage**: os agregados já existentes, via um port novo de escrita em lote
**Testing**: Vitest (unit + integração Supertest/SQLite) no server, Vitest + MSW no web, Playwright no e2e
**Target Platform**: mesma API REST e mesmo App Router
**Constraints**: formato do arquivo é contrato congelado ([contracts/csv-format.md](./contracts/csv-format.md));
exportação determinística byte a byte; importação aditiva e transacional
**Scale/Scope**: 4 endpoints, 1 rota web com duas abas, recorte de até 12 meses, upload até 5 MB

## Constitution Check

_GATE: reavaliado em 2026-09-14 contra o código da branch._

### Backend (Constitution v1.1.0)

#### ✅ I. Clean Architecture

- **Status**: PASS
- **Evidence**: `ImportEntriesUseCase` e `DataImportRepository` (port) vivem em `domain/`;
  `PrismaDataImportRepository` em `infrastructure/`; os services em `application/`; o controller em
  `presentation/`. `npm run validate:deps` passa, então `no-domain-to-infra` e
  `no-application-to-infra` valem na prática.
- **Compliance**: a comunicação com o banco atravessa o port; o domínio não conhece Prisma.

#### ⚠️ → ✅ II. Clean Code

- **Status**: PASS **após correção**
- **Evidence**: três desvios foram encontrados e corrigidos nesta branch:
  - `DataExportService.resolveFullBounds` declarava um parâmetro `referenceDate` que **nenhum
    chamador passava** (código morto), e o "hoje" do nome do arquivo era lido em um momento diferente
    do "hoje" dos limites do modo `full`. O relógio passou a ser encadeado de `getSummary`/`exportCsv`
    até `resolveFullBounds`.
  - `ExportPanel` redigia `"O mês final é anterior ao inicial."` à mão, duplicando a frase que
    `web/infra/api-error.ts` já guardava em `EXPORT_PERIOD_INVALID`. A guarda de tela passou a ler a
    cópia da tabela via `getErrorMessageByCode`.
  - A query da exportação era validada duas vezes (middleware `validateQuery` **e** `parse` dentro do
    controller). Ficou só o middleware; o controller lê `req.validatedQuery`.
- **Compliance**: sem código morto, sem duplicação de regra ou de cópia.

#### ✅ III. Independência de Frameworks

- **Status**: PASS
- **Evidence**: o serializador e o leitor de CSV são funções puras sobre string em
  `application/csv/`, sem Express e sem Zod. O domínio segue usando só construções nativas.
- **Compliance**: trocar Express por outro framework não tocaria em `domain/` nem em `application/`.

#### ✅ IV. Baixo Acoplamento

- **Status**: PASS
- **Evidence**: a fiação é manual em `container.ts`, na ordem da fatia (repositório → use case →
  services → controller), com o repositório anotado pelo tipo do port. Nenhum decorator.
- **Compliance**: o use case depende de `DataImportRepository`, não de Prisma.

#### ⚠️ → ✅ V. Sustentabilidade

- **Status**: PASS **após correção**
- **Evidence**: `DataExportService` reusa `RevenueQueryService`/`ExpenseQueryService` em vez de
  reimplementar resolução de versão e junção de categoria. Nenhuma abstração especulativa foi criada.
  O desvio corrigido: `ImportEntriesUseCase` usava `RecurringExpense.rehydrate` para **criar**
  registros — um caminho que dispensa todas as invariantes, não só a trava de competência passada que
  a importação precisa dispensar. Passou a usar `createForImport`, fábrica que abre mão
  exclusivamente da regra temporal.
- **Compliance**: YAGNI respeitado; o bypass ficou explícito e estreito.

### Frontend (Constitution v1.1.0)

#### ✅ I. Arquitetura Orientada a Domínio

- **Status**: PASS
- **Evidence**: `web/features/dados/{components,hooks,services,types}`; rota em `app/(app)/dados`.
- **Compliance**: nada de lógica da feature em `shared/`.

#### ⚠️ → ✅ II. Separação entre UI e Lógica

- **Status**: PASS **após correção**
- **Evidence**: `ExportPanel` carregava o teto de 12 meses, o teste de período invertido, a montagem
  dos parâmetros e a leitura do "agora"; `ImportPanel` carregava quatro `useState`, a leitura do
  arquivo (`File.text()`) e a orquestração das duas mutations. Ambos foram reduzidos a JSX, com a
  regra movida para `useExportSelection` e `useImportFlow`.
- **Compliance**: componentes só renderizam; hooks guardam regra, estado e efeito; services só falam
  com a rede.

#### ✅ III. Independência de Framework

- **Status**: PASS
- **Evidence**: nenhum hook da feature importa `next/navigation`. O download passa por
  `infra/file-download.ts`, costura criada pelo mesmo motivo de `infra/navigation.ts`:
  `URL.createObjectURL` e o clique sintético em `<a download>` não são utilizáveis no jsdom.
- **Compliance**: a lógica da feature roda fora do Next.

#### ✅ IV. Baixo Acoplamento entre Features

- **Status**: PASS
- **Evidence**: `dados` não importa nada de outra feature. `MonthYearSelect`, que era de `receitas` e
  passaria a ser usado por uma terceira feature, foi **promovido para `shared/components/`** — o que
  a skill `web-arquitetura` manda fazer, em vez de acrescentar um segundo import cruzado.
- **Compliance**: compartilhamento só por `shared/` e `infra/`.

#### ✅ V. Sustentabilidade e Simplicidade

- **Status**: PASS
- **Evidence**: `nav-items.ts` recolheu a lista de navegação que `Sidebar` e `BottomNav` duplicavam.
  Nomenclatura: `useX`, `DadosService`, tipos em `types/`.
- **Compliance**: sem código morto.

#### ✅ Architecture / Camadas

- **Status**: PASS
- **Evidence**: `UI → hooks → services → infra`, uma direção só. `"use client"` só nos arquivos com
  estado ou hook — `CodeChip`, que é puro, não leva a diretiva.

### Summary

**Overall Status**: ✅ PASS — com seis desvios encontrados na revisão retroativa e corrigidos na
própria branch (dois em Clean Code backend, um em Sustentabilidade backend, um em Separação UI/Lógica
frontend, mais dupla validação de query e teste de controller fora do harness padrão).

## Project Structure

```text
specs/006-importar-exportar-dados/
├── spec.md
├── plan.md                  # este arquivo
├── data-model.md
├── tasks.md
└── contracts/
    ├── csv-format.md        # contrato congelado do formato
    └── api-endpoints.md

server/src/
├── application/csv/{csv-serializer,csv-parser}.ts
├── application/dtos/{data-export,data-import}.dto.ts
├── application/services/{data-export,data-import}.service.ts
├── domain/ports/data-import.repository.ts
├── domain/use-cases/data-import/import-entries.use-case.ts
├── infrastructure/database/repositories/prisma-data-import.repository.ts
└── presentation/{controllers/data.controller.ts,routes/data.routes.ts}

web/
├── app/(app)/dados/page.tsx
├── features/dados/{components,hooks,services,types}/
├── infra/file-download.ts
└── shared/components/{MonthYearSelect.tsx,nav-items.ts}

e2e/tests/dados/{exportar,importar}.spec.ts
```

## Complexity Tracking

| Decisão                                         | Por que, e o que foi descartado                                                                                                                              |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CSV lido e escrito à mão                        | O formato é estreito e fechado (um separador, um escape, duas quebras de linha aceitas). Uma biblioteca traria superfície e uma dependência para pouco.      |
| Corpo cru `text/csv` em vez de multipart        | Evita `multer` e o ritual de multipart por causa de **um** arquivo de texto.                                                                                 |
| `DataExportService` sem use case                | É leitura pura, e o projeto já tem esse precedente em `RevenueQueryService`/`ExpenseQueryService`, que também injetam só repositórios.                       |
| `DataController` com **duas** dependências      | A skill `server-http` pede uma, chamada `service`. `/data` é uma fatia só, e dividir o controller exigiria mudar a assinatura de `createDataRoutes` por pura |
|                                                 | forma. Exceção consciente, registrada aqui.                                                                                                                  |
| Um round-trip de consulta por mês na exportação | Reusa a resolução de versão e a junção de categoria que já existem. Montar uma consulta única duplicaria regra de negócio para ganhar latência num caminho   |
|                                                 | que o usuário aciona sob demanda.                                                                                                                            |
