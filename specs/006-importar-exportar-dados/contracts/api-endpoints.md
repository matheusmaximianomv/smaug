# Contrato: endpoints da Área de Dados

Montados em `/data`, atrás de `extractUser(userRepository)` e **antes** dos catch-alls `/revenues` e
`/expenses` (`server/src/presentation/routes/index.ts`). Autenticação é o header `X-User-Id`, como no
resto da API.

## `GET /data/export/summary`

Prévia da exportação. Não produz arquivo.

**Query** (validada por `validateQuery(dataExportQuerySchema)`):

| Campo        | Tipo                 | Obrigatório          |
| ------------ | -------------------- | -------------------- |
| `mode`       | `"period" \| "full"` | sim                  |
| `startYear`  | número ≥ 2000        | quando `mode=period` |
| `startMonth` | número 1–12          | quando `mode=period` |
| `endYear`    | número ≥ 2000        | quando `mode=period` |
| `endMonth`   | número 1–12          | quando `mode=period` |

**200**

```json
{ "total": 3, "revenues": 1, "expenses": 2, "periodStart": "2026-04", "periodEnd": "2026-04" }
```

`periodStart` e `periodEnd` são `null` quando a base está vazia em `mode=full`.

**400** `VALIDATION_ERROR` (query fora do schema), `EXPORT_PERIOD_INVALID` (fim antes do início),
`EXPORT_PERIOD_TOO_LONG` (mais de 12 meses).
**401** `UNAUTHORIZED` · **404** `USER_NOT_FOUND`.

## `GET /data/export`

Mesma query. Responde o arquivo.

**200** — corpo é o CSV (ver [csv-format.md](./csv-format.md)), com:

```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="smaug-lancamentos-2026-09-14.csv"
```

`Content-Disposition` está em `exposedHeaders` do CORS para que o navegador o entregue ao cliente.

**400** os mesmos códigos do summary · **401** / **404** idem.

## `POST /data/import/preview`

Confere o arquivo **sem gravar nada**.

**Request**: corpo cru do CSV, `Content-Type: text/csv` (lido por `express.text`, teto de 5 MB).
Não é multipart.

**200**

```json
{
  "validRows": 2,
  "errors": [{ "line": 3, "code": "MISSING_CATEGORY" }],
  "counts": { "oneTime": 1, "fixed": 1, "installment": 0, "recurring": 0, "series": 1 }
}
```

`errors[].value` acompanha o código quando há um valor do arquivo a citar (a competência ilegível, o
par `5/3` de parcela). `counts.series` conta as séries agrupadas, não as linhas.

**400** `IMPORT_EMPTY_FILE`, `IMPORT_MISSING_COLUMNS` · **401** / **404** idem.

## `POST /data/import`

Grava. Mesmo formato de requisição da prévia.

**201**

```json
{
  "total": 2,
  "created": {
    "oneTimeRevenues": 1,
    "fixedRevenues": 0,
    "oneTimeExpenses": 1,
    "installmentExpenses": 0,
    "recurringExpenses": 0
  },
  "categoriesCreated": 1
}
```

**400** `IMPORT_EMPTY_FILE`, `IMPORT_MISSING_COLUMNS`
**422** `IMPORT_NO_VALID_ROWS` — o arquivo é legível, mas nenhuma linha sobreviveu
**401** / **404** idem.

Linhas inválidas **não** impedem a gravação das válidas: só a ausência total de linhas válidas
recusa a chamada. A gravação inteira acontece num único `$transaction`.
