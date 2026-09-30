# Contrato: formato do arquivo CSV

**Este arquivo é o contrato do formato.** A ordem das colunas e as convenções abaixo não podem mudar
sem quebrar todo arquivo já exportado. O serializador
(`server/src/application/csv/csv-serializer.ts`) e o leitor
(`server/src/application/csv/csv-parser.ts`) implementam exatamente o que está aqui.

## Envelope

| Aspecto            | Valor                                                                      |
| ------------------ | -------------------------------------------------------------------------- |
| Codificação        | UTF-8 **com BOM** (U+FEFF) — sem ele o Excel pt-BR erra os acentos         |
| Separador de campo | `;`                                                                        |
| Quebra de linha    | `CRLF` (`\r\n`), inclusive na última linha                                 |
| Decimal            | vírgula, duas casas, sem separador de milhar (`9200,00`)                   |
| Aspas              | `"` apenas quando o campo contém `;`, `"`, CR ou LF; aspas internas dobram |

Na leitura o BOM é opcional, o CRLF e o LF nu são ambos aceitos, e linhas totalmente vazias são
descartadas (editores de planilha costumam deixar uma no fim).

## Colunas, nesta ordem

| #   | Coluna           | Obrigatória  | Conteúdo                                                           |
| --- | ---------------- | ------------ | ------------------------------------------------------------------ |
| 1   | `competencia`    | sim          | `AAAA-MM`; na leitura o mês pode vir com um dígito. Ano ≥ 2000     |
| 2   | `natureza`       | sim          | `receita` \| `despesa` (leitura é case-insensitive)                |
| 3   | `categoria`      | só despesa   | nome da categoria; vazio em receitas                               |
| 4   | `descricao`      | sim          | 1 a 255 caracteres, já sem espaços nas pontas                      |
| 5   | `valor`          | sim          | positivo, até duas casas. Em `parcelada`, é o valor **da parcela** |
| 6   | `tipo`           | sim          | `avulsa` \| `fixa` \| `parcelada` \| `recorrente`                  |
| 7   | `parcela`        | só parcelada | número da parcela, ≥ 1                                             |
| 8   | `total_parcelas` | só parcelada | total da compra, ≥ parcela e ≤ 72                                  |
| 9   | `serie_id`       | não          | agrupa linhas da mesma série **dentro do arquivo**; descartado     |
| 10  | `observacao`     | não          | existe no formato, não existe no domínio: sai vazia, é ignorada    |

### `valor` em despesa parcelada

Uma linha **por parcela**, e `valor` é o valor **daquela parcela** — nunca o total da compra. O total é
derivado pela soma das linhas da série na importação, então repetir o total em cada linha multiplicaria
a compra pelo número de parcelas.

```
2024-01;despesa;Educação;Notebook;400,00;parcelada;1;3;ser-1;
2024-02;despesa;Educação;Notebook;400,00;parcelada;2;3;ser-1;
2024-03;despesa;Educação;Notebook;400,00;parcelada;3;3;ser-1;
```

Um Notebook de R$ 1.200,00 em 3×. `total_parcelas` declara o tamanho da compra, as três linhas somam o
total, e `serie_id` mantém as três reconhecíveis entre si.

Parcelas de valor desigual são aceitas: o arredondamento vem do arquivo e não é recalculado. Se a série
chegar **truncada** (exportou-se só um mês da compra), `total_parcelas` continua declarando o tamanho
real e `valor` continua sendo o da parcela presente — o Smaug grava só as parcelas que vieram, e o total
reflete o que o arquivo trouxe. A exportação escreve exatamente esse formato, então um arquivo exportado
volta pela importação sem ajuste.

O cabeçalho é lido por nome, não por posição: a ordem das colunas no arquivo de entrada pode variar,
e o nome é comparado sem diferenciar maiúsculas nem espaços nas pontas. As cinco colunas obrigatórias
(`competencia`, `natureza`, `descricao`, `valor`, `tipo`) precisam existir, ou o arquivo é recusado
inteiro.

## Combinações natureza × tipo

|           | `avulsa` | `fixa` | `parcelada` | `recorrente` |
| --------- | -------- | ------ | ----------- | ------------ |
| `receita` | ✅       | ✅     | ❌          | ❌           |
| `despesa` | ✅       | ❌     | ✅          | ✅           |

Despesa fixa não existe no domínio — o equivalente é `recorrente`.

## Ordenação da exportação

Total e determinística, nesta precedência: `competencia` → natureza (receita antes de despesa) →
`categoria` → `descricao` → `valor` → `serie_id` → `parcela`. Os quatro últimos são desempate: sem
eles, lançamentos gêmeos no mesmo mês sairiam na ordem que o banco devolvesse e dois exports do mesmo
estado deixariam de ser idênticos byte a byte. Texto compara com `Intl.Collator("pt-BR")`.

## Nome do arquivo

`smaug-lancamentos-AAAA-MM-DD.csv`, com a data do momento da exportação em UTC. O nome é decidido
pelo servidor e enviado no `Content-Disposition`; o cliente lê de lá em vez de reimplementar a regra.

## Exemplo

```
competencia;natureza;categoria;descricao;valor;tipo;parcela;total_parcelas;serie_id;observacao
2026-04;receita;;Salário;9200,00;fixa;;;fix-0001;
2026-04;despesa;Educação;Notebook Pro;400,00;parcelada;3;12;ser-0031;
```

## Códigos de recusa por linha

Devolvidos pela prévia da importação em `errors[]`, com o número da linha como aparece na planilha
(cabeçalho é a linha 1). A cópia pt-BR mora em `web/infra/api-error.ts`.

`INVALID_COMPETENCE`, `MONTH_OUT_OF_RANGE`, `YEAR_OUT_OF_RANGE`, `INVALID_NATURE`, `INVALID_TYPE`,
`REVENUE_TYPE_NOT_ALLOWED`, `EXPENSE_TYPE_NOT_ALLOWED`, `EMPTY_DESCRIPTION`, `DESCRIPTION_TOO_LONG`,
`INVALID_AMOUNT`, `MISSING_CATEGORY`, `INVALID_INSTALLMENT`.

Uma linha ruim produz **no máximo um** erro: a leitura para no primeiro problema e descarta a linha.
