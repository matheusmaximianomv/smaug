# API Contracts: Gestão de Despesas

**Branch**: `003-despesas` | **Date**: 2026-03-01
**Base URL**: `http://localhost:3000`

## Authentication

Todas as rotas de despesas exigem o header `X-User-Id` com UUID válido de um usuário existente.

```
X-User-Id: <uuid>
```

**Erro se ausente ou inválido** (rotas protegidas):

```json
{ "error": "UNAUTHORIZED", "message": "Header X-User-Id is required" }
```

HTTP Status: `401`

**Erro se usuário não encontrado**:

```json
{ "error": "USER_NOT_FOUND", "message": "User not found" }
```

HTTP Status: `404`

---

## Common Error Format

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable description",
  "details": {}
}
```

| HTTP Status | Uso                                              |
| ----------- | ------------------------------------------------ |
| 400         | Validação de request body / parâmetros inválidos |
| 401         | Header X-User-Id ausente ou inválido             |
| 404         | Recurso não encontrado                           |
| 409         | Conflito de regra de negócio                     |
| 500         | Erro interno                                     |

---

## 1. Expense Categories (Categorias de Despesas)

> Todas as rotas exigem `X-User-Id` header.

### POST /expenses/categories

Cria uma nova categoria de despesas.

**Request Body**:

```json
{ "name": "Alimentação" }
```

**Validation**:

- `name`: string, 1–100 chars, obrigatório (FR-001)
- Nome único por usuário, case-insensitive (FR-002)

**Response 201**:

```json
{
  "id": "uuid",
  "userId": "uuid",
  "name": "Alimentação",
  "createdAt": "2026-03-01T00:00:00.000Z",
  "updatedAt": "2026-03-01T00:00:00.000Z"
}
```

**Response 409** (nome duplicado):

```json
{
  "error": "EXPENSE_CATEGORY_NAME_ALREADY_EXISTS",
  "message": "A category with this name already exists"
}
```

---

### GET /expenses/categories

Lista todas as categorias do usuário.

**Response 200**:

```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "name": "Alimentação",
    "createdAt": "2026-03-01T00:00:00.000Z",
    "updatedAt": "2026-03-01T00:00:00.000Z"
  }
]
```

---

### GET /expenses/categories/:id

Consulta uma categoria por ID.

**Response 200**: (mesmo formato do POST)

**Response 404**:

```json
{ "error": "EXPENSE_CATEGORY_NOT_FOUND", "message": "Expense category not found" }
```

---

### PUT /expenses/categories/:id

Atualiza o nome de uma categoria.

**Request Body**:

```json
{ "name": "Alimentação e Bebidas" }
```

**Validation**:

- `name`: string, 1–100 chars, obrigatório (FR-001)
- Nome único por usuário, case-insensitive (FR-002)

**Response 200**: (categoria atualizada, mesmo formato do POST)

**Response 404**: Categoria não encontrada ou não pertence ao usuário

**Response 409** (nome duplicado):

```json
{
  "error": "EXPENSE_CATEGORY_NAME_ALREADY_EXISTS",
  "message": "A category with this name already exists"
}
```

---

### DELETE /expenses/categories/:id

Remove uma categoria. Bloqueado se existirem despesas vinculadas (FR-004).

**Response 204**: (sem corpo)

**Response 404**: Categoria não encontrada ou não pertence ao usuário

**Response 409** (despesas vinculadas):

```json
{
  "error": "EXPENSE_CATEGORY_HAS_LINKED_EXPENSES",
  "message": "Cannot delete a category with linked expenses"
}
```

---

## 2. One-Time Expenses (Despesas Avulsas)

> Todas as rotas exigem `X-User-Id` header.

### POST /expenses/one-time

Cria uma despesa avulsa.

**Request Body**:

```json
{
  "description": "Jantar restaurante",
  "amount": 150.0,
  "competenceYear": 2026,
  "competenceMonth": 3,
  "categoryId": "uuid"
}
```

**Validation**:

- `description`: string, 1–255 chars (FR-019)
- `amount`: number, > 0, max 2 decimal places (FR-013)
- `competenceYear`: integer, >= 2000 (FR-014)
- `competenceMonth`: integer, 1–12 (FR-014)
- Competência deve ser mês atual ou futuro (FR-005, FR-020)
- `categoryId`: UUID de categoria do mesmo usuário (FR-023)

**Response 201**:

```json
{
  "id": "uuid",
  "userId": "uuid",
  "categoryId": "uuid",
  "category": { "id": "uuid", "name": "Alimentação" },
  "description": "Jantar restaurante",
  "amount": 150.0,
  "competenceYear": 2026,
  "competenceMonth": 3,
  "createdAt": "2026-03-01T00:00:00.000Z",
  "updatedAt": "2026-03-01T00:00:00.000Z"
}
```

**Response 409** (mês no passado):

```json
{ "error": "PAST_COMPETENCE", "message": "Cannot create expense for a past month" }
```

**Response 404** (categoria não encontrada):

```json
{ "error": "EXPENSE_CATEGORY_NOT_FOUND", "message": "Expense category not found" }
```

---

### GET /expenses/one-time?competenceYear=2026&competenceMonth=3

Lista despesas avulsas do usuário filtradas por competência.

**Query Params** (obrigatórios):

- `competenceYear`: integer
- `competenceMonth`: integer (1–12)

**Response 200**:

```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "categoryId": "uuid",
    "category": { "id": "uuid", "name": "Alimentação" },
    "description": "Jantar restaurante",
    "amount": 150.0,
    "competenceYear": 2026,
    "competenceMonth": 3,
    "createdAt": "2026-03-01T00:00:00.000Z",
    "updatedAt": "2026-03-01T00:00:00.000Z"
  }
]
```

---

### PUT /expenses/one-time/:id

Atualiza uma despesa avulsa.

**Request Body** (todos opcionais, pelo menos um obrigatório):

```json
{
  "description": "Jantar atualizado",
  "amount": 200.0,
  "categoryId": "uuid"
}
```

**Validation**:

- `description`: string, 1–255 chars (opcional)
- `amount`: number, > 0, max 2 decimal places (opcional)
- `categoryId`: UUID de categoria do mesmo usuário (opcional)
- Competência da despesa deve ser mês atual ou futuro (FR-006)

**Response 200**: (despesa atualizada, mesmo formato do POST)

**Response 404**: Despesa não encontrada ou não pertence ao usuário

**Response 409** (mês passado bloqueado):

```json
{ "error": "PAST_COMPETENCE", "message": "Cannot edit expense for a past month" }
```

---

### DELETE /expenses/one-time/:id

Remove uma despesa avulsa. Bloqueado se o mês de competência é passado (FR-006).

**Response 204**: (sem corpo)

**Response 404**: Despesa não encontrada ou não pertence ao usuário

**Response 409** (mês passado):

```json
{ "error": "PAST_COMPETENCE", "message": "Cannot delete expense for a past month" }
```

---

## 3. Installment Expenses (Despesas Parceladas)

> Todas as rotas exigem `X-User-Id` header.

### POST /expenses/installment

Cria uma despesa parcelada. O sistema gera automaticamente todas as parcelas (FR-026).

**Request Body**:

```json
{
  "description": "Notebook",
  "totalAmount": 1000.0,
  "installmentCount": 3,
  "startYear": 2026,
  "startMonth": 3,
  "categoryId": "uuid"
}
```

**Validation**:

- `description`: string, 1–255 chars (FR-019, FR-024)
- `totalAmount`: number, > 0, max 2 decimal places (FR-013, FR-024)
- `installmentCount`: integer, 1–72 (FR-024)
- `startYear`: integer, >= 2000 (FR-024)
- `startMonth`: integer, 1–12 (FR-024)
- Mês inicial deve ser atual ou futuro (FR-020, FR-024)
- `categoryId`: UUID de categoria do mesmo usuário (FR-023, FR-024)

**Response 201**:

```json
{
  "id": "uuid",
  "userId": "uuid",
  "categoryId": "uuid",
  "category": { "id": "uuid", "name": "Eletrônicos" },
  "description": "Notebook",
  "totalAmount": 1000.0,
  "installmentCount": 3,
  "startYear": 2026,
  "startMonth": 3,
  "installments": [
    {
      "id": "uuid",
      "installmentNumber": 1,
      "amount": 333.34,
      "competenceYear": 2026,
      "competenceMonth": 3
    },
    {
      "id": "uuid",
      "installmentNumber": 2,
      "amount": 333.33,
      "competenceYear": 2026,
      "competenceMonth": 4
    },
    {
      "id": "uuid",
      "installmentNumber": 3,
      "amount": 333.33,
      "competenceYear": 2026,
      "competenceMonth": 5
    }
  ],
  "createdAt": "2026-03-01T00:00:00.000Z",
  "updatedAt": "2026-03-01T00:00:00.000Z"
}
```

**Response 409** (mês no passado):

```json
{
  "error": "PAST_COMPETENCE",
  "message": "Cannot create installment expense starting in a past month"
}
```

**Response 400** (parcelas fora do limite):

```json
{ "error": "VALIDATION_ERROR", "message": "installmentCount must be between 1 and 72" }
```

---

### GET /expenses/installment/:id

Consulta uma despesa parcelada com todas as suas parcelas.

**Response 200**: (mesmo formato do POST 201)

**Response 404**:

```json
{ "error": "INSTALLMENT_EXPENSE_NOT_FOUND", "message": "Installment expense not found" }
```

---

### PATCH /expenses/installment/:id

Atualiza descrição e/ou categoria de uma despesa parcelada. A alteração propaga para todas as parcelas (FR-027).

**Request Body** (pelo menos um obrigatório):

```json
{
  "description": "Notebook atualizado",
  "categoryId": "uuid"
}
```

**Validation**:

- `description`: string, 1–255 chars (opcional)
- `categoryId`: UUID de categoria do mesmo usuário (opcional)
- Atributos financeiros (`totalAmount`, `installmentCount`) não podem ser alterados (FR-027)

**Response 200**: (despesa atualizada com todas as parcelas, mesmo formato do GET)

**Response 404**: Despesa não encontrada ou não pertence ao usuário

**Response 409** (tentativa de alterar financeiros):

```json
{
  "error": "INSTALLMENT_FINANCIAL_IMMUTABLE",
  "message": "Financial attributes of installment expenses cannot be modified"
}
```

---

### POST /expenses/installment/:id/terminate

Encerra antecipadamente uma despesa parcelada: remove parcelas de meses futuros (FR-030).

**Request Body**: (sem corpo)

**Response 200**: (despesa com parcelas remanescentes — passadas e atual)

**Response 404**: Despesa não encontrada ou não pertence ao usuário

**Response 409** (sem parcelas futuras):

```json
{ "error": "NO_FUTURE_INSTALLMENTS", "message": "There are no future installments to remove" }
```

---

### DELETE /expenses/installment/:id

Remove permanentemente uma despesa parcelada e todas as suas parcelas (FR-028). Bloqueado se qualquer parcela está em mês passado.

**Response 204**: (sem corpo)

**Response 404**: Despesa não encontrada ou não pertence ao usuário

**Response 409** (parcelas em meses passados):

```json
{
  "error": "INSTALLMENT_HAS_PAST_COMPETENCE",
  "message": "Cannot delete installment expense with installments in past months"
}
```

---

## 4. Recurring Expenses (Despesas Recorrentes)

> Todas as rotas exigem `X-User-Id` header.

### POST /expenses/recurring

Cria uma despesa recorrente. Uma versão inicial é criada automaticamente.

**Request Body**:

```json
{
  "description": "Aluguel",
  "amount": 2000.0,
  "categoryId": "uuid",
  "startYear": 2026,
  "startMonth": 3,
  "endYear": 2026,
  "endMonth": 12
}
```

**Validation**:

- `description`: string, 1–255 chars (FR-019, FR-007)
- `amount`: number, > 0, max 2 decimal places (FR-013, FR-007)
- `categoryId`: UUID de categoria do mesmo usuário (FR-023, FR-007)
- `startYear`/`startMonth`: obrigatório, mês atual ou futuro (FR-007, FR-020)
- `endYear`/`endMonth`: opcional; quando informado, não pode ser anterior ao início (FR-015)

**Response 201**:

```json
{
  "id": "uuid",
  "userId": "uuid",
  "startYear": 2026,
  "startMonth": 3,
  "endYear": 2026,
  "endMonth": 12,
  "currentVersion": {
    "id": "uuid",
    "categoryId": "uuid",
    "category": { "id": "uuid", "name": "Moradia" },
    "description": "Aluguel",
    "amount": 2000.0,
    "effectiveYear": 2026,
    "effectiveMonth": 3,
    "createdAt": "2026-03-01T00:00:00.000Z"
  },
  "createdAt": "2026-03-01T00:00:00.000Z",
  "updatedAt": "2026-03-01T00:00:00.000Z"
}
```

**Response 409** (mês no passado):

```json
{
  "error": "PAST_COMPETENCE",
  "message": "Cannot create recurring expense starting in a past month"
}
```

**Response 400** (término anterior ao início):

```json
{ "error": "VALIDATION_ERROR", "message": "End date cannot be before start date" }
```

---

### GET /expenses/recurring/:id

Consulta uma despesa recorrente com todas as versões.

**Response 200**:

```json
{
  "id": "uuid",
  "userId": "uuid",
  "startYear": 2026,
  "startMonth": 3,
  "endYear": null,
  "endMonth": null,
  "currentVersion": { ... },
  "versions": [
    {
      "id": "uuid",
      "categoryId": "uuid",
      "category": { "id": "uuid", "name": "Moradia" },
      "description": "Aluguel",
      "amount": 2000.00,
      "effectiveYear": 2026,
      "effectiveMonth": 3,
      "createdAt": "2026-03-01T00:00:00.000Z"
    }
  ],
  "createdAt": "2026-03-01T00:00:00.000Z",
  "updatedAt": "2026-03-01T00:00:00.000Z"
}
```

**Response 404**:

```json
{ "error": "RECURRING_EXPENSE_NOT_FOUND", "message": "Recurring expense not found" }
```

---

### PATCH /expenses/recurring/:id

Altera atributos de uma despesa recorrente. Cria nova versão a partir de `effectiveMonth`/`effectiveYear` (FR-009).

**Request Body**:

```json
{
  "description": "Aluguel reajustado",
  "amount": 2200.0,
  "categoryId": "uuid",
  "effectiveYear": 2026,
  "effectiveMonth": 6
}
```

**Validation**:

- `effectiveYear`/`effectiveMonth`: obrigatório, mês atual ou futuro, dentro da vigência (FR-009)
- Pelo menos um entre `description`, `amount`, `categoryId` deve ser fornecido
- `description`: string, 1–255 chars (opcional)
- `amount`: number, > 0, max 2 decimal places (opcional)
- `categoryId`: UUID de categoria do mesmo usuário (opcional)

**Response 200**: (despesa completa com nova versão, mesmo formato do GET)

**Response 409** (mês passado):

```json
{ "error": "PAST_EFFECTIVE_DATE", "message": "Effective date must be current or future month" }
```

**Response 409** (fora da vigência):

```json
{
  "error": "EFFECTIVE_DATE_OUT_OF_RANGE",
  "message": "Effective date must be within the recurring expense period"
}
```

---

### PATCH /expenses/recurring/:id/terminate

Encerra antecipadamente uma despesa recorrente (FR-010).

**Request Body**:

```json
{
  "endYear": 2026,
  "endMonth": 6
}
```

**Validation**:

- `endYear`/`endMonth`: obrigatório, deve ser mês atual ou futuro, >= startDate
- Despesa não pode já estar expirada (FR-010)

**Response 200**: (despesa atualizada com novo endDate, mesmo formato do GET)

**Response 409** (já expirada):

```json
{ "error": "RECURRING_EXPENSE_ALREADY_EXPIRED", "message": "Recurring expense has already expired" }
```

**Response 409** (término antes do início):

```json
{ "error": "END_DATE_BEFORE_START", "message": "End date cannot be before start date" }
```

---

### DELETE /expenses/recurring/:id

Exclui permanentemente uma despesa recorrente e todas as suas versões (FR-011).

**Response 204**: (sem corpo)

**Response 404**: Despesa não encontrada ou não pertence ao usuário

---

## 5. Expense Query (Consulta Consolidada)

### GET /expenses?competenceYear=2026&competenceMonth=3

Consulta consolidada de todas as despesas aplicáveis ao mês informado (FR-012, FR-029).

**Query Params** (obrigatórios):

- `competenceYear`: integer
- `competenceMonth`: integer (1–12)

**Response 200**:

```json
{
  "competenceYear": 2026,
  "competenceMonth": 3,
  "oneTimeExpenses": [
    {
      "id": "uuid",
      "description": "Jantar restaurante",
      "amount": 150.0,
      "category": { "id": "uuid", "name": "Alimentação" },
      "type": "ONE_TIME"
    }
  ],
  "installments": [
    {
      "id": "uuid",
      "installmentExpenseId": "uuid",
      "installmentNumber": 1,
      "installmentCount": 3,
      "description": "Notebook",
      "amount": 333.34,
      "category": { "id": "uuid", "name": "Eletrônicos" },
      "type": "INSTALLMENT"
    }
  ],
  "recurringExpenses": [
    {
      "id": "uuid",
      "description": "Aluguel",
      "amount": 2000.0,
      "category": { "id": "uuid", "name": "Moradia" },
      "type": "RECURRING"
    }
  ],
  "total": 2483.34
}
```

**Response 400** (competência inválida):

```json
{
  "error": "VALIDATION_ERROR",
  "message": "competenceYear and competenceMonth are required"
}
```

---

## Error Codes Reference

| Code                                   | HTTP | Trigger                                                  |
| -------------------------------------- | ---- | -------------------------------------------------------- |
| `EXPENSE_CATEGORY_NOT_FOUND`           | 404  | Categoria não existe ou não pertence ao usuário          |
| `EXPENSE_CATEGORY_NAME_ALREADY_EXISTS` | 409  | Nome duplicado (case-insensitive)                        |
| `EXPENSE_CATEGORY_HAS_LINKED_EXPENSES` | 409  | Categoria possui despesas vinculadas                     |
| `ONE_TIME_EXPENSE_NOT_FOUND`           | 404  | Despesa avulsa não existe ou não pertence ao usuário     |
| `INSTALLMENT_EXPENSE_NOT_FOUND`        | 404  | Despesa parcelada não existe ou não pertence ao usuário  |
| `INSTALLMENT_FINANCIAL_IMMUTABLE`      | 409  | Tentativa de alterar atributos financeiros de parcelada  |
| `INSTALLMENT_HAS_PAST_COMPETENCE`      | 409  | Exclusão bloqueada por parcelas em meses passados        |
| `NO_FUTURE_INSTALLMENTS`               | 409  | Encerramento antecipado sem parcelas futuras             |
| `RECURRING_EXPENSE_NOT_FOUND`          | 404  | Despesa recorrente não existe ou não pertence ao usuário |
| `RECURRING_EXPENSE_ALREADY_EXPIRED`    | 409  | Encerramento de despesa já expirada                      |
| `PAST_COMPETENCE`                      | 409  | Competência ou data de início em mês passado             |
| `PAST_EFFECTIVE_DATE`                  | 409  | Data efetiva de alteração em mês passado                 |
| `EFFECTIVE_DATE_OUT_OF_RANGE`          | 409  | Data efetiva fora da vigência da recorrente              |
| `END_DATE_BEFORE_START`                | 409  | Data de término anterior à data de início                |
| `VALIDATION_ERROR`                     | 400  | Falha de validação de schema (Zod)                       |
| `UNAUTHORIZED`                         | 401  | Header X-User-Id ausente ou inválido                     |
| `USER_NOT_FOUND`                       | 404  | Usuário do header não encontrado                         |
