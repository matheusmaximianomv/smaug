# Research: Refatoração da Estrutura de Pastas (Server/Web)

**Feature**: 001-refactor-server-web  
**Date**: 2025-04-21  
**Status**: Complete

## Overview

Esta pesquisa documenta as decisões técnicas e melhores práticas para a refatoração estrutural do projeto, separando backend e frontend em projetos independentes.

## Research Tasks

### 1. Estratégia de Migração de Código para `server/`

**Objetivo**: Determinar a melhor abordagem para mover código existente sem quebrar funcionalidades.

**Decision**: Migração incremental com validação contínua

**Rationale**:
- Git preserva histórico ao mover arquivos (usando `git mv`)
- Permite validação após cada grupo de arquivos movidos
- Reduz risco de erros em imports e paths
- Facilita rollback em caso de problemas

**Alternatives Considered**:
- **Copiar e deletar**: Perde histórico do Git, dificulta rastreamento de mudanças
- **Migração atômica completa**: Alto risco, difícil debugar se algo quebrar
- **Symlinks temporários**: Complexidade desnecessária, pode confundir ferramentas

**Implementation Approach**:
1. Criar estrutura de pastas em `server/`
2. Usar `git mv` para mover diretórios principais (`src/`, `tests/`, `prisma/`)
3. Atualizar `package.json` paths e scripts
4. Ajustar imports absolutos (se existirem via `tsconfig.json` paths)
5. Executar testes após cada grupo de mudanças
6. Validar build e execução

---

### 2. Configuração de dependency-cruiser para Validação de Importações

**Objetivo**: Implementar validação automatizada que previna importações cruzadas entre `server/` e `web/`.

**Decision**: Configuração `.dependency-cruiser.js` na raiz com regras forbidden

**Rationale**:
- dependency-cruiser já está instalado no projeto
- Suporta validação de paths e módulos
- Integra facilmente com npm scripts e CI/CD
- Fornece mensagens de erro claras

**Configuration Pattern**:
```javascript
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
    }
  ]
};
```

**Alternatives Considered**:
- **ESLint plugin**: Menos específico para análise de dependências entre módulos
- **TypeScript path restrictions**: Apenas compile-time, não valida em runtime/CI
- **Manual code review**: Propenso a erros humanos, não escalável

**Integration**:
- Script npm: `"validate:deps": "dependency-cruiser --validate .dependency-cruiser.js server web"`
- Executar em pre-commit hook (Husky)
- Executar em CI/CD pipeline

---

### 3. Gerenciamento de Configurações Duplicadas (.env, Docker)

**Objetivo**: Estratégia para manter configurações independentes sem duplicação excessiva.

**Decision**: Arquivos duplicados com documentação clara de sincronização

**Rationale**:
- Projetos completamente independentes (sem workspaces)
- Cada projeto pode ter variáveis específicas
- Facilita deploy independente no futuro
- Evita acoplamento via configurações compartilhadas

**Structure**:
```
/server/.env.example          # Variáveis específicas do backend
/web/.env.example             # Variáveis específicas do frontend
/server/docker-compose.yml    # Orquestração backend (DB, API)
/web/docker-compose.yml       # Orquestração frontend (se necessário)
```

**Alternatives Considered**:
- **Arquivo .env compartilhado na raiz**: Viola isolamento, cria acoplamento
- **Script de sincronização automática**: Complexidade desnecessária neste momento
- **Variáveis de ambiente do sistema**: Dificulta desenvolvimento local

**Best Practices**:
- Documentar no README quais variáveis são compartilhadas (ex: `DATABASE_URL`)
- Usar prefixos claros (`SERVER_`, `WEB_`) quando houver sobreposição
- Manter `.env.example` atualizado em ambos os projetos

---

### 4. Scripts de Orquestração com `npm run --prefix`

**Objetivo**: Configurar scripts na raiz que delegam para `server/` e `web/` de forma eficiente.

**Decision**: Scripts npm usando flag `--prefix` para execução delegada

**Rationale**:
- Solução nativa do npm, sem dependências extras
- Funciona sem npm workspaces
- Sintaxe clara e direta
- Suporta execução sequencial e paralela

**Script Patterns**:
```json
{
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
    
    "install:all": "npm install && npm install --prefix server && npm install --prefix web",
    "validate:deps": "dependency-cruiser --validate .dependency-cruiser.js server web"
  }
}
```

**Alternatives Considered**:
- **npm workspaces**: Rejeitado - decisão de manter projetos independentes
- **Scripts shell personalizados**: Menos portável (Windows/Linux), mais complexo
- **Ferramentas como concurrently**: Dependência extra desnecessária para caso simples
- **Turbo/Nx**: Over-engineering para 2 projetos simples

**Execution Notes**:
- `&` para paralelo (dev servers)
- `&&` para sequencial (build, test)
- Cada projeto mantém seus próprios scripts internos

---

### 5. Configuração Inicial do Next.js 15 com App Router

**Objetivo**: Definir estrutura mínima funcional do Next.js alinhada com a constituição do projeto.

**Decision**: Setup via `create-next-app` com customizações conforme constituição

**Rationale**:
- `create-next-app` fornece configuração otimizada e atualizada
- Next.js 15 é compatível com Node.js 22 LTS
- App Router é o padrão recomendado pela equipe Next.js
- Permite adicionar estrutura `/features` conforme constituição

**Initial Setup Command**:
```bash
npx create-next-app@latest web \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*"
```

**Post-Setup Customizations**:
1. Criar estrutura de pastas conforme constituição:
   ```
   web/
   ├── app/
   ├── features/     # Vazia inicialmente
   ├── shared/       # Vazia inicialmente
   └── infra/        # Vazia inicialmente
   ```

2. Configurar `tsconfig.json` com paths:
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@/*": ["./*"],
         "@/features/*": ["./features/*"],
         "@/shared/*": ["./shared/*"],
         "@/infra/*": ["./infra/*"]
       }
     }
   }
   ```

3. Criar página inicial simples em `app/page.tsx`:
   ```tsx
   export default function Home() {
     return (
       <main className="flex min-h-screen items-center justify-center">
         <h1 className="text-4xl font-bold">Smaug - Em Construção</h1>
       </main>
     );
   }
   ```

**Alternatives Considered**:
- **Setup manual**: Propenso a erros, perde otimizações do create-next-app
- **Next.js 14**: Versão anterior, menos otimizada
- **Pages Router**: Deprecated em favor do App Router

**Dependencies**:
- `next@15.x`
- `react@18.x`
- `react-dom@18.x`
- `typescript@5.x`
- `tailwindcss@3.x`
- `@types/react`, `@types/node`

---

### 6. Ajuste de Imports Absolutos e Paths do TypeScript

**Objetivo**: Garantir que imports continuem funcionando após migração para `server/`.

**Decision**: Atualizar `tsconfig.json` em `server/` mantendo paths relativos à nova raiz

**Rationale**:
- TypeScript paths permitem imports limpos sem `../../..`
- Facilita refatorações futuras
- Mantém consistência com estrutura atual

**Current Configuration** (raiz):
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/domain/*": ["src/domain/*"],
      "@/application/*": ["src/application/*"],
      "@/infrastructure/*": ["src/infrastructure/*"],
      "@/presentation/*": ["src/presentation/*"]
    }
  }
}
```

**New Configuration** (`server/tsconfig.json`):
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/domain/*": ["src/domain/*"],
      "@/application/*": ["src/application/*"],
      "@/infrastructure/*": ["src/infrastructure/*"],
      "@/presentation/*": ["src/presentation/*"]
    }
  }
}
```

**Migration Steps**:
1. Copiar `tsconfig.json` para `server/`
2. Ajustar `baseUrl` se necessário (deve permanecer ".")
3. Verificar que paths ainda apontam para `src/*` (agora relativo a `server/`)
4. Executar `tsc --noEmit` para validar

**Alternatives Considered**:
- **Remover paths e usar imports relativos**: Código menos legível, mais verboso
- **Mudar todos os imports para relativos**: Trabalho manual extenso, propenso a erros

---

### 7. Configuração de Ferramentas de Qualidade (ESLint, Prettier) Multi-Projeto

**Objetivo**: Manter configurações de qualidade de código funcionando para ambos os projetos.

**Decision**: Configurações globais na raiz + overrides específicos em cada projeto

**Rationale**:
- Evita duplicação de regras comuns
- Permite customizações específicas por projeto
- Mantém consistência de estilo no monorepo

**Structure**:
```
/.eslintrc.json           # Regras base compartilhadas
/.prettierrc              # Formatação compartilhada
/server/.eslintrc.json    # Overrides específicos do backend
/web/.eslintrc.json       # Overrides específicos do frontend (Next.js)
```

**Root ESLint** (`.eslintrc.json`):
```json
{
  "parser": "@typescript-eslint/parser",
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    // Regras comuns a ambos os projetos
  }
}
```

**Server ESLint** (`server/.eslintrc.json`):
```json
{
  "extends": ["../.eslintrc.json"],
  "rules": {
    // Regras específicas do backend
  }
}
```

**Web ESLint** (`web/.eslintrc.json`):
```json
{
  "extends": [
    "../.eslintrc.json",
    "next/core-web-vitals"
  ],
  "rules": {
    // Regras específicas do Next.js
  }
}
```

**Alternatives Considered**:
- **Configurações completamente duplicadas**: Dificulta manutenção
- **Apenas configuração global**: Não permite customizações específicas
- **Sem configuração global**: Duplicação excessiva de regras comuns

**Husky Integration**:
- Manter hooks na raiz
- Executar lint em ambos os projetos: `npm run lint:server && npm run lint:web`

---

## Summary

Todas as decisões técnicas foram tomadas com base em:
1. **Simplicidade**: Soluções nativas do npm quando possível
2. **Isolamento**: Projetos completamente independentes
3. **Validação**: Automação via dependency-cruiser e testes
4. **Conformidade**: Alinhamento total com constituição v1.1.0

Nenhuma dependência adicional significativa é necessária além das já presentes no projeto. A refatoração é puramente estrutural e mantém todas as funcionalidades existentes intactas.
