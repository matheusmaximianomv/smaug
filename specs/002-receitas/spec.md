# Feature Specification: Gestão de Receitas Mensais

**Feature Branch**: `002-receitas`  
**Created**: 2026-02-22  
**Status**: Clarified  
**Input**: User description: "receitas - A API deverá permitir o cadastro de receitas classificadas em dois tipos: receitas avulsas e receitas fixas. Todas as receitas estarão vinculadas obrigatoriamente a uma competência mensal..."

## Clarifications

### Session 2026-02-22

- Q: Qual é a regra que determina se um mês de competência está elegível para edição de receitas? → A: Apenas o mês atual e meses futuros podem ser editados; meses passados são bloqueados automaticamente.
- Q: As receitas são isoladas por usuário (cada usuário vê apenas suas próprias receitas)? → A: Sim, cada receita pertence a um usuário e só ele pode acessá-la (multi-tenant com isolamento por usuário).
- Q: Como o sistema deve tratar valores monetários com mais de duas casas decimais? → A: Rejeitar a operação; aceitar apenas valores com no máximo 2 casas decimais.
- Q: Receitas fixas alteráveis também podem ser encerradas antecipadamente? → A: Sim, ambas as modalidades (alterável e inalterável) podem ser encerradas antecipadamente.
- Q: Qual o limite de caracteres para a descrição de uma receita? → A: Mínimo 1, máximo 255 caracteres.
- Q: É permitido criar receitas em meses que já passaram? → A: Não. A criação de qualquer receita (avulsa ou fixa) só é permitida para o mês atual ou meses futuros.
- Q: Receitas fixas podem ser permanentemente excluídas do sistema, ou apenas encerradas antecipadamente? → A: Sim, receitas fixas podem ser excluídas permanentemente (mesma mecânica das avulsas).
- Q: O mês de início de uma nova configuração de receita fixa alterável deve obrigatoriamente ser o mês atual ou futuro? → A: Sim, obrigatoriamente mês atual ou futuro (consistente com regra geral de elegibilidade).

## User Scenarios & Testing _(mandatory)_

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.

  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Cadastro e gestão de receitas avulsas (Priority: P1)

O usuário deseja registrar receitas pontuais (avulsas) vinculadas a um mês de competência específico. Ele poderá criar, consultar, alterar e remover essas receitas livremente, desde que o mês de competência esteja elegível para edição. Cada receita avulsa representa uma entrada financeira única sem recorrência.

**Why this priority**: Receitas avulsas são a forma mais simples de entrada financeira e representam o bloco fundamental da funcionalidade. Sem elas, não há base para compor o cenário financeiro mensal.

**Independent Test**: Pode ser testado de forma isolada criando, consultando, alterando e removendo receitas avulsas para um mês específico, verificando que os dados são persistidos corretamente e as regras de validação são aplicadas.

**Acceptance Scenarios**:

1. **Given** um mês de competência válido (ex: 2026-03), **When** o usuário cria uma receita avulsa com descrição "Freelance" e valor 1500.00, **Then** a receita é registrada com sucesso vinculada ao mês 2026-03.
2. **Given** uma receita avulsa existente no mês 2026-03, **When** o usuário altera o valor de 1500.00 para 2000.00, **Then** o valor da receita é atualizado com sucesso.
3. **Given** uma receita avulsa existente no mês 2026-03, **When** o usuário remove a receita, **Then** ela deixa de existir na composição financeira do mês.
4. **Given** o usuário tenta criar uma receita avulsa com valor zero ou negativo, **When** a requisição é enviada, **Then** a operação é rejeitada com erro de validação.
5. **Given** o usuário tenta criar uma receita avulsa sem mês de competência, **When** a requisição é enviada, **Then** a operação é rejeitada com erro de validação.

---

### User Story 2 - Cadastro de receitas fixas com vigência (Priority: P2)

O usuário deseja registrar receitas recorrentes (fixas) que se repetem mensalmente durante um período de vigência. A receita fixa possui uma data de início obrigatória e uma data de término opcional. No momento do cadastro, o usuário define se a receita será alterável ou inalterável, sendo essa escolha permanente.

**Why this priority**: Receitas fixas são essenciais para modelar a recorrência de entradas financeiras, permitindo ao sistema reconhecer automaticamente receitas aplicáveis a cada mês dentro da vigência.

**Independent Test**: Pode ser testado criando receitas fixas com diferentes combinações de vigência (com e sem data de término), verificando que o sistema reconhece corretamente quais meses estão cobertos pela receita.

**Acceptance Scenarios**:

1. **Given** o usuário fornece descrição "Salário", valor 5000.00, início 2026-01 e término 2026-12, modalidade alterável, **When** a receita fixa é criada, **Then** ela é registrada e considerada ativa para todos os meses de janeiro a dezembro de 2026.
2. **Given** o usuário fornece descrição "Aluguel recebido", valor 2000.00, início 2026-03 e sem data de término, modalidade inalterável, **When** a receita fixa é criada, **Then** ela é registrada com vigência aberta (sem término definido) e considerada ativa a partir de março de 2026 indefinidamente.
3. **Given** o usuário tenta criar uma receita fixa com data de término anterior à data de início, **When** a requisição é enviada, **Then** a operação é rejeitada com erro de validação.
4. **Given** o usuário tenta criar uma receita fixa sem data de início, **When** a requisição é enviada, **Then** a operação é rejeitada com erro de validação.
5. **Given** a receita fixa é criada com modalidade "alterável", **When** o usuário tenta alterar a modalidade para "inalterável", **Then** a operação é rejeitada pois a modalidade não pode ser modificada após criação.

---

### User Story 3 - Alteração de receitas fixas alteráveis com preservação histórica (Priority: P3)

O usuário deseja modificar uma receita fixa alterável (ex: alterar valor ou descrição). O sistema deve garantir que meses anteriores ao ponto de alteração permaneçam inalterados, aplicando as mudanças apenas para competências futuras ou a partir do mês explicitamente definido como início da nova configuração.

**Why this priority**: A capacidade de alterar receitas fixas com preservação de histórico é fundamental para rastreabilidade e integridade dos dados financeiros ao longo do tempo.

**Independent Test**: Pode ser testado criando uma receita fixa alterável, aplicando uma modificação a partir de um mês futuro e verificando que meses anteriores mantêm os valores originais enquanto meses futuros refletem a alteração.

**Acceptance Scenarios**:

1. **Given** uma receita fixa alterável "Salário" de valor 5000.00 vigente desde 2026-01, **When** o usuário altera o valor para 6000.00 a partir de 2026-06, **Then** os meses de janeiro a maio mantêm o valor 5000.00 e os meses a partir de junho passam a ter o valor 6000.00.
2. **Given** uma receita fixa alterável vigente desde 2026-01, **When** o usuário tenta aplicar uma alteração retroativa para 2025-12 (antes do início da vigência), **Then** a operação é rejeitada.
3. **Given** uma receita fixa alterável com múltiplas alterações já registradas, **When** o usuário consulta o histórico da receita, **Then** todas as versões anteriores e suas respectivas vigências são retornadas.

---

### User Story 4 - Gestão de receitas fixas inalteráveis (Priority: P4)

O usuário deseja consultar receitas fixas inalteráveis e, quando necessário, encerrar antecipadamente sua recorrência. Receitas fixas inalteráveis não permitem alteração de valor, descrição ou período durante a vigência. A única operação permitida além da consulta é o encerramento antecipado.

**Why this priority**: Complementa o modelo de receitas fixas, oferecendo uma modalidade rígida para receitas que não devem sofrer alterações (ex: contratos com valores fixos).

**Independent Test**: Pode ser testado criando uma receita fixa inalterável, tentando alterá-la (verificando rejeição) e encerando-a antecipadamente (verificando que ela deixa de ser ativa a partir do mês de encerramento).

**Acceptance Scenarios**:

1. **Given** uma receita fixa inalterável "Pensão" de valor 1000.00 vigente desde 2026-01, **When** o usuário tenta alterar o valor para 1200.00, **Then** a operação é rejeitada com erro indicando que a receita é inalterável.
2. **Given** uma receita fixa inalterável "Pensão" vigente desde 2026-01 até 2026-12, **When** o usuário encerra antecipadamente a recorrência em 2026-06, **Then** a receita passa a ser considerada ativa apenas de janeiro a junho de 2026, sem modificar os valores já estabelecidos.
3. **Given** uma receita fixa inalterável "Pensão" vigente desde 2026-01, **When** o usuário tenta alterar a descrição, **Then** a operação é rejeitada.

---

### User Story 5 - Consulta de receitas por competência mensal (Priority: P5)

O usuário deseja consultar todas as receitas (avulsas e fixas) aplicáveis a um determinado mês de competência. O sistema deve consolidar as receitas avulsas registradas para aquele mês e as receitas fixas cuja vigência inclua aquele mês.

**Why this priority**: A consulta consolidada por mês é o principal ponto de consumo dos dados de receitas, permitindo ao usuário visualizar a composição financeira mensal completa.

**Independent Test**: Pode ser testado criando receitas avulsas e fixas com diferentes vigências e consultando um mês específico, verificando que todas as receitas aplicáveis são retornadas corretamente.

**Acceptance Scenarios**:

1. **Given** duas receitas avulsas e uma receita fixa ativa para o mês 2026-03, **When** o usuário consulta as receitas do mês 2026-03, **Then** todas as três receitas são retornadas.
2. **Given** uma receita fixa vigente de 2026-01 a 2026-06, **When** o usuário consulta as receitas do mês 2026-08, **Then** a receita fixa não é incluída no resultado.
3. **Given** nenhuma receita registrada para o mês 2026-09, **When** o usuário consulta as receitas do mês, **Then** uma lista vazia é retornada.

---

### Edge Cases

- O que acontece quando o usuário tenta criar uma receita avulsa para um mês de competência com formato inválido (ex: "2026-13", "abc")? A operação deve ser rejeitada com erro de validação.
- O que acontece quando o usuário tenta criar uma receita fixa com data de início e término no mesmo mês? A operação deve ser aceita, representando uma receita fixa válida por exatamente um mês.
- O que acontece quando múltiplas receitas fixas coexistem no mesmo mês? Todas devem ser consideradas válidas sem conflito — múltiplas receitas podem coexistir no mesmo mês.
- O que acontece quando uma receita fixa alterável sofre múltiplas alterações no mesmo mês? A última configuração vigente para aquele mês deve prevalecer.
- O que acontece quando o usuário tenta encerrar uma receita fixa inalterável que já expirou (término já passou)? A operação deve ser rejeitada pois a receita já não está em vigência ativa.
- O que acontece quando o valor informado possui mais de duas casas decimais? A operação deve ser rejeitada, aceitando apenas valores com no máximo 2 casas decimais.
- O que acontece quando o usuário tenta criar uma receita com valor igual a zero? A operação deve ser rejeitada, pois receitas devem ter valor estritamente positivo.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O sistema DEVE permitir a criação de receitas avulsas vinculadas a um mês de competência, contendo obrigatoriamente descrição, valor e mês de competência. O mês de competência deve corresponder ao mês atual ou a um mês futuro; a criação para meses passados deve ser rejeitada.
- **FR-002**: O sistema DEVE permitir a consulta, alteração e remoção de receitas avulsas, desde que o mês de competência esteja elegível para edição. Um mês é considerado elegível quando corresponde ao mês atual ou a um mês futuro; meses passados são automaticamente bloqueados para edição.
- **FR-003**: O sistema DEVE permitir a criação de receitas fixas contendo obrigatoriamente descrição, valor, data de início (mês/ano), modalidade (alterável ou inalterável) e opcionalmente data de término (mês/ano). A data de início deve corresponder ao mês atual ou a um mês futuro; a criação com data de início em meses passados deve ser rejeitada.
- **FR-004**: O sistema DEVE garantir que a modalidade de uma receita fixa (alterável ou inalterável) não possa ser modificada após a criação.
- **FR-005**: O sistema DEVE reconhecer receitas fixas como ativas para cada mês dentro de seu período de vigência (da data de início até a data de término, ou indefinidamente se sem término).
- **FR-006**: O sistema DEVE permitir a alteração de atributos (valor, descrição) de receitas fixas alteráveis, aplicando as mudanças apenas a partir do mês definido como início da nova configuração, que deve corresponder obrigatoriamente ao mês atual ou a um mês futuro, preservando o histórico dos meses anteriores.
- **FR-007**: O sistema DEVE rejeitar qualquer tentativa de alteração de atributos (valor, descrição, período) de receitas fixas inalteráveis durante sua vigência.
- **FR-008**: O sistema DEVE permitir o encerramento antecipado de receitas fixas (tanto alteráveis quanto inalteráveis), definindo uma nova data de término sem alterar valores já estabelecidos para meses anteriores.
- **FR-009**: O sistema DEVE permitir a consulta consolidada de todas as receitas (avulsas e fixas ativas) aplicáveis a um determinado mês de competência.
- **FR-010**: O sistema DEVE validar que o valor de qualquer receita seja estritamente positivo (maior que zero) e com no máximo 2 casas decimais, rejeitando valores com precisão superior.
- **FR-011**: O sistema DEVE validar que o mês de competência esteja em formato válido (mês/ano).
- **FR-012**: O sistema DEVE validar que a data de término de uma receita fixa, quando informada, não seja anterior à data de início.
- **FR-013**: O sistema DEVE suportar a coexistência de múltiplas receitas (de qualquer tipo) no mesmo mês de competência, sem limitação de quantidade.
- **FR-014**: O sistema DEVE garantir periodicidade estritamente mensal para receitas fixas, não permitindo qualquer outro tipo de periodicidade.
- **FR-015**: O sistema DEVE rejeitar operações que violem regras de domínio, retornando mensagens de erro descritivas.
- **FR-016**: O sistema DEVE manter o histórico de alterações de receitas fixas alteráveis, permitindo rastreabilidade das mudanças ao longo do tempo.
- **FR-017**: O sistema DEVE garantir que cada receita (avulsa ou fixa) pertença a um usuário específico, e que o acesso (consulta, alteração, remoção) seja restrito exclusivamente ao seu proprietário.
- **FR-018**: O sistema DEVE validar que a descrição de qualquer receita contenha entre 1 e 255 caracteres, rejeitando descrições vazias ou que excedam o limite.
- **FR-019**: O sistema DEVE rejeitar a criação de qualquer receita (avulsa ou fixa) cuja competência ou data de início corresponda a um mês no passado, permitindo apenas o mês atual ou meses futuros.
- **FR-020**: O sistema DEVE permitir a exclusão permanente de receitas fixas (tanto alteráveis quanto inalteráveis), desde que o usuário seja o proprietário da receita.

### Key Entities _(include if feature involves data)_

- **Receita Avulsa**: Entrada financeira pontual vinculada a um único mês de competência. Atributos: descrição, valor, mês de competência, proprietário (usuário). Não possui recorrência.
- **Receita Fixa**: Entrada financeira recorrente com vigência mensal. Atributos: descrição, valor, data de início, data de término (opcional), modalidade (alterável ou inalterável), proprietário (usuário). Relaciona-se com múltiplos meses dentro de sua vigência.
- **Competência Mensal**: Unidade base de organização financeira representada por mês/ano. Agrupa todas as receitas (avulsas e fixas ativas) aplicáveis àquele período.
- **Histórico de Alteração (Receita Fixa Alterável)**: Registro de cada versão de uma receita fixa alterável, contendo os atributos vigentes e o período de aplicação. Garante preservação histórica e rastreabilidade.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: O usuário consegue criar, consultar, alterar e remover receitas avulsas para qualquer mês de competência válido com tempo de resposta inferior a 500ms.
- **SC-002**: O usuário consegue criar receitas fixas em ambas as modalidades (alterável e inalterável) com vigência corretamente reconhecida pelo sistema.
- **SC-003**: 100% das alterações em receitas fixas alteráveis preservam integralmente os dados dos meses anteriores ao ponto de alteração.
- **SC-004**: 100% das tentativas de modificação de receitas fixas inalteráveis são rejeitadas pelo sistema, exceto o encerramento antecipado.
- **SC-005**: A consulta de receitas por mês de competência retorna corretamente todas as receitas aplicáveis (avulsas + fixas ativas) com tempo de resposta inferior a 500ms.
- **SC-006**: 100% das operações com dados inválidos (valor não positivo, competência inválida, datas incoerentes) são rejeitadas com mensagens de erro descritivas.
- **SC-007**: O histórico de alterações de receitas fixas alteráveis é rastreável, permitindo auditoria completa das mudanças ao longo do tempo.
