---
description: "Task list for the Receitas e Despesas redesign"
---

# Tasks: Redesign de Receitas e Despesas (Smaug v3)

**Input**: Design documents from `/specs/008-redesign-receitas-despesas/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

> As 40 tarefas da change OpenSpec `redesign-receitas-despesas` (`openspec/changes/archive/
2026-10-17-redesign-receitas-despesas/tasks.md`, itens 1.1–9.4), renumeradas no formato Spec Kit.
> Cada fase terminou verde em lint, typecheck, `validate:deps` e nos testes do pacote. Todas estão
> concluídas.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência)
- **[Story]**: US1 ver o mês · US2 assistente · US3 Ficha de avulsa e parcelada · US4 séries ·
  US5 identidade e celular
- Entre parênteses, o id da tarefa OpenSpec de origem

---

## Phase 1: Fundações do web

**Purpose**: pré-requisitos sem os quais nenhuma tela nova compila; independente da Fase 2.

- [x] T001 [US1] Mover `features/dashboard/hooks/useMonthNavigation.ts` para `web/shared/hooks/useCompetenceNavigation.ts` com `persistKey?` (`sessionStorage` em `try/catch`) e `reference?` (alinhamento único); Dashboard importa de `shared` sem `persistKey` (1.1)
- [x] T002 [US1] Tipar `web/shared/components/MonthNavigator.tsx` com `Competence`/`CompetenceStatus` de `shared/lib/competence.ts`, eliminando o import de `features/dashboard` (1.2)
- [x] T003 [P] [US5] Tokens `tipo.*` em `web/tailwind.config.ts` e `web/shared/lib/entry-types.ts` (`EntryKind`, `ENTRY_KIND`, `versionTint`) (1.3)
- [x] T004 [US5] `web/shared/components/TypeBadge.tsx` sobre `ENTRY_KIND`, com ícone e Avulsa em azul; asserções de `tests/integration/dashboard-page.test.tsx` ajustadas (1.4)
- [x] T005 [P] [US3] Ampliar `web/shared/components/Modal.tsx` (larguras `xl`/`2xl`, slots, folha inferior ≤ 768 px) e `ConfirmDialog.tsx` (ícone, camada `top`, Esc fecha só a confirmação) (1.5)
- [x] T006 [P] Corrigir o `CLAUDE.md` (local de `MonthYearSelect`; referência ao protótipo) (1.6)

**Checkpoint**: `categorias-page.test.tsx` e o teste do Dashboard verdes sem mudança de comportamento.

## Phase 2: API de leitura do servidor

**Purpose**: os campos que as telas consomem; aditiva, pode ir antes do web.

- [x] T007 [US1] `CompetenceStatus`, `statusAt(ref)` e `static current(ref)` em `server/src/domain/value-objects/monthly-competence.value-object.ts` (UTC), com testes de fronteira de mês e ano (2.1)
- [x] T008 [US3] Predicados `hasPastInstallments`, `hasFutureInstallments` e `getEndCompetence` em `InstallmentExpense`, `isExpiredAt` em `RecurringExpense` e `FixedRevenue`; use cases de delete/terminate passam a usá-los com `MonthlyCompetence.current()` (2.2)
- [x] T009 [US1] `competenceStatus`, `reference`, `endYear/endMonth` e `previousAmount` em `ExpenseQueryService.getConsolidatedExpenses` e `expense-query.dto.ts` (2.3)
- [x] T010 [P] [US1] `competenceStatus`, `reference` e `previousAmount` em `RevenueQueryService.getConsolidatedRevenues` e `revenue-query.dto.ts` (2.4)
- [x] T011 [US1] `getYearSummary` nos dois query services, `yearSummaryQuerySchema` em `competence.dto.ts`, `summary` nos controllers e `router.get("/summary")` antes de `"/"` (2.5)
- [x] T012 [US3] [US4] `status` por parcela, `endYear/endMonth`, `canDelete`, `canTerminate` em todas as respostas de parcelamento; `isExpired` e `reference` nas de recorrente e fixa (2.6)
- [x] T013 Integração Supertest/SQLite em `server/tests/integration/presentation/lancamentos-read-api.test.ts`: resumos (200/400/401), campos novos, coerência `canDelete`/`canTerminate` com as escritas, `isExpired` e não captura de `/revenues/fixed` e `/expenses/recurring` (2.7)
- [x] T014 Dashboard e exportação CSV inalterados, com os testes de integração existentes verdes sem edição (2.8)

**Checkpoint**: `npm run --prefix server test` com cobertura 100%.

## Phase 3: Libs de prévia e UI compartilhada

- [x] T015 [P] [US1] `web/shared/lib/competence.ts`: `diffMonths`, `formatCompetenceShort`, `formatCompetenceLong`, `monthRange` (3.1)
- [x] T016 [P] [US2] `web/shared/lib/money.ts` (`parseMoneyInput`, `isValidMoneyInput`, `toMoneyInput`, `formatCompactCurrency`), absorvendo `parseAmount.ts` (3.2)
- [x] T017 [P] [US2] [US4] `web/shared/lib/preview.ts` (`splitInstallments`, `affectedMonths`, `seriesSpan`, `seriesTimeline`) com os casos espelho do domínio (100,00/3; 0,10/3; 4800/12; 1/72) (3.3)
- [x] T018 [US1] Navegação e lista em `web/shared/components/lancamentos/`: `MonthHeader`, `MonthStrip`, `MonthSummary`, `EntryGroup`, `EntryRow`, `LedgerEmptyState`, `ProgressBar` (3.4)
- [x] T019 [US2] Formulário e revisão: `StepIndicator`, `ChoiceCard`/`ChoiceCardGroup` (`role="radio"`), `MiniGrid`, `MoneyField`, `Stepper`, `CompetenceSelect`, `AffectedMonths` (3.5)
- [x] T020 [US3] [US4] Ficha: `EntryDetailHeader`, `FactGrid`, `MonthCells`, `Legend`, `VersionChips`, `VersionHistoryList`, listra e hachura (3.6)
- [x] T021 Novos arquivos nos thresholds por glob de `web/vitest.config.ts` (3.7)

**Checkpoint**: `npm run --prefix web test:coverage` dentro dos thresholds.

## Phase 4: Despesas — tela principal (US1) 🎯 MVP

- [x] T022 [US1] `features/despesas/types/index.ts` (`ExpenseMonth`, `ExpenseYearSummary`, `InstallmentStatus`, campos novos) e `types/schemas.ts` com as mensagens do PRD (4.1)
- [x] T023 [US1] `DespesasService`: `getMonth`, `getYearSummary`, `getInstallment`, `getRecurring(id)`, `terminateInstallment` (4.2)
- [x] T024 [P] [US1] Harness: handlers MSW de `/expenses`, `/expenses/summary`, detalhes e `terminate` calculando os campos novos do `db`; fixtures em `web/tests/fixtures/expense.ts` (4.3)
- [x] T025 [US1] `useExpenseMonth(c)` (grupos e view-model de linha) e `useExpenseYearSummary(year)` (4.4)
- [x] T026 [US1] `DespesasScreen` e `app/(app)/despesas/page.tsx` reduzida a `<DespesasScreen />`; `tests/integration/despesas-page.test.tsx` reescrito (4.5)

**Checkpoint**: a tela de Despesas mostra o mês, a faixa e o resumo contra o MSW.

## Phase 5: Despesas — assistente (US2)

- [x] T027 [US2] `useExpenseMutations()` invalidando `["expenses"]` e `["dashboard"]`, com toasts e "Tentar novamente" (5.1)
- [x] T028 [US2] `useExpenseWizard({ initialCompetence, reference, edit? })` (5.2)
- [x] T029 [US2] `ExpenseWizard` (Tipo, Detalhes, Revisão); erro do servidor mantém o assistente aberto (5.3)

## Phase 6: Despesas — Fichas (US3, US4)

- [x] T030 [US3] [US4] `useInstallmentExpense(id)`, `useRecurringExpense(id)` e `web/shared/hooks/useSeriesActions` (modos `view/version/end/confirm`, prévias, `can`) (6.1)
- [x] T031 [US3] [US4] `ExpenseFicha`, `OneTimeExpenseFicha`, `InstallmentExpenseFicha` e `RecurringExpenseFicha`, com confirmações e textos do PRD; integração cobre avulsa passada, parcela paga, série encerrada, Esc e os códigos de erro (6.2)

## Phase 7: Receitas (US1–US4)

- [x] T032 [US1] `features/receitas/types` (+ `schemas.ts`), `ReceitasService` (`getMonth`, `getYearSummary`, `getFixed(id)`), handlers MSW e fixtures (7.1)
- [x] T033 [US2] [US4] `useRevenueMonth`, `useRevenueYearSummary`, `useFixedRevenue(id)`, `useRevenueMutations` e `useRevenueWizard` (fixa com término início + 11, modalidade Alterável) (7.2)
- [x] T034 [US1] [US2] [US4] `ReceitasScreen`, `RevenueWizard`, `RevenueFicha`, `OneTimeRevenueFicha` e `FixedRevenueFicha` sobre `useSeriesActions`, sem import de `despesas`; `tests/integration/receitas-page.test.tsx` reescrito (7.3)

## Phase 8: Limpeza

- [x] T035 Remover componentes, hooks de lista e métodos de service sem consumidor das duas features, com seus testes (8.1)
- [x] T036 Remover `shared/components/DataTable` e manter `MonthYearSelect`, `Tabs`, `EmptyState` e `ConfirmDialog` (8.2)

## Phase 9: E2E e verificação

- [x] T037 [US1] [US2] [US3] [US4] Reescrever `e2e/tests/despesas/{avulsas,parceladas,recorrentes}.spec.ts` (parcelada 3× R$ 100,00, grade Paga/Atual após `shiftClock`, reajuste, encerramento) (9.1)
- [x] T038 [US2] [US4] Reescrever `e2e/tests/receitas/{avulsas,fixas,fixas-versionamento}.spec.ts` e revisar `tests/despesas/categorias.spec.ts` (9.2)
- [x] T039 [US1] [US5] `e2e/tests/lancamentos/navegacao.spec.ts` (persistência do mês) e trechos de `tests/responsive/mobile.mobile.spec.ts` (faixa rolável, modal na base, 375 px) (9.3)
- [x] T040 Verificação completa da raiz (lint, test, `validate:deps`, typecheck dos três pacotes, `test:e2e`) e conferência dos 12 critérios do PRD §8 (9.4)

## Phase 10: Fechamento

- [x] T041 `/opsx:verify` sem pendências críticas; skills de `.claude/skills/` e `CLAUDE.md` atualizados para o código novo
- [x] T042 Arquivar a change OpenSpec e sincronizar as specs principais `openspec/specs/lancamentos/{consulta-api,extrato-mensal,assistente,ficha}`
- [x] T043 Escrever esta pasta de spec no formato Spec Kit, com o Constitution Check

**Checkpoint**: `npm run validate:deps`, typecheck, as três suítes e o lint passam.

## Dependencies & Execution Order

- Fases 1 e 2 são independentes entre si; a Fase 3 depende da 1; as Fases 4–7 dependem de 1, 2 e 3.
- Despesas (4–6) veio antes de Receitas (7), que reaproveitou `useSeriesActions` e os blocos de `shared`.
- Limpeza (8) só depois de as duas telas novas estarem no ar; E2E (9) por último.

## Pendência conhecida (fora das tarefas)

- Contorno do mês corrente na linha do tempo da Ficha descartado pelo `tailwind-merge` — ver
  [plan.md § Known Issues](./plan.md#known-issues).
