# Feature Specification: Importar e Exportar Dados

**Feature Branch**: `006-importar-exportar-dados`
**Created**: 2026-09-14
**Status**: Implemented (especificação escrita retroativamente)
**Input**: "Área de Dados — exportar os lançamentos para CSV e importar lançamentos de fora"

> Esta especificação foi escrita **depois** da implementação, para fechar a lacuna de processo que a
> constituição cobra (Governance: o Constitution Check do `plan.md` valida a aderência de toda
> feature). O conteúdo descreve o comportamento que o código realmente tem, verificado contra
> `server/tests/integration/presentation/data.test.ts` e `e2e/tests/dados/`.

## Clarifications

### Session 2026-09-14 (retroativa, extraída das decisões já tomadas no código)

- Q: O arquivo exportado precisa abrir corretamente no Excel pt-BR? → A: Sim. UTF-8 **com BOM**,
  separador `;`, decimal com vírgula, quebra de linha CRLF.
- Q: Dois exports do mesmo recorte podem sair em ordem diferente? → A: Não. A ordenação é total
  (competência, natureza, categoria, descrição, valor, série, número da parcela), para que dois
  arquivos do mesmo estado sejam idênticos byte a byte.
- Q: A importação atualiza registros existentes? → A: Não. É sempre aditiva; importar o mesmo
  arquivo duas vezes gera tudo em dobro. Não há deduplicação.
- Q: Uma linha inválida invalida o arquivo inteiro? → A: Não. A linha é recusada com um código de
  erro e as demais seguem. O arquivo só é rejeitado inteiro quando está vazio ou quando falta uma
  coluna obrigatória no cabeçalho.
- Q: A importação pode trazer competências passadas? → A: Sim — é o propósito dela. É o único
  caminho autorizado a dispensar a trava de competência passada.
- Q: O `serie_id` do arquivo vira identificador no banco? → A: Não. Ele só agrupa as linhas entre si
  durante a leitura e é descartado; a série recebe um id novo.
- Q: Qual o teto do recorte por período? → A: 12 meses.
- Q: O arquivo sobe como multipart? → A: Não. O CSV vai no corpo cru, com `Content-Type: text/csv`.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Exportar os lançamentos (Priority: P1)

O usuário precisa levar seus lançamentos para fora do Smaug — para conferir numa planilha, guardar
como backup ou migrar.

**Why this priority**: É a metade que não arrisca nada: só lê. Entrega valor sozinha e produz o
arquivo que a US2 consome.

**Independent Test**: Com lançamentos semeados, abrir `/dados`, escolher um recorte e baixar o CSV;
o arquivo abre no Excel pt-BR com acentos corretos e contém os lançamentos do período.

**Acceptance Scenarios**:

1. **Given** tenho lançamentos no mês vigente, **When** abro a aba Exportar, **Then** a prévia mostra
   quantos lançamentos entram no arquivo, separados em receitas e despesas
2. **Given** escolhi um período válido, **When** clico em Baixar CSV, **Then** recebo um arquivo
   chamado `smaug-lancamentos-AAAA-MM-DD.csv`
3. **Given** escolho "Base completa", **When** a prévia carrega, **Then** o período exibido vai do
   lançamento mais antigo até o mais recente, com recorrentes em aberto materializadas até o mês
   vigente
4. **Given** escolho um mês final anterior ao inicial, **When** o seletor muda, **Then** a tela acusa
   o erro e desabilita o download **sem** chamar a API
5. **Given** escolho um recorte maior que 12 meses, **When** o seletor muda, **Then** a tela acusa o
   limite e desabilita o download
6. **Given** exporto o mesmo recorte duas vezes, **When** comparo os arquivos, **Then** eles são
   idênticos byte a byte

---

### User Story 2 - Importar lançamentos (Priority: P1)

O usuário precisa trazer para o Smaug lançamentos que existem fora dele — de uma planilha própria ou
de outra instalação.

**Why this priority**: É o que viabiliza a migração de histórico. Depende do formato fixado pela US1.

**Independent Test**: Subir um CSV na aba Importar, conferir a prévia e confirmar; os lançamentos
aparecem nas telas de receitas e despesas.

**Acceptance Scenarios**:

1. **Given** escolhi um arquivo, **When** ele é lido, **Then** vejo quantos lançamentos são válidos,
   quebrados por tipo, **antes** de qualquer gravação
2. **Given** o arquivo tem linhas inválidas, **When** confiro a prévia, **Then** cada linha recusada
   aparece com o número da linha e o motivo em pt-BR, e as boas seguem importáveis
3. **Given** confirmei a importação, **When** ela conclui, **Then** vejo o resumo do que foi criado,
   por tipo, incluindo categorias novas
4. **Given** o arquivo traz uma categoria que já existe, **When** importo, **Then** ela é reaproveitada
   pelo nome, sem duplicar
5. **Given** o arquivo traz linhas de uma mesma compra parcelada, **When** importo, **Then** elas
   viram **um** parcelamento com as parcelas presentes no arquivo
6. **Given** o arquivo traz competências passadas, **When** importo, **Then** elas são aceitas
7. **Given** importo o mesmo arquivo duas vezes, **When** confiro as telas, **Then** tudo aparece em
   dobro — a importação é aditiva por desenho
8. **Given** o arquivo não tem as colunas obrigatórias, **When** subo, **Then** ele é recusado inteiro
   com orientação sobre o separador

---

### User Story 3 - Ida e volta (Priority: P2)

O arquivo que o Smaug exporta tem de voltar pela importação sem perda.

**Independent Test**: Exportar, subir o mesmo arquivo e confirmar que os lançamentos são recriados.

## Requirements _(mandatory)_

### Functional

- **FR-001**: O sistema DEVE exportar os lançamentos de um recorte por período (1 a 12 meses) ou da
  base completa.
- **FR-002**: O arquivo DEVE seguir o formato fixado em [contracts/csv-format.md](./contracts/csv-format.md).
- **FR-003**: A exportação DEVE ser determinística: mesmo estado, mesmo recorte, mesmos bytes.
- **FR-004**: O sistema DEVE oferecer uma prévia da exportação com total, receitas, despesas e período.
- **FR-005**: O sistema DEVE recusar recorte invertido (`EXPORT_PERIOD_INVALID`) e recorte acima de
  12 meses (`EXPORT_PERIOD_TOO_LONG`), com 400.
- **FR-006**: O sistema DEVE oferecer uma prévia da importação que **não grava nada**.
- **FR-007**: O sistema DEVE recusar linha a linha, com código por linha, e importar as demais.
- **FR-008**: O sistema DEVE recusar o arquivo inteiro quando vazio (`IMPORT_EMPTY_FILE`), sem as
  colunas obrigatórias (`IMPORT_MISSING_COLUMNS`) ou sem nenhuma linha válida
  (`IMPORT_NO_VALID_ROWS`).
- **FR-009**: A importação DEVE gravar o lote inteiro numa única transação — ou tudo, ou nada.
- **FR-010**: A importação DEVE agrupar linhas de uma mesma série pelo `serie_id` e, na falta dele,
  pela descrição; e DEVE descartar o `serie_id` do arquivo.
- **FR-011**: A importação DEVE reaproveitar categoria existente pelo nome (case-insensitive) e criar
  as que faltarem.
- **FR-012**: A importação DEVE aceitar competências passadas, dispensando **apenas** a trava temporal.
- **FR-013**: A importação NÃO DEVE deduplicar.
- **FR-014**: A coluna `observacao` DEVE ser exportada vazia e ignorada na importação.

### Non-Functional

- **NFR-001**: O CSV sobe como corpo cru `text/csv`, limitado a 5 MB — sem dependência de multipart.
- **NFR-002**: O nome do arquivo é decidido pelo servidor e lido pelo cliente no `Content-Disposition`.
- **NFR-003**: Toda cópia mostrada ao usuário é pt-BR e mora no web; o servidor devolve códigos.

## Success Criteria

- **SC-001**: Um arquivo exportado abre no Excel pt-BR com acentos e valores corretos, sem
  configuração manual de importação.
- **SC-002**: Exportar e reimportar recria os lançamentos do recorte.
- **SC-003**: Um arquivo com linhas boas e ruins importa as boas e explica cada ruim.
