---
description: "Task list for CSV data import/export"
---

# Tasks: Importar e Exportar Dados

**Input**: Design documents from `/specs/006-importar-exportar-dados/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/

> Lista **retroativa**: reconstruída a partir dos commits da branch, para que a feature tenha o mesmo
> rastro que as 001–005. Todas as tarefas estão concluídas; as da Fase 6 nasceram da revisão de
> conformidade contra as skills, feita depois da entrega.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência)
- **[Story]**: US1 exportar · US2 importar · US3 ida e volta

---

## Phase 1: Fundações do domínio

- [x] T001 [US1] Acrescentar `MonthlyCompetence.addMonths` e `MonthlyCompetence.range` em `server/src/domain/value-objects/monthly-competence.value-object.ts`
- [x] T002 [US1] Passar `InstallmentExpense.calculateInstallments` a usar `MonthlyCompetence.addMonths`, removendo a cópia privada em `server/src/domain/entities/installment-expense.entity.ts`
- [x] T003 [P] [US1] Acrescentar ao catálogo `server/src/domain/errors/domain-error.ts`: `ExportPeriodInvalidError`, `ExportPeriodTooLongError`, `ImportEmptyFileError`, `ImportMissingColumnsError`, `ImportNoValidRowsError`
- [x] T004 [US2] Declarar o port `DataImportRepository` e o `ImportPayload` em `server/src/domain/ports/data-import.repository.ts`
- [x] T005 [US2] Escrever `ImportEntriesUseCase` em `server/src/domain/use-cases/data-import/import-entries.use-case.ts` (agrupamento de série, reconstrução de parcelamento truncado, pontos de versão)

**Checkpoint**: domínio fecha sozinho, com testes unitários e sem banco.

## Phase 2: Aplicação

- [x] T006 [P] [US1] `server/src/application/csv/csv-serializer.ts` — BOM, `;`, CRLF, vírgula decimal, escape de aspas, ordem de colunas do contrato
- [x] T007 [P] [US2] `server/src/application/csv/csv-parser.ts` — leitura em grade, BOM opcional, CRLF ou LF, aspas duplicadas, descarte de linha vazia
- [x] T008 [P] [US1] `server/src/application/dtos/data-export.dto.ts` — `dataExportQuerySchema`, `CsvEntryRow`, `DataExportSummaryResponseDto`
- [x] T009 [P] [US2] `server/src/application/dtos/data-import.dto.ts` — `ImportRowErrorCode` e os DTOs de prévia e resultado
- [x] T010 [US1] `DataExportService` — percurso do recorte reusando `RevenueQueryService`/`ExpenseQueryService`, ordenação determinística, limites do modo `full`
- [x] T011 [US2] `DataImportService` — leitura linha a linha com um código de recusa por linha, prévia e gravação

**Checkpoint**: as regras de exportação e importação valem com repositórios em memória.

## Phase 3: Infraestrutura e HTTP

- [x] T012 [US2] `PrismaDataImportRepository` — um `$transaction`, categorias antes das despesas que as referenciam
- [x] T013 [US1] [US2] `DataController` e `createDataRoutes`; montar `/data` em `routes/index.ts` **antes** dos catch-alls
- [x] T014 [US1] [US2] Fiar a fatia em `container.ts` (repositório → use case → services → controller) e exportar `dataController`
- [x] T015 [US1] Expor `Content-Disposition` no CORS e aceitar `express.text({ type: "text/csv", limit: "5mb" })` em `infrastructure/http/server.ts`

**Checkpoint**: os quatro endpoints respondem ponta a ponta contra SQLite.

## Phase 4: Web

- [x] T016 [P] [US1] `web/infra/file-download.ts` — `downloadBlob` e `filenameFromContentDisposition`
- [x] T017 [P] [US1] [US2] Acrescentar os códigos da área a `web/infra/api-error.ts`, mais `getImportRowMessage` e a leitura de corpo de erro em bytes (o download usa `arraybuffer`)
- [x] T018 [US1] [US2] `DadosService` — os quatro endpoints, CSV cru no corpo, timeout maior
- [x] T019 [P] [US1] `useDataExport`; [US2] `useDataImport`
- [x] T020 [US1] [US2] Componentes da feature e a página `app/(app)/dados/page.tsx` com as duas abas
- [x] T021 Promover `MonthYearSelect` de `features/receitas` para `shared/components/` e recolher a navegação duplicada em `shared/components/nav-items.ts`

**Checkpoint**: a tela funciona contra a API real.

## Phase 5: Testes

- [x] T022 [P] Unitários do server: value object, use case, os dois services, o CSV, o repositório Prisma, o controller
- [x] T023 [P] Integração `server/tests/integration/presentation/data.test.ts`, um `.db` próprio, cobrindo cada status
- [x] T024 [P] Web: testes de service, hooks, componentes e integração de página em `web/tests/integration/dados-page.test.tsx`
- [x] T025 [P] E2E `e2e/tests/dados/{exportar,importar}.spec.ts`, incluindo a ida e volta (US3)

**Checkpoint**: cobertura nos gates (100% no server, thresholds por glob no web).

## Phase 6: Conformidade com as skills (revisão retroativa)

- [x] T026 [US1] Remover a dupla validação da query: manter `validateQuery` na rota e ler `req.validatedQuery` no controller (`server-http`, _Inconsistências conhecidas_)
- [x] T027 [US1] [US2] Trocar o `static handle` compartilhado por cadeia `instanceof` **por método** no `DataController` (`server-http` §6)
- [x] T028 Reescrever `data.controller.test.ts` sobre `describeControllerContract`, somando `setHeader` ao `createResponseMock` (`server-testes` §17)
- [x] T029 [US1] Encadear `referenceDate` em `DataExportService` (parâmetro morto + dois "hojes" distintos) e extrair `toSummaryDto`
- [x] T030 [US2] Tornar `DataImportService.parse` privado, `preview` assíncrono, e extrair `toResponseDto` (`server-servico-dto` §6)
- [x] T031 [US2] Acrescentar `RecurringExpense.createForImport` e `RecurringExpenseVersion.createForImport`; parar de usar `rehydrate` para criar (`server-entidade-dominio` §8)
- [x] T032 [US1] Expor `getErrorMessageByCode` em `web/infra/api-error.ts` e extrair `useExportSelection` de `ExportPanel` (constituição frontend II; `web-infra` §10)
- [x] T033 [US2] Extrair `useImportFlow` de `ImportPanel`
- [x] T034 Higiene de teste: `configure` fora do bloco de imports, relógio congelado no `beforeEach`, import estático de `mockNetworkError`, `vi` no import nomeado, e remoção do caminho feliz que o E2E já cobre (`web-testes` §33)
- [x] T035 Trocar o `data-testid="preview-card"` por `role="region"` nomeado (`testes-e2e` §12)
- [x] T036 Escrever esta pasta de spec, com o Constitution Check que a constituição exige, e mover o contrato do CSV para `contracts/csv-format.md`

**Checkpoint**: `npm run validate:deps`, typecheck, as três suítes e o lint passam.
