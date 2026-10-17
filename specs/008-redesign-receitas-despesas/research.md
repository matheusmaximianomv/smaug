# Research: Redesign de Receitas e Despesas

**Feature**: [spec.md](./spec.md) | **Fonte**: design da change OpenSpec `redesign-receitas-despesas`
e [`docs/008-redesign-receitas-despesas/especificacao-tecnica.md`](../../docs/008-redesign-receitas-despesas/especificacao-tecnica.md)

Cada decisão segue o formato Decisão · Razão · Alternativas descartadas.

## Ponto de partida verificado no código

- `app/(app)/{despesas,receitas}/page.tsx` montavam abas com `DataTable` e cards, alimentadas por hooks
  de lista que buscavam **todos** os itens, sem competência.
- O servidor já tinha as consultas mensais consolidadas (`ExpenseQueryService.getConsolidatedExpenses`,
  `RevenueQueryService.getConsolidatedRevenues`), usadas pelo Dashboard e pelo `DataExportService`.
- `POST /expenses/installment/:id/terminate` existia sem uso no web; em `FixedRevenueResponseDto`,
  `versions`/`currentVersion` eram opcionais.
- `useMonthNavigation` vivia em `features/dashboard/hooks`, e `shared/components/MonthNavigator.tsx`
  importava um tipo de `@/features/dashboard/types` (inversão de dependência).
- Consumidores: `MonthYearSelect` (Dados), `Tabs` (Dados), `EmptyState` e `ConfirmDialog` (Categorias),
  `TypeBadge` (Dashboard). `DataTable` só pelas duas páginas reescritas.

## D1 — Regras do servidor prevalecem sobre o protótipo

- **Decisão**: a interface esconde as ações que o servidor recusaria.
- **Razão**: as regras de competência passada estão cobertas por testes e pelo CSV.
- **Alternativas**: relaxar o servidor para casar com o protótipo — reabriria essas regras.

## D2 — "Agora" e situação calculados no servidor

- **Decisão**: `MonthlyCompetence.statusAt(ref)` e `MonthlyCompetence.current(ref)`, em UTC como
  `isPastMonth`; as respostas carregam `competenceStatus` e `reference`.
- **Razão**: um só relógio para tela, Dashboard e CSV.
- **Alternativas**: calcular no front com `getCurrentCompetence()` — diverge na virada do mês (21h de
  31/03 em Brasília já é abril em UTC) e duplica a resolução de versões.

## D3 — Projeções de regra como predicados de domínio compartilhados

- **Decisão**: `canDelete`, `canTerminate` e `isExpired` vêm de `InstallmentExpense.hasPastInstallments`,
  `InstallmentExpense.hasFutureInstallments`, `RecurringExpense.isExpiredAt` e `FixedRevenue.isExpiredAt`,
  chamados **tanto** pelos use cases de delete/terminate **quanto** pelos `toResponseDto`.
- **Razão**: a projeção exibida e a regra aplicada não podem divergir.
- **Alternativas**: booleanos calculados no service/DTO com lógica própria.

## D4 — Resumo anual reaproveita a consulta mensal

- **Decisão**: `getYearSummary(userId, year)` chama o consolidado de cada um dos 12 meses e mantém só
  `competenceStatus` e `totals`; `GET /summary` registrada antes de `GET /` no router de consulta.
- **Razão**: faixa, tela e Dashboard somam igual por construção (mesmo padrão do `DataExportService`).
- **Alternativas**: consulta por intervalo — só com medição que a justifique.

## D5 — `previousAmount` só com consulta extra quando há reajuste no mês

- **Decisão**: se a versão vigente começa na competência consultada, busca-se a versão do mês anterior.
- **Razão**: a consulta extra acontece só para séries que reajustam naquele mês.

## D6 — Prévias no front, espelhando o domínio

- **Decisão**: `shared/lib/preview.ts` com funções puras (`splitInstallments`, `affectedMonths`,
  `seriesSpan`, `seriesTimeline`); `splitInstallments` testada com os mesmos casos do domínio
  (100,00/3; 0,10/3; 4800/12; 1/72).
- **Alternativas**: endpoint de prévia — custo de rede a cada tecla para algo determinístico.

## D7 — Navegação de competência promovida a `shared`, com persistência opcional

- **Decisão**: `shared/hooks/useCompetenceNavigation({ persistKey?, reference? })` substitui o hook do
  Dashboard. Com `persistKey` (`smaug:competencia-lancamentos`, a mesma nas duas telas) lê e grava
  `sessionStorage` em `try/catch`; sem valor salvo, alinha-se uma única vez ao `reference`.
- **Razão**: corrige a inversão `shared → features` e mantém o Dashboard inalterado (sem `persistKey`).

## D8 — Situação da avulsa vem da consulta mensal

- **Decisão**: a Ficha de avulsa decide Editar/Remover pelo `competenceStatus` da consulta de onde foi
  aberta; parcelada e série buscam o detalhe por id.
- **Alternativas**: endpoint de detalhe de avulsa — sem ganho, a avulsa só existe num mês.

## D9 — Mutations invalidam por prefixo e incluem o Dashboard

- **Decisão**: chaves `["expenses", ...]`/`["revenues", ...]`; toda mutation invalida o prefixo da
  natureza e `["dashboard"]`. `addVersion` de receita responde com a versão, então o hook invalida a
  série em vez de usar a resposta.

## D10 — Componentes comuns em `shared/components/lancamentos/`

- **Decisão**: blocos apresentacionais, só props, com variantes `Record<Union, string>` + `cn()`;
  identidade por tipo em `shared/lib/entry-types.ts` e tokens `tipo.*` no Tailwind. Assistente e Ficha
  específicos ficam em cada feature, compondo esses blocos.
- **Razão**: as duas telas têm a mesma estrutura e não podem importar uma da outra.

## D11 — `Modal` e `ConfirmDialog` ampliados, não substituídos

- **Decisão**: `Modal` ganha larguras `xl`/`2xl`, slots de cabeçalho/rodapé e folha inferior até
  768 px; `ConfirmDialog` ganha ícone e a camada `top`. O "Esc fecha só a confirmação" vem do
  aninhamento de diálogos Radix.

## D12 — Formulários com React Hook Form + zod

- **Decisão**: `features/{despesas,receitas}/types/schemas.ts` com schemas discriminados por tipo, de
  versão e de encerramento, com as mensagens pt-BR do PRD; "competência passada" valida contra o
  `reference` do servidor.

## D13 — Remoção restrita ao que perde o consumidor

- **Decisão**: removidos cards, formulários e modais antigos, os hooks de lista substituídos, métodos
  de service sem consumidor, `shared/components/DataTable` e `shared/lib/parseAmount.ts` (absorvido por
  `money.ts`). Mantidos `MonthYearSelect`, `Tabs`, `EmptyState` e `ConfirmDialog`.
- **Razão**: corrige a §4.6 da especificação técnica, que listava esses quatro como candidatos.

## Riscos aceitos

| Risco                                  | Mitigação                                                                   |
| -------------------------------------- | --------------------------------------------------------------------------- |
| 12 consolidações por resumo anual      | Volume de pessoa física; mesmo padrão do export; medir antes de otimizar    |
| Prévia diverge da gravação             | Testes espelho de `splitInstallments`; E2E da parcelada 3× R$ 100,00        |
| Virada de mês com a tela aberta        | Situação vem do servidor; recusa mostra a mensagem mapeada e mantém o modal |
| Selo "Avulsa" muda de cor no Dashboard | Mudança intencional; asserções do Dashboard atualizadas                     |
| Dashboard continua no relógio local    | Divergência possível só na janela de fuso; fora de escopo                   |
