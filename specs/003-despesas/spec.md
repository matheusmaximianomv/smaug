# Feature Specification: Gestão de Despesas

**Feature Branch**: `003-despesas`  
**Created**: 2026-03-01  
**Status**: Draft  
**Input**: User description: "O módulo de despesas é responsável por registrar e controlar todos os valores que serão descontados das receitas do usuário. Deverá concentrar toda a lógica necessária para garantir organização, consistência e integridade das informações..."

## Assumptions

- As regras de elegibilidade temporal seguem o mesmo padrão do módulo de receitas: apenas o mês atual e meses futuros são elegíveis para criação e edição; meses passados são automaticamente bloqueados.
- Cada despesa e cada categoria pertence a um usuário específico, com isolamento completo (multi-tenant por usuário), consistente com o módulo de receitas.
- Valores monetários seguem as mesmas regras do módulo de receitas: estritamente positivos, com no máximo 2 casas decimais.
- Descrições de despesas seguem o mesmo limite do módulo de receitas: entre 1 e 255 caracteres.
- Despesas recorrentes são sempre modificáveis (não há distinção alterável/inalterável como no módulo de receitas), porém modificações preservam o histórico de meses anteriores através de versionamento, garantindo integridade na apuração mensal.
- A remoção de uma categoria é bloqueada caso existam despesas vinculadas a ela, garantindo integridade referencial.
- Nomes de categorias são únicos por usuário (comparação case-insensitive).
- Despesas parceladas utilizam aritmética em centavos para divisão segura de valores: o valor total é convertido em centavos, dividido pela quantidade de parcelas, e o resto da divisão inteira é acumulado na primeira parcela, garantindo que a soma de todas as parcelas seja sempre exatamente igual ao valor total original.
- Despesas parceladas são imutáveis em seus atributos financeiros após a criação: o valor total, a quantidade de parcelas e os valores calculados de cada parcela não podem ser alterados. Descrição e categoria podem ser atualizados. Caso necessário corrigir valores, o usuário deve excluir a despesa parcelada e recriá-la.
- A exclusão de uma despesa parcelada é bloqueada quando qualquer parcela pertence a um mês passado, preservando a integridade da apuração histórica. A exclusão só é permitida quando todas as parcelas estão no mês atual ou em meses futuros.
- O número máximo de parcelas para despesas parceladas é 72 (equivalente a 6 anos), cobrindo parcelamentos convencionais e financiamentos mais longos.
- Alterações de descrição e categoria em despesas parceladas propagam para todas as parcelas (incluindo meses passados), pois são atributos organizacionais que não impactam a apuração financeira histórica.
- Despesas parceladas suportam encerramento antecipado: parcelas de meses futuros são removidas, enquanto parcelas de meses passados e do mês atual são preservadas. O valor total registrado e a quantidade original de parcelas permanecem inalterados para rastreabilidade.

## Out of Scope

- **Orçamentos**: Definição de limites de gastos por categoria ou período não faz parte deste módulo.
- **Metas financeiras**: Objetivos de economia ou redução de despesas não são tratados aqui.
- **Relatórios e análises**: Gráficos, dashboards, comparações entre períodos ou exportações não fazem parte do escopo.
- **Integração bancária**: Importação automática de transações, conciliação ou conexão com instituições financeiras estão fora do escopo.

## Clarifications

### Session 2026-03-01

- Q: O que acontece quando o usuário tenta excluir uma despesa parcelada que já possui parcelas em meses passados? → A: Bloquear exclusão — se qualquer parcela está em mês passado, a exclusão é rejeitada integralmente. Consistente com a regra de elegibilidade temporal do módulo.
- Q: Qual o limite máximo de parcelas para despesas parceladas? → A: 72 parcelas (6 anos). Cobre financiamentos mais longos como veículos.
- Q: A alteração de descrição/categoria de uma despesa parcelada propaga para todas as parcelas ou apenas futuras? → A: Propagar para todas as parcelas (passadas, atual e futuras), pois descrição e categoria são atributos organizacionais, não financeiros.
- Q: Despesas parceladas devem suportar encerramento antecipado (remover parcelas futuras, preservar passadas)? → A: Sim. Permite encerramento antecipado removendo parcelas de meses futuros e preservando parcelas de meses passados e atual. Similar ao FR-010 de recorrentes.
- Q: O que está explicitamente fora do escopo deste módulo? → A: Orçamentos, metas, relatórios e integração bancária.

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

### User Story 1 - Gestão de categorias de despesas (Priority: P1)

O usuário deseja criar, consultar, alterar e remover categorias para organizar suas despesas. As categorias são pessoais e permitem ao usuário classificar seus gastos conforme sua própria lógica de organização financeira (ex: "Moradia", "Alimentação", "Transporte").

**Why this priority**: Categorias são pré-requisito obrigatório para o registro de qualquer despesa. Sem pelo menos uma categoria, nenhuma despesa pode ser criada.

**Independent Test**: Pode ser testado de forma isolada criando, consultando, alterando e removendo categorias, verificando que os dados são persistidos corretamente e as regras de validação são aplicadas.

**Acceptance Scenarios**:

1. **Given** um usuário autenticado, **When** ele cria uma categoria com nome "Alimentação", **Then** a categoria é registrada com sucesso vinculada ao usuário.
2. **Given** uma categoria "Alimentação" existente, **When** o usuário altera o nome para "Alimentação e Bebidas", **Then** o nome da categoria é atualizado com sucesso.
3. **Given** uma categoria "Transporte" sem despesas vinculadas, **When** o usuário remove a categoria, **Then** ela é excluída permanentemente.
4. **Given** uma categoria "Moradia" com despesas vinculadas, **When** o usuário tenta removê-la, **Then** a operação é rejeitada com erro indicando que existem despesas associadas.
5. **Given** o usuário tenta criar uma categoria com nome vazio, **When** a requisição é enviada, **Then** a operação é rejeitada com erro de validação.
6. **Given** o usuário já possui uma categoria "Alimentação", **When** ele tenta criar outra categoria com o mesmo nome, **Then** a operação é rejeitada com erro indicando duplicidade.

---

### User Story 2 - Cadastro e gestão de despesas avulsas (Priority: P2)

O usuário deseja registrar despesas pontuais (avulsas) vinculadas a um mês de competência específico e a uma categoria. Ele poderá criar, consultar, alterar e remover essas despesas livremente, desde que o mês de competência esteja elegível para edição.

**Why this priority**: Despesas avulsas são a forma mais simples de saída financeira e representam o bloco fundamental do módulo. Sem elas, não há base para compor o cenário de despesas mensais.

**Independent Test**: Pode ser testado de forma isolada criando, consultando, alterando e removendo despesas avulsas para um mês específico, verificando que os dados são persistidos corretamente, a categoria é obrigatória e as regras de validação são aplicadas.

**Acceptance Scenarios**:

1. **Given** uma categoria "Alimentação" existente e um mês de competência válido (ex: 2026-03), **When** o usuário cria uma despesa avulsa com descrição "Jantar restaurante", valor 150.00 e categoria "Alimentação", **Then** a despesa é registrada com sucesso vinculada ao mês 2026-03.
2. **Given** uma despesa avulsa existente no mês 2026-03, **When** o usuário altera o valor de 150.00 para 200.00, **Then** o valor da despesa é atualizado com sucesso.
3. **Given** uma despesa avulsa existente no mês 2026-03, **When** o usuário altera a categoria de "Alimentação" para "Lazer", **Then** a categoria da despesa é atualizada com sucesso.
4. **Given** uma despesa avulsa existente no mês 2026-03, **When** o usuário remove a despesa, **Then** ela deixa de existir na composição financeira do mês.
5. **Given** o usuário tenta criar uma despesa avulsa sem categoria, **When** a requisição é enviada, **Then** a operação é rejeitada com erro de validação.
6. **Given** o usuário tenta criar uma despesa avulsa com valor zero ou negativo, **When** a requisição é enviada, **Then** a operação é rejeitada com erro de validação.

---

### User Story 3 - Cadastro e gestão de despesas parceladas (Priority: P3)

O usuário deseja registrar despesas parceladas, ou seja, despesas únicas cujo valor total será dividido em parcelas mensais consecutivas. O usuário informa o valor total, a quantidade de parcelas, a descrição, a categoria e o mês de competência inicial (mês atual ou um mês futuro). O sistema calcula automaticamente o valor de cada parcela utilizando aritmética em centavos: converte o valor total em centavos, divide pela quantidade de parcelas (divisão inteira), e soma o resto da divisão à primeira parcela, garantindo que a soma de todas as parcelas seja sempre exatamente igual ao valor total original. As parcelas geradas são distribuídas em meses consecutivos a partir do mês inicial.

**Why this priority**: Despesas parceladas são uma modalidade extremamente comum no cotidiano financeiro (compras parceladas no cartão, financiamentos curtos, etc.) e representam um caso intermediário entre despesas avulsas e recorrentes. Sua implementação depende da infraestrutura de categorias (P1) e complementa as despesas avulsas (P2).

**Independent Test**: Pode ser testado criando despesas parceladas com diferentes combinações de valor total e quantidade de parcelas, verificando que os valores são calculados corretamente (aritmética em centavos), que as parcelas são distribuídas nos meses corretos e que a soma das parcelas é exatamente igual ao valor total.

**Acceptance Scenarios**:

1. **Given** uma categoria "Eletrônicos" existente e o mês atual 2026-03, **When** o usuário cria uma despesa parcelada com descrição "Notebook", valor total 1000.00, 3 parcelas, categoria "Eletrônicos" e mês inicial 2026-03, **Then** o sistema gera 3 parcelas: 2026-03 com R$ 333.34, 2026-04 com R$ 333.33 e 2026-05 com R$ 333.33 (aritmética em centavos: 100000 ÷ 3 = 33333 centavos + resto 1 centavo na primeira parcela).
2. **Given** uma categoria "Saúde" existente, **When** o usuário cria uma despesa parcelada com descrição "Tratamento dentário", valor total 450.00, 4 parcelas e mês inicial 2026-06, **Then** o sistema gera 4 parcelas: 2026-06 com R$ 112.50, 2026-07 com R$ 112.50, 2026-08 com R$ 112.50 e 2026-09 com R$ 112.50 (divisão exata: 45000 ÷ 4 = 11250 centavos, resto 0).
3. **Given** o usuário tenta criar uma despesa parcelada com quantidade de parcelas igual a zero ou negativa, **When** a requisição é enviada, **Then** a operação é rejeitada com erro de validação.
4. **Given** o usuário tenta criar uma despesa parcelada com mês inicial no passado, **When** a requisição é enviada, **Then** a operação é rejeitada com erro de validação.
5. **Given** uma despesa parcelada "Notebook" existente com 3 parcelas, **When** o usuário consulta a despesa parcelada, **Then** todas as parcelas são retornadas com seus respectivos valores, meses de competência e número da parcela (1/3, 2/3, 3/3).
6. **Given** uma despesa parcelada "Notebook" existente com 3 parcelas, **When** o usuário exclui a despesa parcelada, **Then** a despesa e todas as suas parcelas são removidas permanentemente.
7. **Given** o usuário tenta criar uma despesa parcelada sem categoria, **When** a requisição é enviada, **Then** a operação é rejeitada com erro de validação.
8. **Given** uma despesa parcelada "Notebook" com 6 parcelas (2026-03 a 2026-08) e o mês atual é 2026-05, **When** o usuário encerra antecipadamente a despesa parcelada, **Then** as parcelas de 2026-06, 2026-07 e 2026-08 são removidas e as parcelas de 2026-03, 2026-04 e 2026-05 são preservadas.

---

### User Story 4 - Cadastro e gestão de despesas recorrentes (Priority: P4)

O usuário deseja registrar despesas recorrentes que se repetem mensalmente durante um período de vigência, vinculadas a uma categoria. A despesa recorrente possui uma data de início obrigatória e uma data de término opcional. O usuário pode criar, consultar, encerrar antecipadamente e excluir essas despesas.

**Why this priority**: Despesas recorrentes são essenciais para modelar gastos mensais contínuos (ex: aluguel, assinaturas, parcelas), permitindo ao sistema reconhecer automaticamente as despesas aplicáveis a cada mês dentro da vigência.

**Independent Test**: Pode ser testado criando despesas recorrentes com diferentes combinações de vigência (com e sem data de término), verificando que o sistema reconhece corretamente quais meses estão cobertos pela despesa.

**Acceptance Scenarios**:

1. **Given** uma categoria "Moradia" existente, **When** o usuário cria uma despesa recorrente com descrição "Aluguel", valor 2000.00, categoria "Moradia", início 2026-03 e término 2026-12, **Then** a despesa é registrada e considerada ativa para todos os meses de março a dezembro de 2026.
2. **Given** uma categoria "Assinaturas" existente, **When** o usuário cria uma despesa recorrente com descrição "Netflix", valor 55.90, categoria "Assinaturas", início 2026-03 e sem data de término, **Then** a despesa é registrada com vigência aberta e considerada ativa a partir de março de 2026 indefinidamente.
3. **Given** o usuário tenta criar uma despesa recorrente com data de término anterior à data de início, **When** a requisição é enviada, **Then** a operação é rejeitada com erro de validação.
4. **Given** uma despesa recorrente "Aluguel" vigente desde 2026-03 até 2026-12, **When** o usuário encerra antecipadamente a recorrência em 2026-06, **Then** a despesa passa a ser considerada ativa apenas de março a junho de 2026.
5. **Given** o usuário tenta criar uma despesa recorrente sem categoria, **When** a requisição é enviada, **Then** a operação é rejeitada com erro de validação.

---

### User Story 5 - Alteração de despesas recorrentes com preservação histórica (Priority: P5)

O usuário deseja modificar uma despesa recorrente (ex: alterar valor, descrição ou categoria). O sistema deve garantir que meses anteriores ao ponto de alteração permaneçam inalterados, aplicando as mudanças apenas para competências futuras ou a partir do mês explicitamente definido como início da nova configuração.

**Why this priority**: A capacidade de alterar despesas recorrentes com preservação de histórico é fundamental para rastreabilidade e integridade dos dados financeiros, garantindo que a apuração de meses passados permaneça correta.

**Independent Test**: Pode ser testado criando uma despesa recorrente, aplicando uma modificação a partir de um mês futuro e verificando que meses anteriores mantêm os valores originais enquanto meses futuros refletem a alteração.

**Acceptance Scenarios**:

1. **Given** uma despesa recorrente "Aluguel" de valor 2000.00, categoria "Moradia", vigente desde 2026-01, **When** o usuário altera o valor para 2200.00 a partir de 2026-06, **Then** os meses de janeiro a maio mantêm o valor 2000.00 e os meses a partir de junho passam a ter o valor 2200.00.
2. **Given** uma despesa recorrente vigente desde 2026-01, **When** o usuário tenta aplicar uma alteração retroativa para 2025-12 (antes do início da vigência), **Then** a operação é rejeitada.
3. **Given** uma despesa recorrente "Aluguel" de valor 2000.00, categoria "Moradia", vigente desde 2026-01, **When** o usuário altera a categoria para "Habitação" a partir de 2026-06, **Then** os meses de janeiro a maio mantêm a categoria "Moradia" e os meses a partir de junho passam a ter a categoria "Habitação".
4. **Given** uma despesa recorrente com múltiplas alterações já registradas, **When** o usuário consulta o histórico da despesa, **Then** todas as versões anteriores e suas respectivas vigências são retornadas.

---

### User Story 6 - Consulta de despesas por competência mensal (Priority: P6)

O usuário deseja consultar todas as despesas (avulsas, parcelas de despesas parceladas e recorrentes) aplicáveis a um determinado mês de competência. O sistema deve consolidar as despesas avulsas registradas para aquele mês, as parcelas de despesas parceladas cujo mês de competência corresponda ao mês consultado, e as despesas recorrentes cuja vigência inclua aquele mês, permitindo a apuração do resultado mensal em conjunto com as receitas.

**Why this priority**: A consulta consolidada por mês é o principal ponto de consumo dos dados de despesas, permitindo ao usuário visualizar a composição de gastos mensais e calcular o saldo em conjunto com as receitas.

**Independent Test**: Pode ser testado criando despesas avulsas, parceladas e recorrentes com diferentes vigências e consultando um mês específico, verificando que todas as despesas aplicáveis são retornadas corretamente.

**Acceptance Scenarios**:

1. **Given** uma despesa avulsa, uma parcela de despesa parcelada e uma despesa recorrente ativa para o mês 2026-03, **When** o usuário consulta as despesas do mês 2026-03, **Then** todas as três despesas são retornadas.
2. **Given** uma despesa recorrente vigente de 2026-01 a 2026-06, **When** o usuário consulta as despesas do mês 2026-08, **Then** a despesa recorrente não é incluída no resultado.
3. **Given** uma despesa parcelada com parcelas nos meses 2026-03, 2026-04 e 2026-05, **When** o usuário consulta as despesas do mês 2026-06, **Then** nenhuma parcela da despesa parcelada é incluída no resultado.
4. **Given** nenhuma despesa registrada para o mês 2026-09, **When** o usuário consulta as despesas do mês, **Then** uma lista vazia é retornada.
5. **Given** despesas de diferentes tipos e categorias para o mês 2026-03, **When** o usuário consulta as despesas do mês, **Then** cada despesa retornada inclui a informação da categoria e do tipo (avulsa, parcela ou recorrente) à qual pertence.

---

### Edge Cases

- O que acontece quando o usuário tenta criar uma despesa avulsa para um mês de competência com formato inválido (ex: "2026-13", "abc")? A operação deve ser rejeitada com erro de validação.
- O que acontece quando o usuário tenta criar uma despesa recorrente com data de início e término no mesmo mês? A operação deve ser aceita, representando uma despesa recorrente válida por exatamente um mês.
- O que acontece quando múltiplas despesas recorrentes coexistem no mesmo mês? Todas devem ser consideradas válidas sem conflito — múltiplas despesas podem coexistir no mesmo mês.
- O que acontece quando uma despesa recorrente sofre múltiplas alterações no mesmo mês? A última configuração vigente para aquele mês deve prevalecer.
- O que acontece quando o usuário tenta encerrar uma despesa recorrente que já expirou (término já passou)? A operação deve ser rejeitada pois a despesa já não está em vigência ativa.
- O que acontece quando o valor informado possui mais de duas casas decimais? A operação deve ser rejeitada, aceitando apenas valores com no máximo 2 casas decimais.
- O que acontece quando o usuário tenta criar uma despesa com valor igual a zero? A operação deve ser rejeitada, pois despesas devem ter valor estritamente positivo.
- O que acontece quando o usuário tenta associar uma despesa a uma categoria inexistente ou pertencente a outro usuário? A operação deve ser rejeitada com erro de validação.
- O que acontece quando o usuário tenta criar uma categoria com nome duplicado (case-insensitive)? A operação deve ser rejeitada com erro indicando duplicidade.
- O que acontece quando o usuário tenta alterar o nome de uma categoria para um nome já existente? A operação deve ser rejeitada com erro indicando duplicidade.
- O que acontece quando o usuário cria uma despesa parcelada com apenas 1 parcela? A operação deve ser aceita — o valor total é atribuído integralmente à parcela única, funcionando como uma despesa avulsa rastreada como parcelada.
- O que acontece quando o valor total da despesa parcelada não é divisível igualmente pela quantidade de parcelas? O sistema utiliza aritmética em centavos: o resto da divisão inteira é acumulado na primeira parcela, garantindo soma exata.
- O que acontece quando o usuário tenta alterar o valor total ou a quantidade de parcelas de uma despesa parcelada já criada? A operação deve ser rejeitada — atributos financeiros de despesas parceladas são imutáveis após criação.
- O que acontece quando o usuário tenta associar uma despesa parcelada a uma categoria inexistente ou pertencente a outro usuário? A operação deve ser rejeitada com erro de validação.
- O que acontece quando o usuário tenta excluir uma despesa parcelada que já possui parcelas em meses passados? A exclusão é bloqueada integralmente — nenhuma parcela é removida, preservando a integridade do histórico financeiro.
- O que acontece quando o usuário tenta criar uma despesa parcelada com mais de 72 parcelas? A operação deve ser rejeitada com erro de validação indicando que o limite máximo é 72 parcelas.
- O que acontece quando o usuário tenta encerrar antecipadamente uma despesa parcelada que não possui parcelas em meses futuros (todas já estão no passado ou no mês atual)? A operação deve ser rejeitada, pois não há parcelas futuras para remover.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O sistema DEVE permitir a criação de categorias de despesas contendo obrigatoriamente um nome (entre 1 e 100 caracteres), vinculadas ao usuário proprietário.
- **FR-002**: O sistema DEVE garantir que o nome da categoria seja único por usuário (comparação case-insensitive), rejeitando duplicidades tanto na criação quanto na alteração.
- **FR-003**: O sistema DEVE permitir a consulta, alteração e remoção de categorias, restringindo o acesso exclusivamente ao usuário proprietário.
- **FR-004**: O sistema DEVE impedir a remoção de categorias que possuam despesas vinculadas (avulsas, parceladas ou recorrentes), retornando mensagem de erro descritiva.
- **FR-005**: O sistema DEVE permitir a criação de despesas avulsas vinculadas a um mês de competência, contendo obrigatoriamente descrição, valor, mês de competência e categoria. O mês de competência deve corresponder ao mês atual ou a um mês futuro; a criação para meses passados deve ser rejeitada.
- **FR-006**: O sistema DEVE permitir a consulta, alteração e remoção de despesas avulsas, desde que o mês de competência esteja elegível para edição. Um mês é considerado elegível quando corresponde ao mês atual ou a um mês futuro; meses passados são automaticamente bloqueados para edição.
- **FR-007**: O sistema DEVE permitir a criação de despesas recorrentes contendo obrigatoriamente descrição, valor, categoria e data de início (mês/ano), e opcionalmente data de término (mês/ano). A data de início deve corresponder ao mês atual ou a um mês futuro; a criação com data de início em meses passados deve ser rejeitada.
- **FR-008**: O sistema DEVE reconhecer despesas recorrentes como ativas para cada mês dentro de seu período de vigência (da data de início até a data de término, ou indefinidamente se sem término).
- **FR-009**: O sistema DEVE permitir a alteração de atributos (valor, descrição, categoria) de despesas recorrentes, aplicando as mudanças apenas a partir do mês definido como início da nova configuração, que deve corresponder obrigatoriamente ao mês atual ou a um mês futuro, preservando o histórico dos meses anteriores.
- **FR-010**: O sistema DEVE permitir o encerramento antecipado de despesas recorrentes, definindo uma nova data de término sem alterar valores já estabelecidos para meses anteriores.
- **FR-011**: O sistema DEVE permitir a exclusão permanente de despesas recorrentes, desde que o usuário seja o proprietário da despesa.
- **FR-012**: O sistema DEVE permitir a consulta consolidada de todas as despesas (avulsas, parcelas de despesas parceladas e recorrentes ativas) aplicáveis a um determinado mês de competência, incluindo a informação da categoria e do tipo de cada despesa.
- **FR-013**: O sistema DEVE validar que o valor de qualquer despesa seja estritamente positivo (maior que zero) e com no máximo 2 casas decimais, rejeitando valores com precisão superior.
- **FR-014**: O sistema DEVE validar que o mês de competência esteja em formato válido (mês/ano).
- **FR-015**: O sistema DEVE validar que a data de término de uma despesa recorrente, quando informada, não seja anterior à data de início.
- **FR-016**: O sistema DEVE suportar a coexistência de múltiplas despesas (de qualquer tipo) no mesmo mês de competência, sem limitação de quantidade.
- **FR-017**: O sistema DEVE garantir periodicidade estritamente mensal para despesas recorrentes, não permitindo qualquer outro tipo de periodicidade.
- **FR-018**: O sistema DEVE garantir que cada despesa (avulsa, parcelada ou recorrente) e cada categoria pertença a um usuário específico, e que o acesso (consulta, alteração, remoção) seja restrito exclusivamente ao seu proprietário.
- **FR-019**: O sistema DEVE validar que a descrição de qualquer despesa contenha entre 1 e 255 caracteres, rejeitando descrições vazias ou que excedam o limite.
- **FR-020**: O sistema DEVE rejeitar a criação de qualquer despesa (avulsa, parcelada ou recorrente) cuja competência ou data de início corresponda a um mês no passado, permitindo apenas o mês atual ou meses futuros.
- **FR-021**: O sistema DEVE manter o histórico de alterações de despesas recorrentes, permitindo rastreabilidade das mudanças ao longo do tempo.
- **FR-022**: O sistema DEVE rejeitar operações que violem regras de domínio, retornando mensagens de erro descritivas.
- **FR-023**: O sistema DEVE garantir que toda despesa esteja obrigatoriamente vinculada a uma categoria válida e existente do mesmo usuário, rejeitando o registro de despesas sem classificação.
- **FR-024**: O sistema DEVE permitir a criação de despesas parceladas contendo obrigatoriamente descrição, valor total, quantidade de parcelas (número inteiro entre 1 e 72), categoria e mês de competência inicial. O mês de competência inicial deve corresponder ao mês atual ou a um mês futuro.
- **FR-025**: O sistema DEVE calcular o valor de cada parcela utilizando aritmética em centavos: converter o valor total para centavos (multiplicar por 100), realizar a divisão inteira pela quantidade de parcelas, e somar o resto da divisão inteira ao valor da primeira parcela. Os valores resultantes devem ser convertidos de volta para reais (dividir por 100), garantindo que a soma de todas as parcelas seja exatamente igual ao valor total original.
- **FR-026**: O sistema DEVE gerar automaticamente as parcelas individuais no momento da criação da despesa parcelada, distribuindo-as em meses de competência consecutivos a partir do mês inicial informado. Cada parcela deve conter o número da parcela (ex: 1/3, 2/3, 3/3), o valor calculado e o mês de competência correspondente.
- **FR-027**: O sistema DEVE garantir que o valor total, a quantidade de parcelas e os valores calculados de cada parcela sejam imutáveis após a criação da despesa parcelada. Descrição e categoria podem ser atualizados, e a alteração deve ser propagada para todas as parcelas (incluindo meses passados), pois são atributos organizacionais que não afetam a apuração financeira.
- **FR-028**: O sistema DEVE permitir a exclusão permanente de uma despesa parcelada, removendo automaticamente todas as suas parcelas associadas, desde que o usuário seja o proprietário e nenhuma parcela pertença a um mês passado. A exclusão deve ser rejeitada integralmente caso qualquer parcela esteja em mês passado.
- **FR-029**: O sistema DEVE incluir as parcelas de despesas parceladas na consulta consolidada de despesas por mês de competência, identificando-as como parcelas e incluindo a referência à despesa parcelada de origem.
- **FR-030**: O sistema DEVE permitir o encerramento antecipado de despesas parceladas, removendo as parcelas de meses futuros e preservando as parcelas de meses passados e do mês atual. O encerramento deve ser rejeitado caso não existam parcelas em meses futuros. O valor total original e a quantidade original de parcelas permanecem registrados para rastreabilidade.

### Key Entities _(include if feature involves data)_

- **Categoria**: Classificação definida pelo usuário para organizar despesas. Atributos: nome, proprietário (usuário). O nome deve ser único por usuário (case-insensitive). Relaciona-se com múltiplas despesas (avulsas, parceladas e recorrentes).
- **Despesa Avulsa**: Saída financeira pontual vinculada a um único mês de competência e a uma categoria. Atributos: descrição, valor, mês de competência, categoria, proprietário (usuário). Não possui recorrência.
- **Despesa Parcelada**: Saída financeira única cujo valor total é distribuído em parcelas mensais consecutivas, vinculada a uma categoria. Atributos: descrição, valor total, quantidade de parcelas, mês de competência inicial, categoria, proprietário (usuário). Gera automaticamente as parcelas individuais no momento da criação utilizando aritmética em centavos.
- **Parcela**: Fração individual de uma despesa parcelada, vinculada a um mês de competência específico. Atributos: número da parcela (ex: 1/3), valor calculado, mês de competência, referência à despesa parcelada de origem. Valores são imutáveis após criação.
- **Despesa Recorrente**: Saída financeira que se repete mensalmente com vigência definida, vinculada a uma categoria. Atributos: descrição, valor, data de início, data de término (opcional), categoria, proprietário (usuário). Relaciona-se com múltiplos meses dentro de sua vigência.
- **Competência Mensal**: Unidade base de organização financeira representada por mês/ano. Agrupa todas as despesas (avulsas, parcelas de despesas parceladas e recorrentes ativas) aplicáveis àquele período.
- **Histórico de Alteração (Despesa Recorrente)**: Registro de cada versão de uma despesa recorrente, contendo os atributos vigentes (valor, descrição, categoria) e o período de aplicação. Garante preservação histórica e rastreabilidade.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: O usuário consegue criar, consultar, alterar e remover categorias de despesas com tempo de resposta inferior a 500ms.
- **SC-002**: O usuário consegue criar, consultar, alterar e remover despesas avulsas para qualquer mês de competência válido com tempo de resposta inferior a 500ms.
- **SC-003**: O usuário consegue criar despesas recorrentes com vigência corretamente reconhecida pelo sistema.
- **SC-004**: 100% das alterações em despesas recorrentes preservam integralmente os dados dos meses anteriores ao ponto de alteração.
- **SC-005**: A consulta de despesas por mês de competência retorna corretamente todas as despesas aplicáveis (avulsas + parcelas de despesas parceladas + recorrentes ativas), incluindo informação de categoria e tipo, com tempo de resposta inferior a 500ms.
- **SC-006**: 100% das operações com dados inválidos (valor não positivo, competência inválida, datas incoerentes, categoria ausente ou inválida, quantidade de parcelas inválida) são rejeitadas com mensagens de erro descritivas.
- **SC-007**: 100% das tentativas de remoção de categorias com despesas vinculadas são rejeitadas pelo sistema.
- **SC-008**: O histórico de alterações de despesas recorrentes é rastreável, permitindo auditoria completa das mudanças ao longo do tempo.
- **SC-009**: O usuário consegue criar despesas parceladas com valores de parcelas corretamente calculados pela aritmética em centavos, garantindo que a soma de todas as parcelas seja exatamente igual ao valor total informado.
- **SC-010**: 100% das despesas parceladas geram parcelas distribuídas nos meses consecutivos corretos a partir do mês inicial informado.
