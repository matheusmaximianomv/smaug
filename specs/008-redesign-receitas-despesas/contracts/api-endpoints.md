# Contrato: API de leitura de lançamentos

Mudanças **aditivas** sobre os contratos de [002-receitas](../../002-receitas/contracts/api-endpoints.md)
e [003-despesas](../../003-despesas/contracts/api-endpoints.md). Nenhum campo existente muda de nome,
tipo ou significado; nenhum código de erro novo; CSV inalterado. Autenticação pelo header `X-User-Id`,
como no resto da API.

Tipos comuns (`server/src/application/dtos/competence.dto.ts` e o value object):

```ts
type CompetenceStatus = "PAST" | "CURRENT" | "FUTURE"; // relativo ao mês corrente do servidor, em UTC
interface ReferenceCompetenceDto {
  year: number;
  month: number;
} // o mês corrente do servidor
```

## Endpoints novos

### `GET /expenses/summary?year=AAAA`

Registrado **antes** de `GET /` no router de consulta de despesas.

**Query** (`validateQuery(yearSummaryQuerySchema)`): `year` inteiro ≥ 2000, obrigatório.

**200**

```json
{
  "year": 2026,
  "reference": { "year": 2026, "month": 4 },
  "months": [
    {
      "month": 1,
      "competenceStatus": "PAST",
      "totals": { "oneTime": 0, "installment": 400, "recurring": 3180, "total": 3580 }
    }
  ]
}
```

`months` tem sempre 12 entradas (1 a 12). Para cada mês M, `totals` é idêntico ao `totals` de
`GET /expenses?competenceYear=AAAA&competenceMonth=M`.

**400** `VALIDATION_ERROR` (sem `year`, não inteiro ou < 2000) · **401** sem `X-User-Id`.

### `GET /revenues/summary?year=AAAA`

Mesmo contrato, com `totals: { oneTimeTotal, fixedTotal, total }`, idêntico ao de `GET /revenues` do
mesmo mês.

## Campos novos em respostas existentes

### `GET /expenses?competenceYear=&competenceMonth=`

| Onde            | Campo                 | Tipo                     | Regra                                                                |
| --------------- | --------------------- | ------------------------ | -------------------------------------------------------------------- |
| raiz            | `competenceStatus`    | `CompetenceStatus`       | Situação da competência consultada                                   |
| raiz            | `reference`           | `ReferenceCompetenceDto` | Mês corrente do servidor                                             |
| cada parcela    | `endYear`, `endMonth` | `number`                 | Competência da última parcela (início + quantidade − 1)              |
| cada recorrente | `previousAmount`      | `number \| null`         | Valor da versão anterior se a vigente começa neste mês; senão `null` |

### `GET /revenues?competenceYear=&competenceMonth=`

| Onde      | Campo              | Tipo                     | Regra                              |
| --------- | ------------------ | ------------------------ | ---------------------------------- |
| raiz      | `competenceStatus` | `CompetenceStatus`       | Situação da competência consultada |
| raiz      | `reference`        | `ReferenceCompetenceDto` | Mês corrente do servidor           |
| cada fixa | `previousAmount`   | `number \| null`         | Mesma regra das recorrentes        |

### Parcelamentos — `GET /expenses/installment[/:id]`, `POST /expenses/installment`, `PATCH /expenses/installment/:id`, `POST /expenses/installment/:id/terminate`

| Onde         | Campo                 | Tipo                               | Regra                                                  |
| ------------ | --------------------- | ---------------------------------- | ------------------------------------------------------ |
| cada parcela | `status`              | `"PAID" \| "CURRENT" \| "PENDING"` | `PAST → PAID`, `CURRENT → CURRENT`, `FUTURE → PENDING` |
| raiz         | `endYear`, `endMonth` | `number`                           | Competência da última parcela                          |
| raiz         | `canDelete`           | `boolean`                          | Nenhuma parcela passada — a regra do `DELETE`          |
| raiz         | `canTerminate`        | `boolean`                          | Existe parcela futura — a regra do `terminate`         |

Coerência com as escritas: com `canDelete: false`, `DELETE /expenses/installment/:id` responde
`INSTALLMENT_HAS_PAST_COMPETENCE`; com `canTerminate: false`, o `terminate` responde
`NO_FUTURE_INSTALLMENTS`.

### Séries — `/expenses/recurring[/:id]` e `/revenues/fixed[/:id]` (todas as respostas)

| Campo       | Tipo                     | Regra                                                                |
| ----------- | ------------------------ | -------------------------------------------------------------------- |
| `isExpired` | `boolean`                | Término anterior ao mês corrente — a regra que recusa o encerramento |
| `reference` | `ReferenceCompetenceDto` | Mês corrente do servidor                                             |

`currentVersion` continua sendo a versão vigente no mês corrente. O detalhe por id de receita fixa
(`GET /revenues/fixed/:id`) traz sempre `versions` e `currentVersion`. Com `isExpired: true`, o
encerramento de recorrente responde `RECURRING_EXPENSE_ALREADY_EXPIRED`.

## Endpoint passou a ter consumidor no web

`POST /expenses/installment/:id/terminate` (existente, sem corpo) — usado pela ação "Encerrar
parcelamento" da Ficha.

## Inalterado

`/health`, `/users`, `/expenses/categories`, `/expenses/one-time`, `/revenues/one-time`, `/data` e
todas as rotas de escrita, além do Dashboard (que consome `GET /expenses` e `GET /revenues` e ignora os
campos novos) e do formato CSV
([006 csv-format](../../006-importar-exportar-dados/contracts/csv-format.md)).
