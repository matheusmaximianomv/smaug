# Quickstart: Project Base

**Branch**: `001-project-base` | **Date**: 2026-02-22

## Pré-requisitos

- Node.js 22 LTS (`node --version` → v22.x.x)
- npm (`npm --version`)
- Docker e Docker Compose (`docker --version`, `docker compose version`)
- Git

## Setup Local (sem Docker)

### 1. Clonar e instalar dependências

```bash
git clone <repo-url> smaug
cd smaug
npm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
# Editar .env conforme necessário (ver .env.example para referência)
```

Variáveis obrigatórias:

| Variável            | Descrição                  | Exemplo         |
| ------------------- | -------------------------- | --------------- |
| `DATABASE_PROVIDER` | Provider de banco de dados | `sqlite`        |
| `DATABASE_URL`      | Connection string          | `file:./dev.db` |
| `NODE_ENV`          | Ambiente de execução       | `development`   |
| `PORT`              | Porta do servidor HTTP     | `3000`          |
| `LOG_LEVEL`         | Nível de logging           | `debug`         |

### 3. Setup do banco de dados

```bash
npx prisma generate
npx prisma migrate dev
```

### 4. Build e execução

```bash
npm run build
npm start
```

### 5. Verificar health check

```bash
curl http://localhost:3000/health
# Esperado: {"status":"ok","timestamp":"...","uptime":...,"database":{"status":"connected","provider":"sqlite"}}
```

## Setup com Docker

### 1. Configurar variáveis de ambiente

```bash
cp .env.example .env
# Ajustar DATABASE_PROVIDER=postgresql e DATABASE_URL para o container
```

### 2. Subir os serviços

```bash
docker compose up --build
```

### 3. Verificar

```bash
curl http://localhost:3000/health
```

## Comandos Úteis

| Comando                    | Descrição                               |
| -------------------------- | --------------------------------------- |
| `npm run build`            | Compila TypeScript                      |
| `npm run dev`              | Inicia em modo desenvolvimento (watch)  |
| `npm start`                | Inicia aplicação compilada              |
| `npm test`                 | Executa testes unitários                |
| `npm run test:unit`        | Executa apenas testes unitários         |
| `npm run test:integration` | Executa apenas testes de integração     |
| `npm run lint`             | Executa ESLint                          |
| `npm run format`           | Executa Prettier                        |
| `npx prisma studio`        | Abre UI do Prisma para visualizar dados |
| `npx prisma migrate dev`   | Cria/aplica migrações em dev            |

## Verificação de Sucesso

Após o setup, confirme que:

1. **Build**: `npm run build` completa sem erros (< 30s)
2. **Testes unitários**: `npm run test:unit` passa (< 10s)
3. **Testes integração**: `npm run test:integration` passa (< 30s)
4. **Health check**: `curl localhost:3000/health` retorna `{"status":"ok",...}`
5. **Docker**: `docker compose up` sobe e health check responde (< 60s)

## Troubleshooting

- **"Validation failed" na inicialização**: Verifique se todas as variáveis
  do `.env.example` estão definidas no `.env` com valores válidos.
- **"Cannot connect to database"**: Verifique se o banco está rodando e
  a `DATABASE_URL` está correta.
- **"Provider not supported"**: `DATABASE_PROVIDER` DEVE ser `postgresql`
  ou `sqlite`.
- **Testes falhando**: Execute `npm run test:unit` e `npm run test:integration`
  separadamente para isolar o problema.
