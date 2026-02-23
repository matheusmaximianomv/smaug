# Contract: Health Check Endpoint

**Branch**: `001-project-base` | **Date**: 2026-02-22
**Source**: FR-010, SC-004, SC-007

## Endpoint

```
GET /health
```

## Request

- **Method**: GET
- **Path**: `/health`
- **Headers**: Nenhum obrigatório
- **Body**: Nenhum
- **Authentication**: Nenhuma (endpoint público)

## Response

### 200 OK — Sistema saudável

```json
{
  "status": "ok",
  "timestamp": "2026-02-22T19:00:00.000Z",
  "uptime": 12345.678,
  "database": {
    "status": "connected",
    "provider": "postgresql"
  }
}
```

| Campo               | Tipo                | Descrição                                         |
| ------------------- | ------------------- | ------------------------------------------------- |
| `status`            | `string`            | `"ok"` se todos os checks passam                  |
| `timestamp`         | `string` (ISO 8601) | Momento da resposta                               |
| `uptime`            | `number`            | Segundos desde o boot do processo                 |
| `database.status`   | `string`            | `"connected"` ou `"disconnected"`                 |
| `database.provider` | `string`            | Provider ativo (e.g., `"postgresql"`, `"sqlite"`) |

### 503 Service Unavailable — Sistema degradado

```json
{
  "status": "degraded",
  "timestamp": "2026-02-22T19:00:00.000Z",
  "uptime": 12345.678,
  "database": {
    "status": "disconnected",
    "provider": "postgresql",
    "error": "Connection refused"
  }
}
```

Retornado quando o banco de dados está indisponível ou outra
dependência crítica falha.

## Logging (FR-016, SC-007)

Cada requisição ao health check DEVE produzir log estruturado:

```json
{
  "level": "info",
  "timestamp": "2026-02-22T19:00:00.000Z",
  "method": "GET",
  "path": "/health",
  "statusCode": 200,
  "responseTime": 5
}
```

## Notes

- Este é o único endpoint definido na feature project-base.
- Endpoints de negócio (receitas, despesas, saldo) serão
  adicionados em features futuras.
- O health check DEVE ser usado como probe de readiness no
  Docker (HEALTHCHECK no Dockerfile / healthcheck no
  docker-compose).
