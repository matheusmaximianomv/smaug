# Implementation Plan: Redesign de Receitas e Despesas (Smaug v3)

**Branch**: `008-redesign-receitas-despesas` | **Date**: 2026-10-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/008-redesign-receitas-despesas/spec.md`

> Plano consolidado a partir da change OpenSpec `redesign-receitas-despesas` (proposal, design e
> tasks em `openspec/changes/archive/2026-10-17-redesign-receitas-despesas/`). O Constitution Check
> abaixo foi feito contra o código da branch, depois da implementação e do `/opsx:verify`.

## Summary

Reorganiza Receitas e Despesas por competência ("Extrato do mês"), com um assistente Tipo → Detalhes →
Revisão para cadastro e uma Ficha por lançamento com apenas as ações que o servidor aceita. O servidor
ganha, de forma aditiva, a situação da competência relativa ao seu "agora" (UTC), o resumo anual e as
projeções das regras de remoção, encerramento e expiração; o web passa a confiar nesses campos em vez
do relógio local.

## Technical Context

**Language/Version**: TypeScript 5 strict (ESM), Node 22; React 19 RC, Next.js 15 App Router
**Primary Dependencies**: nenhuma nova — Radix Dialog/Tabs, React Hook Form + zod, TanStack Query 5,
lucide-react e Tailwind 3 já existiam
**Storage**: sem migration; os agregados existentes. No navegador, `sessionStorage` só para o mês
selecionado
**Testing**: Vitest (unit + integração Supertest/SQLite) no server, Vitest + MSW no web, Playwright no e2e
**Target Platform**: mesma API REST e mesmo App Router
**Constraints**: mudanças de API só aditivas; CSV congelado; cobertura 100% no server e thresholds por
glob no web; `validate:deps` verde; sem import entre `receitas` e `despesas`
**Scale/Scope**: 2 endpoints novos (`/expenses/summary`, `/revenues/summary`), campos novos em 6
famílias de resposta, 2 telas reescritas, 26 componentes compartilhados novos

## Constitution Check

_GATE: reavaliado em 2026-10-17 contra o código da branch._

### Backend (Constitution v1.1.0)

#### ✅ I. Clean Architecture

- **Status**: PASS
- **Evidence**: as regras novas (`MonthlyCompetence.statusAt`/`current`,
  `InstallmentExpense.hasPastInstallments`/`hasFutureInstallments`/`getEndCompetence`,
  `Installment.statusAt`, `RecurringExpense.isExpiredAt`, `FixedRevenue.isExpiredAt`) vivem em
  `domain/`; os services só as chamam. `npm run validate:deps`: sem violações (955 módulos).
- **Compliance**: a regra de "parcela passada" saiu do repositório Prisma
  (`PrismaInstallmentExpenseRepository.hasPastInstallments` removido) para o domínio.

#### ✅ II. Clean Code

- **Status**: PASS
- **Evidence**: os use cases que liam `getUTCFullYear()/getUTCMonth()` à mão passaram a usar
  `MonthlyCompetence.current()`; `ReferenceCompetenceDto` e `yearSummaryQuerySchema` ficaram num único
  `competence.dto.ts`, compartilhado pelas duas naturezas.

#### ✅ III. Independência de Frameworks

- **Status**: PASS
- **Evidence**: os predicados recebem `Date` e retornam `boolean`/`CompetenceStatus`; nenhum tipo de
  Express ou Prisma entrou no domínio.

#### ✅ IV. Baixo Acoplamento

- **Status**: PASS
- **Evidence**: nenhum nó novo em `container.ts`; `getYearSummary` é método dos query services já
  fiados, e `summary` dos controllers de consulta já existentes.

#### ✅ V. Sustentabilidade

- **Status**: PASS
- **Evidence**: o resumo anual reaproveita a consulta mensal (D4) em vez de criar uma consulta por
  intervalo; `previousAmount` só consulta a versão anterior quando há reajuste no mês (D5).

### Frontend (Constitution v1.1.0)

#### ✅ I. Arquitetura Orientada a Domínio

- **Status**: PASS
- **Evidence**: tela, assistente e Ficha de cada natureza em `features/{despesas,receitas}`; o que é
  comum às duas foi para `shared/components/lancamentos/`, `shared/lib/` e `shared/hooks/`.

#### ✅ II. Separação entre UI e Lógica

- **Status**: PASS
- **Evidence**: regras e estado em hooks (`useExpenseWizard`, `useRevenueWizard`, `useSeriesActions`,
  `useCompetenceNavigation`, `use*Month`, `use*Mutations`); cálculos puros em `shared/lib/{preview,
money,ledger,competence}.ts`; os componentes de `shared/components/lancamentos/` são só props.
  Nenhum componente usa `apiClient`.

#### ✅ III. Independência de Framework

- **Status**: PASS
- **Evidence**: nenhum hook importa `next/navigation`; `sessionStorage` é acessado só dentro de
  `useCompetenceNavigation`, em `try/catch`.

#### ✅ IV. Baixo Acoplamento entre Features

- **Status**: PASS
- **Evidence**: `grep` não encontra import entre `receitas` e `despesas`. `useMonthNavigation` foi
  promovido de `features/dashboard` para `shared/hooks/useCompetenceNavigation`, e `MonthNavigator`
  deixou de importar tipo de `features/dashboard` — o que corrige uma inversão `shared → features`
  anterior. (Restam `AppShell` e `Sidebar` importando `useAuth`, inalterados por esta feature.)

#### ✅ V. Sustentabilidade e Simplicidade

- **Status**: PASS
- **Evidence**: removidos 12 componentes, 5 hooks de lista, `DataTable` e `parseAmount.ts` sem
  consumidor; mantidos os quatro primitivos que Dados e Categorias usam (D13). Sem `cva`.

### Summary

**Overall Status**: ✅ PASS — sem desvios abertos de constituição.

## Project Structure

### Documentation (this feature)

```text
specs/008-redesign-receitas-despesas/
├── spec.md
├── plan.md                  # este arquivo
├── research.md              # decisões D1–D13
├── data-model.md
├── contracts/
│   └── api-endpoints.md     # campos e endpoints novos da API de leitura
├── checklists/
│   └── requirements.md
└── tasks.md

docs/008-redesign-receitas-despesas/{prd,especificacao-tecnica}.md
openspec/specs/lancamentos/{consulta-api,extrato-mensal,assistente,ficha}/spec.md
```

### Source Code (repository root)

```text
server/src/
├── domain/value-objects/monthly-competence.value-object.ts   # CompetenceStatus, statusAt, current
├── domain/entities/{installment,installment-expense,recurring-expense,fixed-revenue}.entity.ts
├── domain/use-cases/{installment-expense,recurring-expense,fixed-revenue}/*  # usam os predicados
├── application/dtos/competence.dto.ts                       # novo: yearSummaryQuerySchema, reference
├── application/dtos/{expense-query,revenue-query,installment-expense,recurring-expense,fixed-revenue}.dto.ts
├── application/services/{expense-query,revenue-query}.service.ts   # getYearSummary, previousAmount
├── application/services/{installment-expense,recurring-expense,fixed-revenue}.service.ts
└── presentation/{controllers,routes}/{expense,revenue}-query.*     # summary antes de "/"

web/
├── app/(app)/{despesas,receitas}/page.tsx       # reduzidas a <DespesasScreen/> e <ReceitasScreen/>
├── features/despesas/{components,hooks,services,types}/
├── features/receitas/{components,hooks,services,types}/
├── shared/components/lancamentos/               # blocos de extrato, assistente e Ficha
├── shared/components/{Modal,ConfirmDialog,TypeBadge,MonthNavigator}.tsx
├── shared/hooks/{useCompetenceNavigation,useSeriesActions}.ts
├── shared/lib/{competence,entry-types,ledger,money,preview}.ts
└── tailwind.config.ts                           # tokens tipo.*

e2e/tests/{despesas,receitas,lancamentos,responsive}/
```

**Structure Decision**: monorepo existente (server + web + e2e), sem pacote novo.

## Complexity Tracking

| Decisão                                          | Por que, e o que foi descartado                                                                                   |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| 12 consultas mensais por resumo anual            | Garante soma idêntica à tela e ao Dashboard. Consulta por intervalo duplicaria a resolução de versão.             |
| Prévia de parcelas duplicada no front            | Determinística e testada com os casos do domínio; um endpoint de prévia custaria rede a cada tecla.               |
| Assistente e Ficha por feature, blocos em shared | As duas naturezas não podem importar uma da outra; só os blocos apresentacionais e `useSeriesActions` são comuns. |

## Known Issues

O `cn()` passa as classes pelo `tailwind-merge` 3.x, que segue as regras do Tailwind 4 e trata
`outline` e `outline-N` como o mesmo grupo: no Tailwind 3 do projeto, isso descartava o
`outline-style: solid` e o contorno não aparecia. Os dois casos foram resolvidos pela feature
`009-upgrades-next16-tailwind4-node24`, que levou o projeto ao Tailwind 4 (onde `outline-2` já é
sólido).

- **Contorno do mês corrente nas Fichas (FR-034)** — **corrigido**: primeiro com
  `[outline-style:solid]` no `MonthCells.tsx`; desde a 009, só com `outline-2`, com asserção em
  `MonthCells.test.tsx`.
- **Anel de foco das linhas do extrato (FR-016, acesso por teclado)** — **corrigido na 009**:
  `EntryRow.tsx` usa `focus-visible:outline-2` e exibe o contorno vermelho sólido de 2 px; ver o
  requisito de foco visível em `specs/009-upgrades-next16-tailwind4-node24/spec.md`.
