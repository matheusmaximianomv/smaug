import { http, HttpResponse } from "msw";
import { url } from "../base";

const BOM = "﻿";
export const CSV_HEADER =
  "competencia;natureza;categoria;descricao;valor;tipo;parcela;total_parcelas;serie_id;observacao";

/** Corpo padrão do export: cabeçalho e uma linha, já com BOM e CRLF como o servidor devolve. */
export const CSV_BODY = `${BOM}${CSV_HEADER}\r\n2026-04;receita;;Salário;9200,00;fixa;;;fix-0001;\r\n`;

export const dataHandlers = [
  http.get(url("/data/export/summary"), ({ request }) => {
    const mode = new URL(request.url).searchParams.get("mode");
    return HttpResponse.json({
      total: 3,
      revenues: 1,
      expenses: 2,
      periodStart: mode === "full" ? "2026-01" : "2026-04",
      periodEnd: mode === "full" ? "2026-09" : "2026-04",
    });
  }),

  http.get(url("/data/export"), () =>
    HttpResponse.text(CSV_BODY, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="smaug-lancamentos-2026-09-14.csv"',
      },
    }),
  ),

  http.post(url("/data/import/preview"), () =>
    HttpResponse.json({
      validRows: 2,
      errors: [],
      counts: { oneTime: 1, fixed: 1, installment: 0, recurring: 0, series: 1 },
    }),
  ),

  http.post(url("/data/import"), () =>
    HttpResponse.json(
      {
        total: 2,
        created: {
          oneTimeRevenues: 1,
          fixedRevenues: 1,
          oneTimeExpenses: 0,
          installmentExpenses: 0,
          recurringExpenses: 0,
        },
        categoriesCreated: 1,
      },
      { status: 201 },
    ),
  ),
];
