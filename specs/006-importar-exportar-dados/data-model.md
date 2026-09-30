# Data Model: Importar e Exportar Dados

**Nenhuma tabela nova.** A feature não acrescenta entidade persistida: ela lê os agregados que já
existem e grava neles. O que ela introduz são um **port de escrita em lote**, duas **estruturas de
transporte** e duas **fábricas de domínio**.

## O que NÃO mudou

O schema Prisma é o mesmo. `ExpenseCategory`, `OneTimeRevenue`, `FixedRevenue` (+ versões),
`OneTimeExpense`, `InstallmentExpense` (+ `Installment`) e `RecurringExpense` (+ versões) são criados
pelas próprias fábricas de domínio, com os mesmos invariantes de sempre.

## Estruturas novas

### `ImportEntryInput` — uma linha do arquivo, já lida

`server/src/domain/use-cases/data-import/import-entries.use-case.ts`

| Campo                                    | Tipo                                                    | Nota                                        |
| ---------------------------------------- | ------------------------------------------------------- | ------------------------------------------- |
| `line`                                   | `number`                                                | linha na planilha, para reportar erro       |
| `competenceMonth` / `competenceYear`     | `number`                                                | já validados contra `MonthlyCompetence`     |
| `nature`                                 | `"REVENUE" \| "EXPENSE"`                                | vocabulário do domínio, não do arquivo      |
| `category`                               | `string`                                                | nome; vazio em receita                      |
| `description`                            | `string`                                                | já com `trim()`                             |
| `amount`                                 | `number`                                                | positivo, até duas casas                    |
| `type`                                   | `"ONE_TIME" \| "FIXED" \| "INSTALLMENT" \| "RECURRING"` |                                             |
| `installmentNumber` / `installmentCount` | `number \| null`                                        | preenchidos só em `INSTALLMENT`             |
| `seriesId`                               | `string`                                                | agrupador do arquivo; **descartado** depois |

### `ImportPayload` — o lote pronto para gravar

`server/src/domain/ports/data-import.repository.ts`. Carrega **entidades de domínio já construídas**,
agrupadas por agregado, com os filhos junto do pai (`{ revenue, versions }`,
`{ expense, installments }`). O port tem um método só:

```ts
persist(payload: ImportPayload): Promise<void>;
```

Uma transação só, categorias primeiro (as despesas do lote apontam para elas). A importação não
deduplica, então uma gravação parcial não poderia ser repetida sem duplicar o que já entrou — por
isso é tudo ou nada.

### `CsvEntryRow` — uma linha a caminho do arquivo

`server/src/application/dtos/data-export.dto.ts`. Já no vocabulário pt-BR do CSV (`receita`,
`parcelada`), ainda sem formatação de texto: o valor continua `number` e vira `9200,00` só no
serializador.

## Fábricas de domínio acrescentadas

`RecurringExpense.createForImport(props)` e `RecurringExpenseVersion.createForImport(props)`.

O `create()` dessas duas entidades rejeita competência passada, e a importação existe justamente para
trazer histórico. `createForImport` dispensa **apenas** essa trava: faixa de mês/ano, fim-antes-do-
início, descrição e valor continuam sendo cobrados pela entidade. As três fábricas
(`create`, `createForImport`, e o `build` privado) compartilham a mesma construção.

`rehydrate` **não** serve para isso: ele pula todas as invariantes de uma vez e segue reservado ao
repositório, que reconstrói linhas já gravadas.

## Regras de reconstrução de série na importação

- **Agrupamento**: `${type}|${seriesId || description}`. Sem `serie_id`, a descrição faz o papel.
- **Ordenação interna**: por competência crescente.
- **Parcelada**: a série pode chegar truncada (exportar só abril traz a parcela 3/12 sozinha).
  `installmentCount` guarda o tamanho real da compra, `totalAmount` soma **só o que veio no arquivo**,
  e apenas as parcelas presentes são gravadas. O início é retrocedido a partir do número da primeira
  parcela presente. `calculateInstallments()` não é usado: ele regeraria as doze parcelas com rateio
  próprio, inventando o que o arquivo não trouxe.
- **Fixa / recorrente**: cada troca de conteúdo entre linhas consecutivas vira uma **versão** nova —
  é o que preserva o histórico de alterações. A assinatura comparada é descrição + valor (e categoria,
  nas recorrentes).
- **Categoria**: procurada pelo nome em minúsculas entre as existentes do usuário; criada quando não
  houver, uma vez só por lote.
