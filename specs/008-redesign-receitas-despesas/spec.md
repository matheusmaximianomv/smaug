# Feature Specification: Redesign de Receitas e Despesas (Smaug v3)

**Feature Branch**: `008-redesign-receitas-despesas`
**Created**: 2026-10-16
**Status**: Implemented
**Input**: "Reorganizar as telas de Receitas e Despesas por competência, com um assistente de cadastro
e uma Ficha por lançamento, seguindo o protótipo v3 e as regras do servidor"

> A feature foi conduzida pelo fluxo OpenSpec (change `redesign-receitas-despesas`, arquivada em
> `openspec/changes/archive/2026-10-17-redesign-receitas-despesas/`). Esta pasta traz o mesmo
> conteúdo no formato Spec Kit, para que a 008 tenha o mesmo rastro que as 001–007. As decisões de
> produto estão em [`docs/008-redesign-receitas-despesas/prd.md`](../../docs/008-redesign-receitas-despesas/prd.md);
> o contrato normativo de comportamento são as specs principais
> `openspec/specs/lancamentos/{consulta-api,extrato-mensal,assistente,ficha}/spec.md`, que esta
> especificação espelha.

## Clarifications

### Session 2026-10-16 (decisões fechadas no PRD e no design da change)

- Q: Onde o protótipo diverge das regras do servidor, qual vale? → A: O servidor. A interface esconde
  as ações que ele recusaria: avulsa de mês passado não oferece Editar/Remover, e parcelamento com
  parcela paga troca "Remover parcelamento" por "Encerrar parcelamento".
- Q: Quem decide qual é o "mês atual" e se uma competência é passada? → A: O servidor, em UTC, com a
  mesma regra que já trava gravações em competência passada. As respostas trazem `competenceStatus` e
  `reference`; o front não usa o relógio local para isso.
- Q: A prévia de parcelas pode ser calculada no front? → A: Sim, desde que seja idêntica à gravação
  (centavos, piso, resto na 1ª parcela) e testada com os mesmos casos do domínio. Um endpoint de prévia
  custaria uma ida à rede a cada tecla para algo determinístico.
- Q: O mês selecionado sobrevive à troca de tela? → A: Sim, durante a sessão do navegador, e é o mesmo
  entre Receitas e Despesas. O Dashboard não é afetado.
- Q: O que acontece com o selo "Avulsa" no Dashboard? → A: Muda de cinza para azul, junto com a
  identidade visual por tipo. É a única mudança visível fora de Receitas e Despesas.
- Q: A API pode mudar campos existentes? → A: Não. Tudo é aditivo: nenhum campo muda de nome, tipo ou
  significado, nenhum código de erro novo, nenhuma migration, e o CSV fica congelado.
- Q: Parcelamentos podem ter descrição/categoria editadas? → A: Fora do escopo, embora o endpoint
  exista; o protótipo não prevê o fluxo.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Ver o mês (Priority: P1)

O usuário abre Receitas ou Despesas e vê o mês: quanto entra ou sai, de quê e de que tipo, e consegue
comparar com os outros meses do ano sem sair da tela.

**Why this priority**: É o problema central do PRD (§1): hoje não há visão do mês. Sem isso as demais
histórias não têm onde morar.

**Independent Test**: Com lançamentos semeados, abrir Despesas e conferir que o mês corrente vem
selecionado, que o total bate com o Dashboard e que setas, faixa e "Voltar para o mês atual" mudam o
mês exibido.

**Acceptance Scenarios**:

1. **Given** o mês corrente do servidor é 04/2026, **When** abro Receitas, **Then** o título é
   "Abril 2026" e a pílula "Mês atual" aparece
2. **Given** a faixa de 12 meses, **When** clico em "Jun", **Then** título, resumo e lista passam a
   mostrar junho; em dezembro, "Próximo mês" leva a janeiro do ano seguinte e a faixa troca de ano
3. **Given** a faixa mostra o total de abril em Despesas, **When** comparo com o Dashboard, **Then**
   os valores são iguais
4. **Given** selecionei 07/2026 em Despesas, **When** recarrego ou vou para Receitas, **Then** a tela
   abre em 07/2026; o Dashboard continua abrindo no mês corrente
5. **Given** o mês tem recorrentes e avulsas, **When** vejo a lista, **Then** só os grupos Recorrentes
   e Avulsas aparecem, nessa ordem, cada um com contador e subtotal
6. **Given** o mês é passado, **When** vejo o resumo, **Then** o rótulo é "Total gasto"/"Total
   recebido"; no corrente e nos futuros, "Total previsto"
7. **Given** um mês passado sem lançamentos, **When** o seleciono, **Then** vejo que competências
   passadas não aceitam lançamentos, sem botão; num mês futuro vazio, vejo o botão "+ Adicionar"
8. **Given** uma recorrente reajustada neste mês de R$ 100,00, **When** vejo a linha, **Then** ela
   mostra o selo "↑ reajuste · era R$ 100,00"

---

### User Story 2 - Cadastrar pelo assistente (Priority: P1)

O usuário cadastra uma despesa ou receita sem precisar saber de antemão qual é o tipo técnico, e vê o
efeito do cadastro — meses afetados e divisão dos centavos — antes de confirmar.

**Why this priority**: Resolve os problemas 2 e 3 do PRD (§1). É o único caminho de criação depois da
remoção das abas.

**Independent Test**: Pelo botão "+ Nova despesa", criar uma parcelada de R$ 100,00 em 3× e conferir a
Revisão (R$ 33,34 + R$ 33,33 + R$ 33,33) e o que o servidor gravou.

**Acceptance Scenarios**:

1. **Given** abro "+ Nova despesa", **When** o assistente aparece, **Then** a etapa Tipo mostra
   Avulsa (selecionada), Parcelada e Recorrente, cada uma com mini-grade de 6 meses
2. **Given** a tela está num mês passado, **When** abro o assistente, **Then** o mês inicial vem no
   mês corrente e o seletor não oferece meses anteriores
3. **Given** informo "10,555" no valor, **When** clico em "Continuar", **Then** o campo mostra "Valor
   inválido" e a Revisão não abre
4. **Given** uma parcelada de R$ 100,00 em 3×, **When** chego à Revisão, **Then** vejo R$ 33,34,
   R$ 33,33 e R$ 33,33 e a nota dos centavos na 1ª parcela; após confirmar, o servidor grava isso
5. **Given** uma recorrente sem término, **When** chego à Revisão, **Then** os meses afetados mostram
   12 barras e "continua…"
6. **Given** o servidor recusa a gravação, **When** confirmo, **Then** o assistente continua aberto com
   os dados e o toast mostra a mensagem pt-BR com "Tentar novamente"
7. **Given** uma avulsa de mês futuro, **When** clico em "Editar" na Ficha, **Then** o assistente abre
   direto em Detalhes, sem trocar o tipo, e "Salvar alterações" atualiza o lançamento

---

### User Story 3 - Consultar e agir pela Ficha (Priority: P2)

O usuário clica num lançamento e vê, num só lugar, os dados, a linha do tempo ou a grade de parcelas e
apenas as ações que o servidor aceitaria.

**Why this priority**: Substitui os cards, modais e formulários espalhados pelas abas. Depende da US1
para existir a linha clicável.

**Independent Test**: Abrir a Ficha de uma avulsa de mês passado (só "Fechar") e a de um parcelamento
com parcela paga ("Encerrar parcelamento", sem "Remover").

**Acceptance Scenarios**:

1. **Given** uma avulsa de mês passado, **When** abro a Ficha, **Then** só há "Fechar" e a nota
   "Competências passadas não podem ser alteradas."
2. **Given** a 2ª de 3 parcelas é a corrente, **When** abro a Ficha, **Then** Pago, Restante e Parcela
   atual (2/3) refletem isso e a grade marca 1/3 paga, 2/3 atual e 3/3 pendente
3. **Given** o parcelamento tem parcelas pagas e futuras, **When** abro a Ficha, **Then** "Remover
   parcelamento" não aparece e "Encerrar parcelamento" aparece com a nota sobre parcelas pagas
4. **Given** confirmei "Encerrar parcelamento", **When** a ação conclui, **Then** as parcelas futuras
   somem, as passadas e a corrente ficam, e o toast "Parcelamento encerrado" aparece
5. **Given** a confirmação de remoção está aberta sobre a Ficha, **When** pressiono Esc, **Then** só a
   confirmação fecha
6. **Given** o servidor recusa uma ação da Ficha, **When** ela falha, **Then** a Ficha continua aberta
   com a mensagem pt-BR e "Tentar novamente"

---

### User Story 4 - Versionar e encerrar séries com prévia (Priority: P2)

O usuário reajusta ou encerra uma recorrente ou uma receita fixa vendo, antes de confirmar, quais meses
mudam na linha do tempo.

**Why this priority**: Fecha o problema 3 do PRD para séries. Depende da Ficha (US3).

**Independent Test**: Numa recorrente sem término, encerrar em 09/2026 e conferir que os meses
hachurados na prévia são exatamente os que deixam de listar a série.

**Acceptance Scenarios**:

1. **Given** uma série com R$ 100,00 desde 01/2026 e R$ 120,00 desde 05/2026, **When** abro a Ficha,
   **Then** a linha do tempo mostra os dois valores nos meses de mudança, com tons distintos, e a aba
   "Histórico (2)" lista as versões da mais recente para a mais antiga
2. **Given** o modo Nova versão, **When** informo R$ 130,00 a partir de 08/2026, **Then** os meses de
   Ago/26 em diante ficam listrados com 130,00 e "Criar nova versão" grava a versão
3. **Given** escolho uma vigência passada, **When** tento salvar, **Then** o campo mostra "Não é
   possível criar versão em competência passada" e nada é gravado
4. **Given** o modo Encerrar, **When** escolho 09/2026, **Then** os meses seguintes aparecem
   hachurados e riscados e, após confirmar, são exatamente os que deixam de existir
5. **Given** uma receita fixa inalterável, **When** abro a Ficha, **Then** "Nova versão" não aparece e
   a nota explicativa é exibida
6. **Given** uma série cujo término já passou, **When** abro a Ficha, **Then** só "Remover" e "Fechar"
   aparecem, com "Encerrada em Mmm/aa — apenas consulta do histórico."

---

### User Story 5 - Identidade por tipo e uso no celular (Priority: P3)

O usuário reconhece o tipo de cada lançamento pela cor e pelo ícone, e usa as telas num celular sem
rolagem horizontal.

**Why this priority**: Melhora leitura e alcance, mas as histórias anteriores funcionam sem ela.

**Independent Test**: Abrir Despesas em 375 px e conferir que só a faixa de meses rola na horizontal e
que a Ficha abre ancorada na base.

**Acceptance Scenarios**:

1. **Given** o Dashboard exibe um lançamento avulso, **When** vejo o selo, **Then** "Avulsa" usa fundo
   `#f0f4ff`, texto `#3b5bdb` e ícone
2. **Given** a tela tem 375 px de largura, **When** abro Despesas, **Then** a faixa de meses rola na
   horizontal, a página não tem rolagem horizontal e a barra de progresso das linhas some
3. **Given** a tela tem até 768 px, **When** abro uma Ficha, **Then** o modal abre ancorado na base e o
   cabeçalho empilha

### Edge Cases

- **Virada de mês em UTC**: às 21h30 de 31/03 em Brasília já é 01/04 no servidor; 03/2026 é passado e
  04/2026 é corrente para tudo que depende de situação.
- **Primeiro render sem referência**: sem mês salvo, a tela abre no mês local e se alinha uma única vez
  ao `reference` do servidor, se for diferente.
- **Armazenamento de sessão indisponível ou lançando exceção**: a tela abre no mês corrente e continua
  navegável.
- **Virada de mês com assistente ou Ficha aberta**: o servidor recusa com o código de competência
  passada; o modal fica aberto com a mensagem pt-BR e "Tentar novamente".
- **Divisão de centavos não exata** (R$ 0,10 em 3×; R$ 1,00 em 72×): o resto vai para a 1ª parcela, na
  prévia e na gravação.
- **Parcelamento que atravessa o ano**: 12 parcelas desde 06/2026 terminam em 05/2027.
- **Série sem término**: linha do tempo até o mês corrente + 8, no máximo 36 meses, terminando em
  "continua…".
- **Ano sem lançamentos no resumo anual**: 12 meses com totais zerados.
- **Rotas existentes**: `GET /revenues/fixed` e `GET /expenses/recurring` não podem ser capturadas pela
  rota nova de resumo.
- **Erro de rede**: a mensagem de offline aparece com "Tentar novamente" e a sessão não é encerrada.

## Requirements _(mandatory)_

### Functional Requirements — API de leitura (servidor)

- **FR-001**: O servidor DEVE classificar cada competência como `PAST`, `CURRENT` ou `FUTURE` em
  relação ao mês corrente em UTC, com a mesma regra que trava gravações em competência passada.
- **FR-002**: `GET /expenses` e `GET /revenues` DEVEM incluir `competenceStatus` e `reference
{year, month}`, mantendo os campos e totais existentes com o mesmo significado.
- **FR-003**: Recorrentes e receitas fixas na consulta mensal DEVEM trazer `previousAmount`: o valor da
  versão anterior quando a vigente começa no mês consultado; `null` nos demais casos.
- **FR-004**: Parcelas na consulta mensal DEVEM trazer `endYear`/`endMonth` da última parcela.
- **FR-005**: O servidor DEVE expor `GET /expenses/summary?year=` e `GET /revenues/summary?year=`, com
  12 meses de `competenceStatus` e `totals` idênticos aos da consulta mensal; 400 sem `year` ou com
  `year` < 2000; 401 sem `X-User-Id`.
- **FR-006**: Toda resposta de parcelamento DEVE trazer `status` por parcela (`PAID`, `CURRENT`,
  `PENDING`), `endYear`/`endMonth`, `canDelete` (nenhuma parcela passada) e `canTerminate` (existe
  parcela futura), derivados das mesmas regras que a remoção e o encerramento aplicam.
- **FR-007**: As respostas de recorrente e de receita fixa DEVEM trazer `isExpired` (término anterior
  ao mês corrente, a regra que bloqueia o encerramento) e `reference`; o detalhe por id DEVE sempre
  trazer `versions` e `currentVersion`.
- **FR-008**: As mudanças de API DEVEM ser aditivas: sem campo alterado, sem código de erro novo, sem
  migration, com Dashboard e CSV inalterados.

### Functional Requirements — Tela principal

- **FR-010**: As telas DEVEM ter título, subtítulo por natureza e um único botão "+ Nova
  despesa/receita", sem abas por tipo.
- **FR-011**: A tela DEVE abrir no mês corrente do servidor e oferecer setas "Mês anterior"/"Próximo
  mês", título por extenso, pílula "Mês atual" e "Voltar para o mês atual".
- **FR-012**: O mês selecionado DEVE persistir na sessão do navegador, compartilhado entre Receitas e
  Despesas, sem afetar o Dashboard e sem falhar se o armazenamento estiver indisponível.
- **FR-013**: A tela DEVE exibir a faixa Jan–Dez do ano selecionado com total compacto ("3.420") ou
  "—", mês selecionado em destaque, ponto no mês corrente e seleção por clique.
- **FR-014**: Com lançamentos, a tela DEVE exibir o resumo: rótulo por situação, total na cor da
  natureza, "N lançamento(s)" e barra por tipo com legenda de todos os tipos, inclusive zerados.
- **FR-015**: A lista DEVE agrupar por tipo na ordem Recorrentes · Parceladas · Avulsas (despesas) ou
  Fixas · Avulsas (receitas), omitindo grupos vazios, com contador e subtotal.
- **FR-016**: Cada linha DEVE ser clicável e acionável por teclado, com ponto do tipo, descrição,
  subtítulo por tipo, valor com sublegenda, selo de reajuste quando houver `previousAmount` e, na
  parcelada, barra de progresso n/N (oculta até 768 px).
- **FR-017**: O estado vazio DEVE distinguir mês passado (explicação, sem botão) de corrente/futuro
  (texto por natureza e botão "+ Adicionar").
- **FR-018**: A tela DEVE exibir esqueleto ao carregar e, em erro, a mensagem pt-BR mapeada com
  "Tentar novamente", sem encerrar a sessão em falha de rede.
- **FR-019**: Toda mutation DEVE atualizar lista, resumo, faixa e totais do Dashboard sem recarregar, e
  exibir o toast de sucesso da ação.

### Functional Requirements — Assistente

- **FR-020**: O assistente DEVE ter três etapas (Tipo → Detalhes → Revisão), indicador de etapas,
  "‹ Voltar" preservando os dados e fechamento por Esc, clique fora ou × sem gravar.
- **FR-021**: A etapa Tipo DEVE apresentar cartões selecionáveis por teclado, com Avulsa
  pré-selecionada: Avulsa, Parcelada, Recorrente (despesas); Avulsa, Fixa com vigência (receitas).
- **FR-022**: A etapa Detalhes DEVE exibir os campos do tipo, com nº de parcelas de 1 a 72 (padrão 2),
  recorrente sem término por padrão e fixa com término em início + 11 e modalidade "Alterável".
- **FR-023**: O mês inicial DEVE ter como padrão o mês da tela, ou o corrente se aquele for passado;
  o seletor DEVE oferecer 36 meses a partir do corrente, e o do mês final começar no inicial.
- **FR-024**: "Continuar" DEVE validar e manter a etapa com a mensagem no campo: "Obrigatório", "Valor
  inválido", "Selecione uma categoria", "Entre 1 e 72", "Competência passada não permitida", "Deve ser
  igual ou posterior ao início".
- **FR-025**: A Revisão DEVE mostrar o destaque por tipo e os meses afetados (até 12 barras, mais "+N
  meses" ou "continua…").
- **FR-026**: A divisão de parcelas da Revisão DEVE ser idêntica à gravada pelo servidor (centavos,
  piso, resto na 1ª), com a nota de centavos quando a divisão não for exata.
- **FR-027**: Se o servidor recusar a gravação, o assistente DEVE ficar aberto com os dados e exibir a
  mensagem pt-BR com "Tentar novamente".
- **FR-028**: A edição DEVE existir só para avulsas de mês corrente ou futuro, abrindo direto em
  Detalhes, sem troca de tipo, com "Salvar alterações".

### Functional Requirements — Ficha

- **FR-030**: A Ficha DEVE abrir em modal largo com selo do tipo, descrição, subtítulo e valor em
  destaque por tipo; até 768 px, ancorada na base.
- **FR-031**: Esc ou clique fora DEVE fechar a Ficha; com confirmação aberta, DEVE fechar só a
  confirmação.
- **FR-032**: A Ficha de avulsa DEVE mostrar Competência, Categoria (despesa), Situação
  ("Realizada"/"Recebida" ou "Prevista") e a grade do ano; DEVE oferecer "Remover"/"Editar" só fora do
  passado, e só "Fechar" com nota explicativa no passado.
- **FR-033**: A Ficha de parcelada DEVE mostrar Pago, Restante, Parcela atual, Termina em, barra de
  progresso e grade de parcelas com a situação informada pelo servidor; DEVE oferecer "Remover
  parcelamento" se `canDelete`, senão "Encerrar parcelamento" se `canTerminate`, senão só "Fechar".
- **FR-034**: A Ficha de série DEVE ter as abas "Linha do tempo" e "Histórico (N)", com uma célula por
  mês, tom por versão, valor só na mudança, mês corrente contornado e chips de versão com "Vigente".
- **FR-035**: A Ficha de série DEVE oferecer sempre "Remover"; "Encerrar" se não expirada; "Nova versão"
  se não expirada e recorrente ou fixa alterável; "Fechar" quando nenhuma das duas se aplica; e as
  notas de fixa inalterável e de série encerrada.
- **FR-036**: O modo Nova versão DEVE vir preenchido com a versão vigente (vigência padrão no mês
  seguinte ao corrente) e mostrar prévia ao vivo com os meses a partir da vigência listrados.
- **FR-037**: O modo Encerrar DEVE ter "Mês de encerramento" (padrão no mês corrente) e prévia com os
  meses posteriores hachurados e riscados, idênticos aos que deixam de existir após confirmar.
- **FR-038**: Toda remoção e o encerramento de parcelamento DEVEM pedir confirmação sobre a Ficha
  (ícone de lixeira, título, mensagem com a descrição, "Cancelar" e ação), fechando a Ficha e exibindo
  o toast ao remover.
- **FR-039**: Se o servidor recusar uma ação da Ficha, ela DEVE ficar aberta com os dados e a mensagem
  pt-BR com "Tentar novamente".

### Functional Requirements — Identidade e responsividade

- **FR-040**: Cada tipo DEVE ter cor e ícone próprios — Avulsa `#3b5bdb`, Parcelada `#c2660a`,
  Recorrente `#6841c7`, Fixa `#2d7a4a` — usados no ponto, na legenda e no selo, inclusive no Dashboard.
- **FR-041**: Até 768 px, a faixa DEVE rolar na horizontal, o título do mês diminuir e a barra de
  progresso das linhas sumir, sem rolagem horizontal da página.

### Non-Functional Requirements

- **NFR-001**: Totais da tela, da faixa, do Dashboard e do CSV DEVEM vir da mesma consulta consolidada
  do servidor.
- **NFR-002**: Toda cópia ao usuário é pt-BR; erros da API passam pela tabela `infra/api-error.ts`.
- **NFR-003**: A remoção do código antigo DEVE se limitar ao que perdeu o consumidor; `MonthYearSelect`,
  `Tabs`, `EmptyState` e `ConfirmDialog` continuam (Dados e Categorias os usam).

### Key Entities

- **Competência**: par mês/ano; ganha a **situação** (`PAST`/`CURRENT`/`FUTURE`) relativa ao mês
  corrente do servidor, a **referência**.
- **Lançamento avulso**: existe numa competência; situação herdada da consulta mensal.
- **Parcelamento**: total dividido em N parcelas mensais; cada parcela tem situação
  (`PAID`/`CURRENT`/`PENDING`); o parcelamento projeta `canDelete` e `canTerminate`.
- **Série** (recorrente ou receita fixa): versões com vigência; projeta `isExpired` e, no mês de
  reajuste, o `previousAmount`.
- **Resumo anual**: 12 meses de situação e totais de uma natureza.

## Success Criteria _(mandatory)_

### Measurable Outcomes

Os 12 critérios de aceite do PRD (§8):

- **SC-001**: Ao abrir Despesas, o mês atual aparece selecionado na faixa, e o total exibido é igual ao
  total de despesas do Dashboard para o mesmo mês.
- **SC-002**: Navegar pelas setas e pela faixa atualiza título, resumo, lista e faixa (que troca de ano
  na virada).
- **SC-003**: Sair da tela e voltar preserva o mês selecionado.
- **SC-004**: Um mês passado sem lançamentos mostra o estado vazio sem botão.
- **SC-005**: Uma parcelada de R$ 100,00 em 3× mostra na Revisão R$ 33,34 + R$ 33,33 + R$ 33,33, e o
  servidor grava exatamente isso.
- **SC-006**: No mês em que uma nova versão entra em vigor, a linha mostra "reajuste · era R$ anterior".
- **SC-007**: Uma Ficha de fixa inalterável não oferece Nova versão e mostra a nota explicativa.
- **SC-008**: A prévia de Encerrar hachura exatamente os meses que deixam de existir depois de
  confirmar.
- **SC-009**: Uma avulsa de mês passado não oferece Editar nem Remover.
- **SC-010**: Um parcelamento com parcela paga oferece "Encerrar parcelamento", e não "Remover".
- **SC-011**: Todas as mensagens de erro da API aparecem em pt-BR, com "Tentar novamente".
- **SC-012**: O layout atende ao FR-041 em 375 px.

## Out of Scope

Herdado do PRD (§10): data de pagamento, periodicidade não mensal, status pago/recebido explícito,
categorias de receita e edição de descrição/categoria de parcelamento. Sem mudança de produto em
Login, Dashboard (além do selo), Categorias, Histórico e Dados. O Dashboard continua no relógio local.
