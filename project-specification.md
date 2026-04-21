# Especificação Consolidada do Projeto Smaug

## Visão Geral e Stack Compartilhada

- Linguagem e runtime: Node.js 22 LTS com TypeScript 5.x em modo strict.
- Framework HTTP: Express com middleware de validação utilizando Zod.
- Persistência: Prisma com SQLite (arquivo `dev.db`), IDs gerados na aplicação via `crypto.randomUUID()` e convenção de nomes em `snake_case` com prefixos (`t_`, `i_`, `u_`).
- Autenticação: identificação simplificada por header `X-User-Id` e middleware `extractUser` para isolar dados por usuário.
- Testes: Vitest com suites unitárias (repos in-memory) e de integração (SQLite temporário + supertest).
- Logging: Pino, Injeção de Dependências com tsyringe.
- Valores monetários validados no domínio para aceitar apenas números positivos com até duas casas decimais.

## Convenções Arquiteturais

- Arquitetura em camadas seguindo Clean Architecture (domain, application, infrastructure, presentation).
- Validações de entrada centralizadas em middleware Zod reutilizável.
- Versionamento para entidades que preservam histórico (receitas fixas alteráveis e despesas recorrentes).
- Consultas consolidadas por competência mensal agregando diferentes tipos de registros.

---

## Módulo 002 – Gestão de Receitas Mensais

### Objetivo

Permitir o cadastro, gestão e consulta de receitas avulsas e fixas, respeitando regras de elegibilidade temporal, preservação histórica e isolamento por usuário.

### Clarificações e Regras-chave

- Apenas mês atual e meses futuros são elegíveis para criação ou edição de receitas.
- Receitas são isoladas por usuário; operações exigem `X-User-Id` válido.
- Valores devem ser estritamente positivos (máximo duas casas decimais) e descrições entre 1 e 255 caracteres.
- Receitas fixas podem ser alteráveis ou inalteráveis, sempre com periodicidade mensal. Alteráveis criam histórico de versões; inalteráveis só permitem encerramento antecipado.
- Criação de receitas em meses passados é proibida.

### Casos de Uso Prioritários (User Stories)

1. **US1 – Cadastro e gestão de receitas avulsas (P1)**: CRUD completo de receitas pontuais vinculadas a uma competência mensal, com validações de valor e formato de competência.
2. **US2 – Cadastro de receitas fixas com vigência (P2)**: Criação de receitas fixas com data de início obrigatória, término opcional e modalidade alterável/inalterável imutável após criação.
3. **US3 – Alteração de receitas fixas alteráveis com preservação histórica (P3)**: Atualizações para receitas fixas alteráveis produzindo novas versões ativas a partir de mês atual/futuro, mantendo meses anteriores intactos.
4. **US4 – Gestão de receitas fixas inalteráveis (P4)**: Consulta e encerramento antecipado para receitas inalteráveis, com bloqueio de qualquer outra alteração.
5. **US5 – Consulta de receitas por competência mensal (P5)**: Consolidação de receitas avulsas e fixas vigentes para um mês específico.

Cada caso de uso inclui cenários de aceitação validando fluxos positivos, regras de negação (ex.: valores inválidos, competências passadas) e comportamento esperado ao encerrar receitas ou consultar históricos.

### Requisitos Funcionais (FR-001 a FR-020)

- **FR-001**: Criar receitas avulsas (descrição, valor, competência atual/futura).
- **FR-002**: Consultar, alterar e remover receitas avulsas apenas em meses elegíveis.
- **FR-003**: Criar receitas fixas com descrição, valor, início (mês/ano), modalidade e término opcional.
- **FR-004**: Manter modalidade de receita fixa imutável após criação.
- **FR-005**: Reconhecer receitas fixas como ativas durante toda a vigência.
- **FR-006**: Permitir alterações em receitas fixas alteráveis aplicadas a partir de mês atual/futuro, preservando histórico.
- **FR-007**: Bloquear alterações em receitas fixas inalteráveis.
- **FR-008**: Permitir encerramento antecipado de receitas fixas definindo nova data de término.
- **FR-009**: Consultar receitas consolidadas por competência mensal.
- **FR-010**: Validar valores positivos com no máximo duas casas decimais.
- **FR-011**: Validar formato da competência (mês/ano).
- **FR-012**: Garantir término não anterior ao início em receitas fixas.
- **FR-013**: Permitir coexistência de múltiplas receitas no mesmo mês.
- **FR-014**: Enforce periodicidade estritamente mensal nas fixas.
- **FR-015**: Retornar mensagens de erro descritivas para violações de domínio.
- **FR-016**: Manter histórico de versões de receitas fixas alteráveis.
- **FR-017**: Restringir acesso às receitas ao usuário proprietário.
- **FR-018**: Validar descrições (1–255 caracteres).
- **FR-019**: Rejeitar criação com competência passada.
- **FR-020**: Permitir exclusão permanente de receitas fixas pelo proprietário.

### Entidades Principais

- **Receita Avulsa**: `id`, `userId`, `description`, `amount`, `competenceMonth`, `competenceYear`, timestamps.
- **Receita Fixa**: `id`, `userId`, `modality`, `startMonth`, `startYear`, `endMonth?`, `endYear?`, timestamps.
- **FixedRevenueVersion**: `id`, `fixedRevenueId`, `description`, `amount`, `effectiveMonth`, `effectiveYear`, `createdAt`.
- **Competência Mensal** (conceito): agrupador por mês/ano para consultas consolidadas.

### Padrões de Consulta

- Receitas avulsas filtradas por `userId` + competência.
- Receitas fixas ativas filtradas por vigência (intervalo entre início e término), obtendo versão vigente ordenando por `effectiveYear`/`effectiveMonth` desc.

---

## Módulo 003 – Gestão de Despesas

### Objetivo

Registrar e controlar todas as despesas (categorias, avulsas, parceladas e recorrentes), garantindo integridade histórica, regras temporais alinhadas ao módulo de receitas e organização por categoria.

### Assunções e Regras-chave

- Elegibilidade temporal idêntica à de receitas (criação/edição apenas em mês atual/futuro).
- Categorias e despesas pertencem a um único usuário; nomes de categorias são únicos por usuário (case-insensitive).
- Valores monetários positivos com até duas casas decimais; descrições entre 1 e 255 caracteres.
- Despesas parceladas usam cálculo em centavos para divisão exata e têm atributos financeiros imutáveis após criação.
- Exclusão de categoria bloqueada se existirem despesas vinculadas.
- Despesas recorrentes são sempre versionáveis; alterações preservam histórico.
- Exclusão de despesa parcelada bloqueada se houver parcelas em meses passados.
- Máximo de 72 parcelas para despesas parceladas.

### Casos de Uso Prioritários (User Stories)

1. **US1 – Gestão de categorias de despesas (P1)**: CRUD completo de categorias com unicidade case-insensitive e bloqueio na remoção quando houver despesas associadas.
2. **US2 – Cadastro e gestão de despesas avulsas (P2)**: CRUD de despesas pontuais vinculadas a categoria e competência, com validações de valor e categoria obrigatória.
3. **US3 – Cadastro e gestão de despesas parceladas (P3)**: Criação de despesas parceladas com cálculo automático das parcelas, atualização de descrição/categoria (propagada) e suporte a exclusão/encerramento conforme regras temporais.
4. **US4 – Cadastro e gestão de despesas recorrentes (P4)**: Criação, consulta, encerramento e exclusão de despesas recorrentes com vigência mensal.
5. **US5 – Alteração de despesas recorrentes com preservação histórica (P5)**: Atualizações de valor/descrição/categoria gerando novas versões eficazes em mês atual/futuro.
6. **US6 – Consulta de despesas por competência mensal (P6)**: Consolidação de despesas avulsas, parcelas e recorrentes para uma competência, com identificação de tipo e categoria.

Cada user story possui cenários de aceitação cobrindo sucesso e validações (duplicidade de categorias, valores inválidos, competências passadas, propagação de alterações, retorno de histórico e identificação de tipo na consulta consolidada).

### Requisitos Funcionais (FR-001 a FR-030)

- **FR-001**: Criar categorias (nome 1–100 caracteres).
- **FR-002**: Garantir unicidade case-insensitive de nome por usuário.
- **FR-003**: Permitir consulta, alteração e remoção de categorias apenas pelo proprietário.
- **FR-004**: Bloquear remoção de categorias com despesas vinculadas.
- **FR-005**: Criar despesas avulsas com descrição, valor, competência atual/futura e categoria obrigatória.
- **FR-006**: Consultar, alterar e remover despesas avulsas apenas em meses elegíveis.
- **FR-007**: Criar despesas recorrentes com descrição, valor, categoria, início obrigatório e término opcional.
- **FR-008**: Reconhecer despesas recorrentes como ativas durante a vigência.
- **FR-009**: Alterar atributos de despesas recorrentes com efeito em mês atual/futuro, preservando histórico.
- **FR-010**: Encerrar antecipadamente despesas recorrentes sem alterar meses anteriores.
- **FR-011**: Permitir exclusão permanente de despesas recorrentes pelo proprietário.
- **FR-012**: Consultar despesas consolidadas (avulsas, parcelas, recorrentes) por competência.
- **FR-013**: Validar valores positivos com até duas casas decimais.
- **FR-014**: Validar formato da competência (mês/ano).
- **FR-015**: Garantir término não anterior ao início em despesas recorrentes.
- **FR-016**: Permitir coexistência de múltiplas despesas em um mês.
- **FR-017**: Garantir periodicidade mensal para recorrentes.
- **FR-018**: Restringir acesso às despesas/categorias ao usuário proprietário.
- **FR-019**: Validar descrições (1–255 caracteres).
- **FR-020**: Bloquear criação de despesas em competência passada.
- **FR-021**: Manter histórico versionado de despesas recorrentes.
- **FR-022**: Retornar erros descritivos para violações de domínio.
- **FR-023**: Exigir categoria válida do mesmo usuário em todas as despesas.
- **FR-024**: Criar despesas parceladas com valor total, parcelas (1–72), categoria e competência inicial atual/futura.
- **FR-025**: Calcular parcelas via aritmética em centavos.
- **FR-026**: Gerar parcelas consecutivas automaticamente na criação.
- **FR-027**: Tornar atributos financeiros de despesas parceladas imutáveis; descrição/categoria podem ser atualizadas e propagadas.
- **FR-028**: Excluir despesas parceladas apenas se todas as parcelas estiverem em meses atuais/futuros.
- **FR-029**: Incluir parcelas de despesas parceladas na consulta consolidada com referência ao item de origem.
- **FR-030**: Permitir encerramento antecipado de despesas parceladas removendo parcelas futuras (rejeitar se não houver futuras).

### Entidades Principais

- **Categoria de Despesa**: `id`, `userId`, `name`, `nameLower`, timestamps.
- **Despesa Avulsa**: `id`, `userId`, `categoryId`, `description`, `amount`, `competenceMonth`, `competenceYear`, timestamps.
- **Despesa Parcelada (InstallmentExpense)**: `id`, `userId`, `categoryId`, `description`, `totalAmount`, `installmentCount`, `startMonth`, `startYear`, timestamps.
- **Parcela (Installment)**: `id`, `installmentExpenseId`, `installmentNumber`, `amount`, `competenceMonth`, `competenceYear`, `createdAt`.
- **Despesa Recorrente (RecurringExpense)**: `id`, `userId`, `startMonth`, `startYear`, `endMonth?`, `endYear?`, timestamps.
- **RecurringExpenseVersion**: `id`, `recurringExpenseId`, `categoryId`, `description`, `amount`, `effectiveMonth`, `effectiveYear`, `createdAt`.

### Padrões de Consulta

- Categorias com constraint `@@unique([userId, nameLower])` para unicidade case-insensitive.
- Consolidação de despesas por competência envolve:
  1. Despesas avulsas filtradas por `userId` + competência.
  2. Parcelas filtradas por competência, com dados herdados da despesa parcelada.
  3. Despesas recorrentes ativas para a competência, selecionando versão vigente (ordenada por `effectiveYear`/`effectiveMonth` desc e limit 1).
- Verificações auxiliares: elegibilidade temporal (`year > currentYear` ou `year == currentYear && month >= currentMonth`), detecção de parcelas passadas/futuras para regras de exclusão/encerramento.

---

## Referências

Este documento consolida informações obtidas diretamente das pastas `specs/002-receitas` e `specs/003-despesas`, incluindo arquivos `spec.md`, `data-model.md`, `research.md` e `tasks.md` associados.
