import request from "supertest";
import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import type { Express } from "express";

const TEST_DB_URL = "file:./test-data.db";
const BOM = "﻿";
const HEADER =
  "competencia;natureza;categoria;descricao;valor;tipo;parcela;total_parcelas;serie_id;observacao";

/** Competência corrente e a seguinte: os endpoints de criação recusam meses passados. */
const NOW = new Date();
const YEAR = NOW.getUTCFullYear();
const MONTH = NOW.getUTCMonth() + 1;
const NEXT = MONTH === 12 ? { year: YEAR + 1, month: 1 } : { year: YEAR, month: MONTH + 1 };

const competence = (year: number, month: number): string =>
  `${year}-${String(month).padStart(2, "0")}`;

describe("Data Endpoints", () => {
  let prisma: PrismaClient;
  let app: Express;
  let userId: string;

  beforeAll(async () => {
    vi.resetModules();

    process.env.DATABASE_PROVIDER = "sqlite";
    process.env.DATABASE_URL = TEST_DB_URL;
    process.env.NODE_ENV = "test";
    process.env.PORT = "3000";
    process.env.LOG_LEVEL = "error";

    prisma = new PrismaClient({ datasources: { db: { url: TEST_DB_URL } } });

    const { execSync } = await import("child_process");
    execSync(`DATABASE_URL=${TEST_DB_URL} npx prisma db push --force-reset --skip-generate`, {
      cwd: process.cwd(),
      stdio: "pipe",
    });

    const { createHttpServer } = await import("@src/infrastructure/http/server");
    app = createHttpServer();

    const createUserRes = await request(app)
      .post("/users")
      .send({ name: "Data User", email: "data-user@example.com" });
    userId = createUserRes.body.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    const { unlinkSync, existsSync } = await import("fs");
    const dbPath = TEST_DB_URL.replace("file:", "").replace("./", "prisma/");
    if (existsSync(dbPath)) unlinkSync(dbPath);
  });

  beforeEach(async () => {
    await prisma.oneTimeExpense.deleteMany();
    await prisma.installment.deleteMany();
    await prisma.installmentExpense.deleteMany();
    await prisma.recurringExpenseVersion.deleteMany();
    await prisma.recurringExpense.deleteMany();
    await prisma.expenseCategory.deleteMany();
    await prisma.fixedRevenueVersion.deleteMany();
    await prisma.fixedRevenue.deleteMany();
    await prisma.oneTimeRevenue.deleteMany();
  });

  const authHeaders = () => ({ "X-User-Id": userId });

  const periodQuery = (year = YEAR, month = MONTH) =>
    `mode=period&startYear=${year}&startMonth=${month}&endYear=${year}&endMonth=${month}`;

  async function seedCategory(name: string): Promise<string> {
    const res = await request(app).post("/expenses/categories").set(authHeaders()).send({ name });
    return res.body.id;
  }

  function lines(body: string): string[] {
    return body.slice(BOM.length).trimEnd().split("\r\n");
  }

  describe("authentication", () => {
    it("should reject an export without the user header", async () => {
      await request(app).get(`/data/export?${periodQuery()}`).expect(401);
    });

    it("should reject an import without the user header", async () => {
      await request(app)
        .post("/data/import")
        .set("Content-Type", "text/csv")
        .send(HEADER)
        .expect(401);
    });
  });

  describe("GET /data/export", () => {
    it("should answer with a CSV attachment named after the day", async () => {
      const res = await request(app)
        .get(`/data/export?${periodQuery()}`)
        .set(authHeaders())
        .expect(200);

      expect(res.headers["content-type"]).toContain("text/csv");
      expect(res.headers["content-disposition"]).toMatch(
        /attachment; filename="smaug-lancamentos-\d{4}-\d{2}-\d{2}\.csv"/,
      );
    });

    it("should emit a BOM, the header and CRLF even for an empty base", async () => {
      const res = await request(app)
        .get(`/data/export?${periodQuery()}`)
        .set(authHeaders())
        .expect(200);

      expect(res.text).toBe(`${BOM}${HEADER}\r\n`);
    });

    it("should export the entries of the requested competence", async () => {
      const categoryId = await seedCategory("Alimentação");
      await request(app)
        .post("/revenues/one-time")
        .set(authHeaders())
        .send({
          description: "Freelance",
          amount: 2500,
          competenceMonth: MONTH,
          competenceYear: YEAR,
        })
        .expect(201);
      await request(app)
        .post("/expenses/one-time")
        .set(authHeaders())
        .send({
          categoryId,
          description: "Supermercado",
          amount: 320.5,
          competenceMonth: MONTH,
          competenceYear: YEAR,
        })
        .expect(201);

      const res = await request(app)
        .get(`/data/export?${periodQuery()}`)
        .set(authHeaders())
        .expect(200);

      expect(lines(res.text)).toEqual([
        HEADER,
        `${competence(YEAR, MONTH)};receita;;Freelance;2500,00;avulsa;;;;`,
        `${competence(YEAR, MONTH)};despesa;Alimentação;Supermercado;320,50;avulsa;;;;`,
      ]);
    });

    it("should be byte-identical across two exports of the same period", async () => {
      const categoryId = await seedCategory("Transporte");
      await request(app)
        .post("/expenses/one-time")
        .set(authHeaders())
        .send({
          categoryId,
          description: "Estacionamento",
          amount: 3.5,
          competenceMonth: MONTH,
          competenceYear: YEAR,
        });
      await request(app)
        .post("/expenses/one-time")
        .set(authHeaders())
        .send({
          categoryId,
          description: "Estacionamento",
          amount: 3.5,
          competenceMonth: MONTH,
          competenceYear: YEAR,
        });

      const first = await request(app).get(`/data/export?${periodQuery()}`).set(authHeaders());
      const second = await request(app).get(`/data/export?${periodQuery()}`).set(authHeaders());

      expect(Buffer.from(first.text)).toEqual(Buffer.from(second.text));
    });

    it("should truncate a series to the requested window", async () => {
      const categoryId = await seedCategory("Educação");
      await request(app)
        .post("/expenses/installment")
        .set(authHeaders())
        .send({
          categoryId,
          description: "Notebook Pro",
          totalAmount: 1200,
          installmentCount: 12,
          startMonth: MONTH,
          startYear: YEAR,
        })
        .expect(201);

      const res = await request(app).get(`/data/export?${periodQuery()}`).set(authHeaders());

      const rows = lines(res.text).slice(1);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toContain(";parcelada;1;12;");
    });

    it("should reject an inverted period", async () => {
      const res = await request(app)
        .get(`/data/export?mode=period&startYear=${YEAR}&startMonth=6&endYear=${YEAR}&endMonth=3`)
        .set(authHeaders())
        .expect(400);

      expect(res.body.error).toBe("EXPORT_PERIOD_INVALID");
    });

    it("should reject a period longer than twelve months", async () => {
      const res = await request(app)
        .get(
          `/data/export?mode=period&startYear=${YEAR}&startMonth=1&endYear=${YEAR + 1}&endMonth=1`,
        )
        .set(authHeaders())
        .expect(400);

      expect(res.body.error).toBe("EXPORT_PERIOD_TOO_LONG");
    });

    it("should reject a period request without its bounds", async () => {
      await request(app).get("/data/export?mode=period").set(authHeaders()).expect(400);
    });

    it("should export the whole base in full mode", async () => {
      await request(app)
        .post("/revenues/one-time")
        .set(authHeaders())
        .send({
          description: "Bônus",
          amount: 100,
          competenceMonth: NEXT.month,
          competenceYear: NEXT.year,
        });

      const res = await request(app).get("/data/export?mode=full").set(authHeaders()).expect(200);

      expect(lines(res.text).slice(1)).toEqual([
        `${competence(NEXT.year, NEXT.month)};receita;;Bônus;100,00;avulsa;;;;`,
      ]);
    });
  });

  describe("GET /data/export/summary", () => {
    it("should count revenues and expenses of the period", async () => {
      const categoryId = await seedCategory("Casa");
      await request(app)
        .post("/revenues/one-time")
        .set(authHeaders())
        .send({ description: "Bônus", amount: 100, competenceMonth: MONTH, competenceYear: YEAR });
      await request(app)
        .post("/expenses/one-time")
        .set(authHeaders())
        .send({
          categoryId,
          description: "Luz",
          amount: 90,
          competenceMonth: MONTH,
          competenceYear: YEAR,
        });

      const res = await request(app)
        .get(`/data/export/summary?${periodQuery()}`)
        .set(authHeaders())
        .expect(200);

      expect(res.body).toEqual({
        total: 2,
        revenues: 1,
        expenses: 1,
        periodStart: competence(YEAR, MONTH),
        periodEnd: competence(YEAR, MONTH),
      });
    });

    it("should report a null period for an empty base in full mode", async () => {
      const res = await request(app)
        .get("/data/export/summary?mode=full")
        .set(authHeaders())
        .expect(200);

      expect(res.body).toEqual({
        total: 0,
        revenues: 0,
        expenses: 0,
        periodStart: null,
        periodEnd: null,
      });
    });
  });

  describe("POST /data/import/preview", () => {
    const post = (body: string) =>
      request(app)
        .post("/data/import/preview")
        .set(authHeaders())
        .set("Content-Type", "text/csv")
        .send(body);

    it("should count the valid rows without writing anything", async () => {
      const res = await post(
        [HEADER, `${competence(YEAR, MONTH)};receita;;Bônus;500,00;avulsa;;;;`].join("\r\n"),
      ).expect(200);

      expect(res.body.validRows).toBe(1);
      expect(await prisma.oneTimeRevenue.count()).toBe(0);
    });

    it("should report the problem rows with their line numbers", async () => {
      const res = await post(
        [HEADER, "abril;receita;;Bônus;500,00;avulsa;;;;"].join("\r\n"),
      ).expect(200);

      expect(res.body.errors).toEqual([{ line: 2, code: "INVALID_COMPETENCE", value: "abril" }]);
    });

    it("should reject a file without the required columns", async () => {
      const res = await post("competencia;natureza").expect(400);
      expect(res.body.error).toBe("IMPORT_MISSING_COLUMNS");
    });

    it("should reject an empty file", async () => {
      const res = await post("").expect(400);
      expect(res.body.error).toBe("IMPORT_EMPTY_FILE");
    });
  });

  describe("POST /data/import", () => {
    const post = (body: string) =>
      request(app)
        .post("/data/import")
        .set(authHeaders())
        .set("Content-Type", "text/csv")
        .send(body);

    it("should create the entries described by the file", async () => {
      const res = await post(
        [
          HEADER,
          `${competence(YEAR, MONTH)};receita;;Bônus;500,00;avulsa;;;;`,
          `${competence(YEAR, MONTH)};despesa;Mercado;Feira;80,00;avulsa;;;;`,
        ].join("\r\n"),
      ).expect(201);

      expect(res.body.total).toBe(2);
      expect(res.body.categoriesCreated).toBe(1);
      expect(await prisma.oneTimeRevenue.count()).toBe(1);
      expect(await prisma.oneTimeExpense.count()).toBe(1);
    });

    it("should import a past competence, which is what migration needs", async () => {
      await post(
        [HEADER, "2020-01;receita;;Salário antigo;3000,00;avulsa;;;;"].join("\r\n"),
      ).expect(201);

      const stored = await prisma.oneTimeRevenue.findFirst();
      expect(stored).toMatchObject({ competenceYear: 2020, competenceMonth: 1 });
    });

    it("should build one installment purchase out of the grouped rows", async () => {
      await post(
        [
          HEADER,
          "2024-01;despesa;Educação;Notebook;400,00;parcelada;1;3;ser-1;",
          "2024-02;despesa;Educação;Notebook;400,00;parcelada;2;3;ser-1;",
          "2024-03;despesa;Educação;Notebook;400,00;parcelada;3;3;ser-1;",
        ].join("\r\n"),
      ).expect(201);

      const expense = await prisma.installmentExpense.findFirstOrThrow({
        include: { installments: true },
      });
      expect(expense.installmentCount).toBe(3);
      expect(expense.totalAmount).toBe(1200);
      expect(expense.installments).toHaveLength(3);
    });

    it("should reuse an existing category matched by name", async () => {
      await seedCategory("Mercado");

      const res = await post(
        [HEADER, `${competence(YEAR, MONTH)};despesa;MERCADO;Feira;80,00;avulsa;;;;`].join("\r\n"),
      ).expect(201);

      expect(res.body.categoriesCreated).toBe(0);
      expect(await prisma.expenseCategory.count()).toBe(1);
    });

    it("should infer the validity of a fixed revenue from the file", async () => {
      await post(
        [
          HEADER,
          "2024-01;receita;;Salário;9200,00;fixa;;;fix-1;",
          "2024-02;receita;;Salário;9800,00;fixa;;;fix-1;",
        ].join("\r\n"),
      ).expect(201);

      const revenue = await prisma.fixedRevenue.findFirstOrThrow({ include: { versions: true } });
      expect(revenue).toMatchObject({ startYear: 2024, startMonth: 1, endYear: 2024, endMonth: 2 });
      expect(revenue.versions).toHaveLength(2);
    });

    it("should reject a file whose rows are all invalid", async () => {
      const res = await post(
        [HEADER, "abril;receita;;Bônus;500,00;avulsa;;;;"].join("\r\n"),
      ).expect(422);
      expect(res.body.error).toBe("IMPORT_NO_VALID_ROWS");
    });

    it("should keep the good rows and drop the bad ones", async () => {
      const res = await post(
        [
          HEADER,
          `${competence(YEAR, MONTH)};receita;;Bônus;500,00;avulsa;;;;`,
          "abril;receita;;Inválido;500,00;avulsa;;;;",
        ].join("\r\n"),
      ).expect(201);

      expect(res.body.total).toBe(1);
    });
  });

  describe("round-trip", () => {
    it("should duplicate everything when the exported file is imported back", async () => {
      const categoryId = await seedCategory("Alimentação");
      await request(app)
        .post("/expenses/one-time")
        .set(authHeaders())
        .send({
          categoryId,
          description: "Supermercado",
          amount: 320.5,
          competenceMonth: MONTH,
          competenceYear: YEAR,
        });

      const exported = await request(app).get(`/data/export?${periodQuery()}`).set(authHeaders());

      await request(app)
        .post("/data/import")
        .set(authHeaders())
        .set("Content-Type", "text/csv")
        .send(exported.text)
        .expect(201);

      expect(await prisma.oneTimeExpense.count()).toBe(2);
    });

    it("should not attach the imported series to the existing one", async () => {
      const categoryId = await seedCategory("Educação");
      await request(app)
        .post("/expenses/installment")
        .set(authHeaders())
        .send({
          categoryId,
          description: "Notebook Pro",
          totalAmount: 1200,
          installmentCount: 3,
          startMonth: MONTH,
          startYear: YEAR,
        })
        .expect(201);

      const original = await prisma.installmentExpense.findFirstOrThrow();
      const exported = await request(app).get("/data/export?mode=full").set(authHeaders());

      await request(app)
        .post("/data/import")
        .set(authHeaders())
        .set("Content-Type", "text/csv")
        .send(exported.text)
        .expect(201);

      const all = await prisma.installmentExpense.findMany();
      expect(all).toHaveLength(2);
      expect(all.filter((item) => item.id === original.id)).toHaveLength(1);
    });

    it("should reuse the categories of the file instead of duplicating them", async () => {
      const categoryId = await seedCategory("Alimentação");
      await request(app)
        .post("/expenses/one-time")
        .set(authHeaders())
        .send({
          categoryId,
          description: "Supermercado",
          amount: 320.5,
          competenceMonth: MONTH,
          competenceYear: YEAR,
        });

      const exported = await request(app).get(`/data/export?${periodQuery()}`).set(authHeaders());
      await request(app)
        .post("/data/import")
        .set(authHeaders())
        .set("Content-Type", "text/csv")
        .send(exported.text);

      expect(await prisma.expenseCategory.count()).toBe(1);
    });
  });
});
