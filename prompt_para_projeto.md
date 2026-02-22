# Sistema Smaug

Quero que você atue como um arquiteto de software sênior especializado em Node.js, NestJS, DDD e Clean Architecture.

Gere a estrutura base de um projeto backend em Node.js usando NestJS, seguindo boas práticas modernas de arquitetura e código limpo.

## 🎯 Objetivo do sistema

Criar uma API REST escalável e organizada, pronta para crescer, com separação clara de responsabilidades.

------------------------------------------------------------------------------------------------------------------------

## 🏗️ Requisitos de Arquitetura

Use:

NestJS

TypeScript

DDD (Domain-Driven Design)

Clean Architecture

Princípios SOLID

Inversão de dependência

Estrutura preparada para testes

📂 Estrutura de pastas obrigatória

Organize o projeto assim:

src/
 ├── domain/          → regras de negócio puras
 │    ├── entities/
 │    ├── value-objects/
 │    ├── repositories/
 │    └── services/
 │
 ├── application/     → casos de uso
 │    ├── use-cases/
 │    ├── dto/
 │    └── interfaces/
 │
 ├── infra/           → implementação técnica
 │    ├── database/
 │    ├── repositories/
 │    └── providers/
 │
 ├── presentation/    → camada HTTP
 │    ├── controllers/
 │    ├── routes/
 │    └── filters/
 │
 ├── main.ts
 └── app.module.ts

Explique o papel de cada camada.

🧩 Funcionalidade de exemplo

Implemente um módulo de exemplo: Usuários

O sistema deve permitir:

Criar usuário

Listar usuários

Buscar usuário por ID

Usuário deve ter:

id

nome

email

⚙️ Requisitos técnicos

Usar DTOs com validação (class-validator)

Usar Repository Pattern

Usar Injeção de Dependência do Nest

Não misturar regra de negócio com framework

Controller NÃO pode acessar banco direto

Use Prisma OU TypeORM (explique a escolha)

Criar exemplo de:

Entity

Use Case

Repository Interface (domain)

Repository Implementation (infra)

Controller

🧪 Testabilidade

Estrutura preparada para testes unitários

Use cases não devem depender do Nest

Mostrar como mockar o repository

📘 Explique também

Onde fica a regra de negócio

Onde o Nest entra

Como adicionar novos módulos no futuro

Por que essa arquitetura escala melhor

Gere:

Estrutura de pastas

Código base dos arquivos principais

Explicações curtas por parte do código

💡 Por que esse prompt é forte?

Ele força a IA a:

✔ Não fazer "Nest bagunçado"
✔ Separar domínio de framework
✔ Aplicar o que você estuda (DDD + Clean Architecture)
✔ Criar algo que cresce sem virar gambiarra

Se quiser, eu adapto esse prompt para:

🔐 API com autenticação JWT

🐳 Docker

🧪 Testes com Jest

⚡ Versão minimalista

🧠 Versão focada só em DDD puro

Só falar qual estilo você quer que o projeto siga.