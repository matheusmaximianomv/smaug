# API Contracts: Gestão de Receitas Mensais

**Branch**: `002-receitas` | **Date**: 2026-02-23
**Base URL**: `http://localhost:3000`

## Authentication

Todas as rotas de receitas exigem o header `X-User-Id` com UUID válido de um usuário existente. Rotas de usuário e health não exigem.

```
X-User-Id: <uuid>
```

**Erro se ausente ou inválido** (rotas protegidas):

```json
{
  "error": "UNAUTHORIZED",
  "message": "Header X-User-Id is required"
}
```

HTTP Status: `401`

**Erro se usuário não encontrado**:

```json
{
  "error": "USER_NOT_FOUND",
  "message": "User not found"
}
```

HTTP Status: `404`

---

## Common Error Format

Todas as respostas de erro seguem o formato:

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

## 1. Users

### POST /users

Cria um novo usuário.

**Request Body**:

```json
{
  "name": "João Silva",
  "email": "joao@example.com"
}
```

**Validation**:

- `name`: string, 1–255 chars, obrigatório
- `email`: string, formato email válido, obrigatório, único

**Response 201**:

```json
{
  "id": "uuid",
  "name": "João Silva",
  "email": "joao@example.com",
  "createdAt": "2026-02-23T00:00:00.000Z"
}
```

**Response 400** (validação):

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid request body",
  "details": {
    "name": ["Name must be between 1 and 255 characters"]
  }
}
```

**Response 409** (email duplicado):

```json
{
  "error": "EMAIL_ALREADY_EXISTS",
  "message": "A user with this email already exists"
}
```

---

### GET /users/:id

Consulta um usuário por ID.

**Response 200**:

```json
{
  "id": "uuid",
  "name": "João Silva",
  "email": "joao@example.com",
  "createdAt": "2026-02-23T00:00:00.000Z"
}
```

**Response 404**:

```json
{
  "error": "USER_NOT_FOUND",
  "message": "User not found"
}
```

---

## 2. One-Time Revenues (Receitas Avulsas)

> Todas as rotas exigem `X-User-Id` header.

### POST /revenues/one-time

Cria uma receita avulsa.

**Request Body**:

```json
{
  "description": "Freelance",
  "amount": 1500.0,
  "competenceYear": 2026,
  "competenceMonth": 3
}
```

**Validation**:

- `description`: string, 1–255 chars (FR-018)
- `amount`: number, > 0, max 2 decimal places (FR-010)
- `competenceYear`: integer, >= 2000 (FR-011)
- `competenceMonth`: integer, 1–12 (FR-011)
- Competência deve ser mês atual ou futuro (FR-019)

**Response 201**:

```json
{
  "id": "uuid",
  "userId": "uuid",
  "description": "Freelance",
  "amount": 1500.0,
  "competenceYear": 2026,
  "competenceMonth": 3,
  "createdAt": "2026-02-23T00:00:00.000Z",
  "updatedAt": "2026-02-23T00:00:00.000Z"
}
```

**Response 400**:

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid request body",
  "details": { "amount": ["Amount must be greater than 0"] }
}
```

**Response 409** (mês no passado):

```json
{
  "error": "PAST_COMPETENCE",
  "message": "Cannot create revenue for a past month"
}
```

---

### GET /revenues/one-time?competenceYear=2026&competenceMonth=3

Lista receitas avulsas do usuário, opcionalmente filtradas por competência.

**Query Params** (opcionais):

- `competenceYear`: integer
- `competenceMonth`: integer (1–12)

**Response 200**:

```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "description": "Freelance",
    "amount": 1500.0,
    "competenceYear": 2026,
    "competenceMonth": 3,
    "createdAt": "2026-02-23T00:00:00.000Z",
    "updatedAt": "2026-02-23T00:00:00.000Z"
  }
]
```

---

### PUT /revenues/one-time/:id

Atualiza uma receita avulsa existente.

**Request Body**:

```json
{
  "description": "Freelance atualizado",
  "amount": 2000.0
}
```

**Validation**:

- `description`: string, 1–255 chars (opcional)
- `amount`: number, > 0, max 2 decimal places (opcional)
- Pelo menos um campo deve ser fornecido
- Competência do mês deve ser atual ou futuro (FR-002)

**Response 200**: (receita atualizada, mesmo formato do POST)

**Response 404**: Receita não encontrada ou não pertence ao usuário
**Response 409**: Mês de competência no passado (bloqueado para edição)

---

### DELETE /revenues/one-time/:id

Remove uma receita avulsa.

**Response 204**: (sem corpo)

**Response 404**: Receita não encontrada ou não pertence ao usuário
**Response 409**: Mês de competência no passado (bloqueado para edição)

---

## 3. Fixed Revenues (Receitas Fixas)

> Todas as rotas exigem `X-User-Id` header.

### POST /revenues/fixed

Cria uma receita fixa.

**Request Body**:

```json
{
  "description": "Salário",
  "amount": 5000.0,
  "modality": "ALTERABLE",
  "startYear": 2026,
  "startMonth": 1,
  "endYear": 2026,
  "endMonth": 12
}
```

**Validation**:

- `description`: string, 1–255 chars (FR-018)
- `amount`: number, > 0, max 2 decimal places (FR-010)
- `modality`: `"ALTERABLE"` ou `"UNALTERABLE"` (FR-004)
- `startYear`/`startMonth`: obrigatório, mês atual ou futuro (FR-019)
- `endYear`/`endMonth`: opcional; se presente, não pode ser anterior ao início (FR-012)

**Response 201**:

```json
{
  "id": "uuid",
  "userId": "uuid",
  "modality": "ALTERABLE",
  "startYear": 2026,
  "startMonth": 1,
  "endYear": 2026,
  "endMonth": 12,
  "currentVersion": {
    "id": "uuid",
    "description": "Salário",
    "amount": 5000.0,
    "effectiveYear": 2026,
    "effectiveMonth": 1,
    "createdAt": "2026-02-23T00:00:00.000Z"
  },
  "createdAt": "2026-02-23T00:00:00.000Z",
  "updatedAt": "2026-02-23T00:00:00.000Z"
}
```

---

### GET /revenues/fixed?competenceYear=2026&competenceMonth=3

Lista receitas fixas do usuário ativas para a competência informada. Sem filtro, retorna todas.

**Query Params** (opcionais):

- `competenceYear`: integer
- `competenceMonth`: integer (1–12)

**Response 200**:

```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "modality": "ALTERABLE",
    "startYear": 2026,
    "startMonth": 1,
    "endYear": 2026,
    "endMonth": 12,
    "currentVersion": {
      "id": "uuid",
      "description": "Salário",
      "amount": 5000.0,
      "effectiveYear": 2026,
      "effectiveMonth": 1,
      "createdAt": "2026-02-23T00:00:00.000Z"
    },
    "versions": [
      {
        "id": "uuid",
        "description": "Salário",
        "amount": 5000.0,
        "effectiveYear": 2026,
        "effectiveMonth": 1,
        "createdAt": "2026-02-23T00:00:00.000Z"
      }
    ],
    "createdAt": "2026-02-23T00:00:00.000Z",
    "updatedAt": "2026-02-23T00:00:00.000Z"
  }
]
```

Quando `competenceYear` e `competenceMonth` são informados, `currentVersion` reflete a versão vigente para aquele mês específico.

---

### GET /revenues/fixed/:id

Consulta uma receita fixa por ID, incluindo todas as versões.

**Response 200**: (mesmo formato da lista, objeto único)

**Response 404**: Receita não encontrada ou não pertence ao usuário

---

### PATCH /revenues/fixed/:id

Altera atributos de uma receita fixa **alterável** (FR-006). Cria nova versão.

**Request Body**:

```json
{
  "description": "Salário reajustado",
  "amount": 6000.0,
  "effectiveYear": 2026,
  "effectiveMonth": 6
}
```

**Validation**:

- `description`: string, 1–255 chars (opcional)
- `amount`: number, > 0, max 2 decimal places (opcional)
- `effectiveYear`/`effectiveMonth`: obrigatório, mês atual ou futuro, dentro da vigência
- Pelo menos `description` ou `amount` deve ser alterado
- Receita deve ser `ALTERABLE` (FR-007 rejeita se `UNALTERABLE`)

**Response 200**: (receita completa com nova versão)

**Response 409** (se inalterável):

```json
{
  "error": "UNALTERABLE_REVENUE",
  "message": "Cannot modify an unalterable fixed revenue"
}
```

**Response 409** (mês passado):

```json
{
  "error": "PAST_EFFECTIVE_DATE",
  "message": "Effective date must be current or future month"
}
```

---

### PATCH /revenues/fixed/:id/terminate

Encerra antecipadamente uma receita fixa (FR-008). Funciona para ambas modalidades.

**Request Body**:

```json
{
  "endYear": 2026,
  "endMonth": 6
}
```

**Validation**:

- `endYear`/`endMonth`: obrigatório, deve ser mês atual ou futuro
- Deve estar dentro da vigência original (>= startDate)
- Receita não pode já estar expirada

**Response 200**: (receita atualizada com novo endDate)

**Response 409** (já expirada):

```json
{
  "error": "ALREADY_EXPIRED",
  "message": "Revenue has already expired"
}
```

---

### DELETE /revenues/fixed/:id

Exclui permanentemente uma receita fixa (FR-020).

**Response 204**: (sem corpo)

**Response 404**: Receita não encontrada ou não pertence ao usuário

---

## 4. Consolidated Revenue Query

### GET /revenues?competenceYear=2026&competenceMonth=3

Consulta consolidada de todas as receitas (avulsas + fixas ativas) para um mês (FR-009).

**Query Params** (obrigatórios):

- `competenceYear`: integer
- `competenceMonth`: integer (1–12)

**Response 200**:

```json
{
  "competenceYear": 2026,
  "competenceMonth": 3,
  "oneTimeRevenues": [
    {
      "id": "uuid",
      "description": "Freelance",
      "amount": 1500.0,
      "type": "ONE_TIME"
    }
  ],
  "fixedRevenues": [
    {
      "id": "uuid",
      "description": "Salário",
      "amount": 5000.0,
      "modality": "ALTERABLE",
      "type": "FIXED"
    }
  ],
  "total": 6500.0
}
```

**Response 400** (competência inválida):

```json
{
  "error": "VALIDATION_ERROR",
  "message": "competenceYear and competenceMonth are required"
}
```
