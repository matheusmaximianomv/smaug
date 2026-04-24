# Quickstart: Refatoração da Estrutura de Pastas (Server/Web)

**Feature**: 001-refactor-server-web  
**Date**: 2025-04-21

## Pré-requisitos

- Node.js 22 LTS instalado
- Git configurado
- Projeto atual funcionando (testes passando)

## Visão Geral

Esta refatoração reorganiza o projeto em uma estrutura monorepo com projetos independentes:
- `server/`: Backend API (código atual migrado)
- `web/`: Frontend Next.js 15 (novo)
- `/` (raiz): Orquestração e configurações globais

**Tempo estimado**: 2-3 horas

## Fase 1: Backup e Preparação

### 1.1 Criar Backup

```bash
# Garantir que não há mudanças não commitadas
git status

# Criar branch de backup (opcional, mas recomendado)
git branch backup-before-refactor

# Confirmar que testes estão passando
npm test
```

### 1.2 Verificar Estrutura Atual

```bash
# Listar estrutura principal
ls -la

# Verificar que existe: src/, tests/, prisma/, package.json, etc.
```

## Fase 2: Migração do Backend para `server/`

### 2.1 Criar Estrutura de Diretórios

```bash
# Criar pasta server
mkdir server

# Mover diretórios principais usando git mv (preserva histórico)
git mv src server/
git mv tests server/
git mv prisma server/

# Mover arquivos de configuração do backend
git mv package.json server/
git mv package-lock.json server/
git mv tsconfig.json server/
git mv vitest.config.ts server/
git mv docker-compose.yml server/
git mv Dockerfile server/
git mv .env.example server/

# Copiar (não mover) configurações que serão compartilhadas
cp .eslintrc.json server/
cp .prettierrc server/
```

### 2.2 Ajustar package.json do Server

Editar `server/package.json`:

```json
{
  "name": "smaug-server",
  "version": "1.0.0",
  "description": "Smaug API - Backend",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsup",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "lint": "eslint src tests --ext .ts",
    "format": "prettier --write \"src/**/*.ts\" \"tests/**/*.ts\"",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio"
  }
  // ... resto do package.json permanece igual
}
```

### 2.3 Validar Migração do Server

```bash
cd server

# Instalar dependências
npm install

# Gerar Prisma client
npm run prisma:generate

# Executar testes
npm test

# Testar build
npm run build

# Testar execução (se tiver .env configurado)
npm run dev
```

Se tudo funcionar, a migração do backend está completa. ✅

## Fase 3: Criar Estrutura do Frontend `web/`

### 3.1 Criar Aplicação Next.js 15

```bash
# Voltar para raiz
cd ..

# Criar aplicação Next.js
npx create-next-app@latest web \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*"

# Responder prompts:
# - Would you like to use ESLint? Yes
# - Would you like to use Turbopack? No (opcional)
```

### 3.2 Criar Estrutura de Pastas Conforme Constituição

```bash
cd web

# Criar estrutura de features
mkdir -p features
mkdir -p shared
mkdir -p infra

# Criar arquivos .gitkeep para preservar estrutura vazia
touch features/.gitkeep
touch shared/.gitkeep
touch infra/.gitkeep
```

### 3.3 Configurar tsconfig.json do Web

Editar `web/tsconfig.json` para adicionar paths:

```json
{
  "compilerOptions": {
    // ... configurações existentes do create-next-app
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "@/features/*": ["./features/*"],
      "@/shared/*": ["./shared/*"],
      "@/infra/*": ["./infra/*"]
    }
  }
}
```

### 3.4 Criar Página Inicial Simples

Editar `web/app/page.tsx`:

```tsx
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4">Smaug</h1>
        <p className="text-xl text-gray-600">
          Sistema de Gestão Financeira Pessoal
        </p>
        <p className="mt-8 text-sm text-gray-500">
          Interface em construção
        </p>
      </div>
    </main>
  );
}
```

### 3.5 Criar .env.example do Web

```bash
# Criar arquivo de exemplo
cat > .env.example << 'EOF'
# Next.js
NEXT_PUBLIC_API_URL=http://localhost:3000

# Add other frontend-specific variables here
EOF
```

### 3.6 Validar Setup do Web

```bash
# Instalar dependências (se não instalou no create-next-app)
npm install

# Executar em modo dev
npm run dev

# Abrir http://localhost:3000 no navegador
# Deve exibir a página "Smaug - Em Construção"
```

Se a página carregar corretamente, o setup do frontend está completo. ✅

## Fase 4: Configurar Orquestração na Raiz

### 4.1 Criar package.json da Raiz

```bash
# Voltar para raiz
cd ..

# Criar novo package.json
cat > package.json << 'EOF'
{
  "name": "smaug",
  "version": "1.0.0",
  "description": "Smaug - Sistema de Gestão Financeira Pessoal",
  "private": true,
  "engines": {
    "node": ">=22.0.0",
    "npm": ">=10.0.0"
  },
  "scripts": {
    "dev:server": "npm run --prefix server dev",
    "dev:web": "npm run --prefix web dev",
    "dev": "npm run dev:server & npm run dev:web",
    
    "build:server": "npm run --prefix server build",
    "build:web": "npm run --prefix web build",
    "build": "npm run build:server && npm run build:web",
    
    "test:server": "npm run --prefix server test",
    "test:web": "npm run --prefix web test",
    "test": "npm run test:server && npm run test:web",
    
    "lint:server": "npm run --prefix server lint",
    "lint:web": "npm run --prefix web lint",
    "lint": "npm run lint:server && npm run lint:web",
    
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\"",
    
    "install:all": "npm install && npm install --prefix server && npm install --prefix web",
    
    "validate:deps": "dependency-cruiser --validate .dependency-cruiser.js server web",
    
    "prepare": "husky install"
  },
  "devDependencies": {
    "@eslint/js": "^10.0.1",
    "@typescript-eslint/eslint-plugin": "^8.56.0",
    "@typescript-eslint/parser": "^8.56.0",
    "dependency-cruiser": "^17.3.8",
    "eslint": "^10.0.1",
    "husky": "^9.1.7",
    "lint-staged": "^16.2.7",
    "prettier": "^3.8.1",
    "typescript": "^5.9.3",
    "typescript-eslint": "^8.56.0"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/seu-usuario/smaug.git"
  },
  "author": "",
  "license": "MIT"
}
EOF
```

### 4.2 Instalar Dependências Globais

```bash
npm install
```

### 4.3 Configurar dependency-cruiser

```bash
cat > .dependency-cruiser.js << 'EOF'
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-server-to-web',
      comment: 'Server code must not import from web',
      severity: 'error',
      from: { path: '^server/' },
      to: { path: '^web/' }
    },
    {
      name: 'no-web-to-server',
      comment: 'Web code must not import from server',
      severity: 'error',
      from: { path: '^web/' },
      to: { path: '^server/' }
    },
    {
      name: 'no-circular-dependencies',
      comment: 'Circular dependencies are not allowed',
      severity: 'warn',
      from: {},
      to: {
        circular: true
      }
    }
  ],
  options: {
    doNotFollow: {
      path: 'node_modules'
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'server/tsconfig.json'
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default']
    },
    reporterOptions: {
      dot: {
        collapsePattern: 'node_modules/[^/]+'
      },
      archi: {
        collapsePattern: '^(server|web)/[^/]+|node_modules/[^/]+'
      }
    }
  }
};
EOF
```

### 4.4 Atualizar Configuração do Husky

```bash
# Recriar hooks do Husky
npx husky install

# Criar pre-commit hook
npx husky add .husky/pre-commit "npm run lint-staged"

# Atualizar .lintstagedrc.json (se existir) ou criar
cat > .lintstagedrc.json << 'EOF'
{
  "server/**/*.{ts,tsx}": [
    "eslint --fix",
    "prettier --write"
  ],
  "web/**/*.{ts,tsx}": [
    "eslint --fix",
    "prettier --write"
  ],
  "*.{json,md}": [
    "prettier --write"
  ]
}
EOF
```

### 4.5 Atualizar README.md

```bash
cat > README.md << 'EOF'
# Smaug - Sistema de Gestão Financeira Pessoal

Sistema para registro e acompanhamento de receitas e despesas pessoais.

## Estrutura do Projeto

```
/
├── server/          # Backend API (Express + TypeScript + Prisma)
├── web/             # Frontend (Next.js 15 + React + TypeScript)
└── package.json     # Scripts de orquestração
```

## Pré-requisitos

- Node.js 22 LTS
- PostgreSQL (para o backend)

## Instalação

```bash
# Instalar todas as dependências (raiz + server + web)
npm run install:all
```

## Desenvolvimento

```bash
# Executar server e web simultaneamente
npm run dev

# Ou executar separadamente:
npm run dev:server  # API em http://localhost:3000
npm run dev:web     # Frontend em http://localhost:3001
```

## Testes

```bash
# Executar todos os testes
npm test

# Ou executar separadamente:
npm run test:server
npm run test:web
```

## Build

```bash
# Build de ambos os projetos
npm run build

# Ou separadamente:
npm run build:server
npm run build:web
```

## Validação

```bash
# Validar importações cruzadas
npm run validate:deps

# Lint
npm run lint

# Format
npm run format
```

## Estrutura de Pastas

### Server (Backend)
- Clean Architecture com 4 camadas: domain, application, infrastructure, presentation
- Testes unitários e de integração separados
- Prisma para ORM

### Web (Frontend)
- Next.js 15 com App Router
- Organização por features/domínios
- TypeScript strict mode

## Licença

MIT
EOF
```

## Fase 5: Validação Final

### 5.1 Validar Importações Cruzadas

```bash
npm run validate:deps
```

Deve retornar sem erros. ✅

### 5.2 Executar Todos os Testes

```bash
npm test
```

Todos os testes do server devem passar. ✅

### 5.3 Testar Execução Simultânea

```bash
# Executar ambos os projetos
npm run dev

# Verificar:
# - Server rodando em http://localhost:3000
# - Web rodando em http://localhost:3001
```

Ambos devem iniciar sem erros. ✅

### 5.4 Testar Build

```bash
npm run build
```

Ambos os projetos devem buildar com sucesso. ✅

## Fase 6: Commit e Finalização

### 6.1 Revisar Mudanças

```bash
git status
git diff
```

### 6.2 Commit da Refatoração

```bash
# Adicionar todos os arquivos
git add .

# Commit
git commit -m "refactor: reorganizar projeto em estrutura server/web

- Migrar backend para server/ preservando Clean Architecture
- Criar frontend Next.js 15 em web/ com estrutura base
- Configurar orquestração na raiz com scripts delegados
- Adicionar validação de importações cruzadas via dependency-cruiser
- Manter projetos completamente independentes (sem workspaces)

BREAKING CHANGE: Estrutura de pastas alterada. Atualizar paths em scripts externos."
```

### 6.3 Atualizar Documentação do Projeto

- Atualizar qualquer documentação adicional que referencie a estrutura antiga
- Atualizar scripts de CI/CD se necessário
- Comunicar mudanças para o time

## Troubleshooting

### Problema: Testes não passam após migração

**Solução**:
```bash
cd server
rm -rf node_modules package-lock.json
npm install
npm run prisma:generate
npm test
```

### Problema: Imports não resolvem

**Solução**: Verificar `tsconfig.json` em `server/`:
- `baseUrl` deve ser `"."`
- `paths` devem apontar para `src/*`

### Problema: dependency-cruiser reporta erros

**Solução**: Verificar que não há imports entre `server/` e `web/`:
```bash
# Buscar imports suspeitos
grep -r "from.*web/" server/
grep -r "from.*server/" web/
```

### Problema: Next.js não inicia

**Solução**:
```bash
cd web
rm -rf .next node_modules package-lock.json
npm install
npm run dev
```

## Próximos Passos

Após completar esta refatoração:

1. ✅ Estrutura base pronta
2. ⏭️ Implementar features do frontend (próximas tasks)
3. ⏭️ Configurar CI/CD para ambos os projetos
4. ⏭️ Configurar deploy independente (server e web)

## Referências

- [Especificação](./spec.md)
- [Plano de Implementação](./plan.md)
- [Research](./research.md)
- [Constituição do Projeto](../../.specify/memory/constitution.md)
