# Feature Specification: Atualizações de plataforma — Next.js 16, Tailwind 4 e Node 24

**Feature Branch**: `009-upgrades-next16-tailwind4-node24`
**Created**: 2026-10-17
**Status**: Implemented (CI do PR pendente)
**Input**: "Atualizar o web para Next.js 16 (saindo das CVEs críticas do 15.0.3 e do React 19 RC), o
Tailwind para a v4 (encerrando os defeitos de merge de classes e as animações que nunca funcionaram) e o
runtime para Node 24 com Prisma 7, sem mudar o comportamento do produto, e documentar o que o deploy
precisa"

> A feature foi conduzida em três etapas sequenciais — **Next 16 → Tailwind 4 → Node 24 + Prisma 7** —
> cada uma desenhada, ensaiada numa cópia descartável do repositório e só então aplicada nesta branch.
> Esta pasta consolida as três no formato Spec Kit e é autossuficiente: decisões e alternativas em
> [research.md](./research.md), Constitution Check e restrições em [plan.md](./plan.md), passos de
> ambiente e de deploy em [quickstart.md](./quickstart.md).

## Clarifications

### Session 2026-10-17 (decisões fechadas antes da implementação)

- Q: Passar pela 15.5.x antes da 16? → A: Não. Salto direto para a 16.4.2: a 15.5.28 resolve as
  críticas, mas mantém o `next` moderado no audit, exige a mesma troca do `next lint` e deixa a 16
  inteira por fazer.
- Q: As três atualizações vão juntas? → A: Mesma branch e mesmo PR, mas aplicadas em sequência
  (CVEs críticas primeiro), cada uma verificada antes da próxima, para facilitar bisect e rollback.
- Q: O Prisma sobe junto com o Node? → A: Sim, direto para a 7.10.1 (estável mais nova; o dist-tag
  `latest` aponta para um RC da 8). A 6.19.3 foi descartada: adiaria todo o trabalho de driver adapters.
- Q: O Docker entra? → A: Não. A imagem continua em `node:22-alpine` e o `Dockerfile` não muda; o
  design do Prisma 7 foi escolhido para que ele siga funcionando sem alteração (ver plan.md § Deploy).
- Q: O que muda para o usuário? → A: Só o que a v3 do Tailwind tinha quebrado sem ninguém perceber:
  toasts e modais passam a ter transição, e todo controle passa a mostrar o foco por teclado. Telas,
  fluxos, API, formato do CSV e dados ficam idênticos.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Uso do produto sem regressão (Priority: P1)

O usuário continua entrando, navegando entre Dashboard, Receitas, Despesas, Categorias, Histórico e
Dados, cadastrando, editando e removendo lançamentos e importando/exportando CSV exatamente como antes.
Rotas protegidas continuam barrando quem não tem sessão.

**Why this priority**: as três atualizações são de plataforma; o valor delas (segurança e suporte) só
existe se nada do que o usuário faz hoje mudar.

**Independent Test**: suítes Vitest de server e web, E2E Playwright completo e smoke da proteção de
rotas sobre o build de produção.

**Acceptance Scenarios**:

1. **Given** um visitante sem sessão, **When** abre `/dashboard` (ou qualquer rota da área logada, ou
   a raiz), **Then** é redirecionado (307) para `/login`
2. **Given** um usuário com o cookie de sessão, **When** abre `/login` ou `/cadastro`, **Then** é
   redirecionado (307) para `/dashboard`; subrotas de `/login`/`/cadastro` continuam públicas
3. **Given** a API com o PostgreSQL inalcançável, **When** `/health` é consultado, **Then** responde
   503 `degraded` em cerca de 5 s, como antes
4. **Given** um banco SQLite ou PostgreSQL já existente, **When** a aplicação atualizada sobe, **Then**
   lê e grava os mesmos dados sem migration nova e sem conversão de formato
5. **Given** valores monetários, **When** exibidos em qualquer tela, **Then** seguem `R$ 1.234,56`
   (com espaço não separável), idênticos aos de antes

---

### User Story 2 - Toasts e modais com transição (Priority: P2)

Ao surgir um toast ou abrir/fechar um modal (Ficha, assistente, confirmação), a mudança é percebida por
uma transição curta, sem atrasar o uso e sem incomodar quem pede menos movimento ao sistema.

**Why this priority**: é uma das duas mudanças visíveis da feature; as classes de animação já estavam
no código, mas não geravam CSS desde o início do projeto.

**Independent Test**: no navegador, abrir e fechar Ficha, confirmação e assistente e disparar um toast,
com e sem `prefers-reduced-motion: reduce` emulado.

**Acceptance Scenarios**:

1. **Given** o usuário confirma uma despesa avulsa, **When** o toast "Despesa adicionada" aparece,
   **Then** ele surge esmaecendo e subindo alguns pixels até a posição final, no canto inferior direito
2. **Given** um toast de erro com "Tentar novamente" que acaba de surgir, **When** o usuário clica na
   ação, **Then** ela responde sem esperar o fim da transição
3. **Given** a Ficha de um lançamento aberta pela linha do extrato, **When** o usuário pressiona Esc,
   **Then** a Ficha sai com transição e o foco volta à linha que a abriu
4. **Given** a confirmação de remoção aberta sobre a Ficha, **When** é fechada com Esc, **Then** só a
   confirmação anima a saída; a Ficha continua aberta, sem repetir a entrada
5. **Given** uma tela de 375 px de largura, **When** o assistente é aberto, **Then** o painel entra
   deslizando a partir da base da tela
6. **Given** "reduzir movimento" ativo no sistema, **When** o usuário abre e fecha a Ficha e recebe um
   toast, **Then** ambos aparecem e somem instantaneamente, sem deslizamento, ampliação ou esmaecimento
7. **Given** o botão "+ Nova despesa", **When** o usuário abre o assistente, **Then** o foco vai para
   dentro do modal assim que ele abre, sem aguardar a transição

---

### User Story 3 - Foco visível por teclado (Priority: P2)

Quem navega pelo teclado sempre enxerga qual controle está com o foco, em qualquer variante visual,
sem depender de cores herdadas do texto ou do fundo.

**Why this priority**: acessibilidade. Antes, o anel de foco das linhas do extrato não era desenhado e
os botões fora da variante padrão herdavam cores que, na v4, ficariam invisíveis (branco sobre branco
na variante perigo).

**Independent Test**: passeio por Tab em Login, extrato de Despesas, Ficha com confirmação de remoção e
assistente, conferindo o indicador vermelho em cada controle.

**Acceptance Scenarios**:

1. **Given** o extrato de Despesas, **When** o usuário chega com Tab a uma linha de lançamento,
   **Then** a linha exibe um contorno vermelho sólido de 2 px
2. **Given** o mesmo extrato, **When** o usuário clica com o mouse numa linha, **Then** a Ficha abre e
   a linha não exibe o contorno de foco
3. **Given** uma confirmação de remoção, **When** o usuário chega com Tab ao botão de confirmar
   (variante perigo), **Then** um anel vermelho afastado do botão é exibido, distinguível do fundo
4. **Given** a mesma confirmação, **When** o usuário chega com Tab a "Cancelar" (variante fantasma),
   **Then** o anel é vermelho, e não da cor do texto do botão
5. **Given** controles sem estilo de foco próprio (links do menu, setas do mês, "Fechar"), **When**
   recebem foco por teclado, **Then** exibem o mesmo contorno vermelho

---

### User Story 4 - Ambiente e deploy na plataforma nova (Priority: P3)

Quem desenvolve ou publica o Smaug sabe exatamente qual Node usar, como reinstalar os quatro pacotes,
como gerar o client do banco e o que muda (e o que não muda) em variáveis, banco, Docker e CI.

**Why this priority**: não é visível ao usuário final, mas um deploy feito com o runtime ou o client
errado derruba a aplicação.

**Independent Test**: seguir o [quickstart.md](./quickstart.md) numa máquina limpa e chegar aos
mesmos números de testes e ao `/health` 200 nos dois providers.

**Acceptance Scenarios**:

1. **Given** uma máquina com `nvm`/`fnm`, **When** o desenvolvedor roda `nvm install && nvm use` na
   raiz, **Then** obtém Node 24 (lido do `.nvmrc`) com npm 11
2. **Given** os quatro lockfiles commitados, **When** `npm ci` roda em cada pacote, **Then** instala
   sem erro e sem flags de relaxamento de peers
3. **Given** um client gerado para SQLite, **When** a aplicação sobe com `DATABASE_PROVIDER=postgresql`,
   **Then** falha na construção do client com mensagem explícita de incompatibilidade de provider

---

### Edge Cases

- **Dev com Node 22 depois do merge**: `engines` avisa no `npm install` (não bloqueia; não há
  `engine-strict`); `nvm use` resolve. Os locks seguem em `lockfileVersion: 3`, instaláveis com npm 10.
- **`npm run dev` aberto durante o E2E**: na Next 16 o `next dev` admite uma instância por diretório; o
  E2E local passou a usar o modo `build` por padrão, que convive com o dev aberto.
- **`dev.db` antigo**: o Prisma 7 grava `DateTime` no SQLite no mesmo formato do Prisma 4 (inteiro em
  ms); linhas antigas e novas ordenam juntas corretamente.
- **Fechamento de modal com movimento reduzido**: sem `animation-name`, o modal é removido na hora;
  não fica preso esperando um `animationend` que nunca chega.
- **Troca de conteúdo dentro de uma camada aberta** (Ficha de série: placeholder de carregamento →
  Ficha): não dispara saída nem devolução de foco.
- **Navegadores antigos** (anteriores a Safari 16.4, Chrome 111, Firefox 128): deixam de receber CSS
  correto. O app já dependia deles (`color-mix`).
- **Agente de IA rodando comandos destrutivos do Prisma** (`db push --force-reset`, `migrate reset`):
  o CLI 7 recusa sem consentimento explícito do usuário; testes e E2E não dependem dessas ações.

## Requirements _(mandatory)_

### Functional Requirements — Comportamento preservado

- **FR-001**: A proteção de rotas MUST continuar idêntica: anônimo em rota da área logada → `/login`;
  sessão em `/login`/`/cadastro` → `/dashboard`; o matcher continua excluindo `_next/static`,
  `_next/image`, `favicon.ico` e `api`.
- **FR-002**: O contrato HTTP do servidor (rotas, status, códigos de erro, `/health` 503 degradado em
  ~5 s com o banco inalcançável) e o formato do CSV de `/data` MUST NOT mudar.
- **FR-003**: Nenhuma migration nova ou editada; bancos existentes MUST continuar válidos sem
  intervenção, com os mesmos checksums de migration e o mesmo formato de `DateTime` no SQLite.
- **FR-004**: A URL da API MUST continuar fixada no build do web, e o cliente só encerra a sessão em 401.
- **FR-005**: Telas, fluxos e textos MUST permanecer iguais, exceto pelas mudanças visuais aceitas em
  FR-020.

### Functional Requirements — Animação de sobreposições

- **FR-010**: Ao surgir, cada toast MUST entrar com uma transição de até 200 ms de esmaecimento combinado
  a um leve deslizamento de baixo para cima, e MUST ficar legível e acionável imediatamente.
- **FR-011**: Ao abrir qualquer modal, o fundo escurecido MUST esmaecer para dentro e o painel MUST
  entrar com esmaecimento e leve ampliação; até 768 px de largura, o painel MUST entrar deslizando da
  base da tela.
- **FR-012**: Ao fechar um modal por botão, Esc ou clique fora, fundo e painel MUST sair com o movimento
  inverso da entrada (no celular, deslizando para a base), em até 200 ms.
- **FR-013**: Com uma camada aberta sobre outra (confirmação sobre a Ficha), só a camada de cima MUST
  animar ao abrir e fechar; a de baixo MUST NOT repetir a entrada.
- **FR-014**: Com preferência do sistema por movimento reduzido, toasts e modais MUST aparecer e sumir
  sem transição de movimento, e o fechamento MUST remover o modal imediatamente. Indicadores de
  carregamento (spinner, skeleton) MUST continuar animados.
- **FR-015**: As transições MUST ser puramente visuais: abrir o modal, mover o foco para dentro dele e
  anunciá-lo a tecnologias assistivas MUST acontecer imediatamente; ao fechar, o foco MUST voltar ao
  elemento de origem assim que a saída termina, em até 200 ms.

### Functional Requirements — Foco visível

- **FR-016**: Todo controle interativo do web (botões, links de navegação, campos, seletores, cartões
  de escolha, células da faixa de meses e linhas do extrato) MUST exibir um indicador de foco visível
  quando recebe foco pelo teclado, e MUST NOT exibi-lo quando o foco vem de clique ou toque.
- **FR-017**: O indicador de foco dos botões MUST ter cor própria — o vermelho de destaque do produto —,
  igual nas variantes padrão, contorno, fantasma e perigo, e MUST permanecer visível contra o fundo da
  página e contra o próprio botão.
- **FR-018**: A linha do extrato focada por teclado MUST exibir contorno vermelho sólido de 2 px; o mês
  corrente na linha do tempo da Ficha MUST continuar contornado.
- **FR-019**: Botões habilitados MUST mostrar o cursor de mão; o placeholder do campo de valor MUST usar
  o tom neutro de texto auxiliar, e não a cor (vermelha/verde) do valor.

### Functional Requirements — Mudanças visuais aceitas

- **FR-020**: São aceitas, e só elas: tons levemente diferentes nas poucas cores da paleta padrão
  usadas em toasts informativos/de aviso e no gráfico semestral; `hover` apenas em dispositivos com
  ponteiro que suporta hover; o selo "Vigente" 2 px mais baixo; ~1 px na linha de total das tabelas do
  Dashboard.

### Non-Functional Requirements

- **NFR-001 (segurança)**: o `next` MUST sair do `npm audit` do web; o web MUST ter zero achados em
  dependências de produção.
- **NFR-002 (suporte)**: o runtime MUST ser uma linha LTS com suporte até pelo menos 2028-04-30
  (Node 24); o ORM MUST estar numa linha mantida (Prisma 7).
- **NFR-003 (reprodutibilidade)**: os quatro pacotes MUST instalar com `npm ci` estrito, sem
  `--legacy-peer-deps`, e o CI MUST instalar exatamente os locks commitados.
- **NFR-004 (versão única)**: a versão do Node MUST vir de uma fonte única (`.nvmrc`), lida pelo
  desenvolvimento local e pelos três jobs de CI.
- **NFR-005 (qualidade)**: cobertura do server em 100% nas quatro métricas; thresholds por glob do web
  verdes; lint com 0 erros; `validate:deps` sem violação.

### Key Entities

Nenhuma entidade de domínio nova ou alterada. A única mudança no schema do Prisma é a remoção da linha
`url` do datasource, exigida pelo Prisma 7; os models ficam idênticos.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% das suítes verdes no Node 24.22.0 / npm 11.19.1 — server 925 testes (101 arquivos),
  web 1248 testes (123 arquivos), E2E 96 testes.
- **SC-002**: `npm audit` do web: de 21 achados (1 crítico) para 8 (todos de desenvolvimento); 0 em
  dependências de produção (antes: 7, 1 crítico).
- **SC-003**: Em 100% dos modais e toasts, entrada e saída terminam em até 200 ms; com movimento
  reduzido, o modal some em menos de 10 ms.
- **SC-004**: Em um passeio por Tab pelas telas de Login, extrato, Ficha com confirmação e assistente,
  100% dos controles focados exibem o indicador vermelho, inclusive os botões perigo e fantasma.
- **SC-005**: Ao fechar a Ficha, o foco volta à linha que a abriu em 100% dos casos (antes ia para o
  `<body>`).
- **SC-006**: `/health` com o PostgreSQL inalcançável responde 503 em até 5,5 s (medido: 5,08 s; sem o
  ajuste de timeout ficaria pendurado mais de 30 s).
- **SC-007**: Zero migrations novas; `migrate:check` verde nos dois dialetos.
- **SC-008**: Capturas `main` × branch, em 1280 px e 375 px, de todas as telas: só as diferenças de
  FR-019 e FR-020.

## Out of Scope

- Docker: imagem em `node:22-alpine`, tamanho da imagem, generator `prisma-client` e ordem do
  `apk add` no `Dockerfile` (ver plan.md § Deploy e Follow-ups).
- React Compiler, `cacheComponents`/PPR, Server Components novos, APIs novas do Node 24, recursos novos
  do Prisma 7 (typed SQL, extensions) e do Tailwind 4 (container queries, `@starting-style`).
- Animação de saída de toasts; modo escuro; troca de tokens; adoção de `cva`.
- Regressão visual automatizada no Playwright.
- Limpeza dos 9 avisos de lint e do restante do `npm audit` de desenvolvimento.
- Node 26 (Active LTS só a partir de 2026-10-28).
