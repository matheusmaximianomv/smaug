import { randomUUID } from "node:crypto";
import type { APIRequestContext, APIResponse } from "@playwright/test";
import type { Competence } from "../support/competence.js";
import type {
  CategoryDto,
  ExpenseQueryDto,
  FixedRevenueDto,
  FixedRevenueVersionDto,
  InstallmentExpenseDto,
  OneTimeExpenseDto,
  OneTimeRevenueDto,
  RecurringExpenseDto,
  RevenueQueryDto,
  UserDto,
} from "./types.js";

/**
 * Semeia dados EXCLUSIVAMENTE pela API HTTP, nunca escrevendo no SQLite direto.
 *
 * Três razões, todas verificadas no domínio do servidor:
 * 1. Os ids são `String @id` SEM `@default` — quem gera o UUID é a entidade.
 * 2. Há estado derivado que o Prisma não produziria: `ExpenseCategory.nameLower`,
 *    a expansão das parcelas a partir de totalAmount/installmentCount (com a
 *    regra de arredondamento do domínio) e a versão inicial de
 *    FixedRevenue/RecurringExpense.
 * 3. Escrever no arquivo criaria um SEGUNDO escritor no SQLite — exatamente o
 *    que tornaria os workers paralelos perigosos.
 */
export class SeedClient {
  constructor(
    private readonly api: APIRequestContext,
    private readonly userId?: string,
  ) {}

  asUser(userId: string): SeedClient {
    return new SeedClient(this.api, userId);
  }

  private get headers(): Record<string, string> {
    return this.userId ? { "X-User-Id": this.userId } : {};
  }

  /** Falha de seed precisa gritar: sem isto vira uma falha muda de UI. */
  private async unwrap<T>(res: APIResponse, what: string): Promise<T> {
    if (!res.ok()) {
      const body = await res.text().catch(() => "<sem corpo>");
      throw new Error(`[seed] ${what} → HTTP ${res.status()}\n${body}`);
    }
    return (await res.json()) as T;
  }

  // ---------------------------------------------------------------- usuários
  async createUser(o: { name?: string; email?: string } = {}): Promise<UserDto> {
    const res = await this.api.post("/users", {
      data: {
        name: o.name ?? "Usuário E2E",
        email: o.email ?? `e2e-${randomUUID()}@e2e.local`,
      },
    });
    return this.unwrap<UserDto>(res, "POST /users");
  }

  // -------------------------------------------------------------- categorias
  async createCategory(name: string): Promise<CategoryDto> {
    const res = await this.api.post("/expenses/categories", {
      headers: this.headers,
      data: { name },
    });
    return this.unwrap<CategoryDto>(res, `POST /expenses/categories (${name})`);
  }

  async listCategories(): Promise<CategoryDto[]> {
    const res = await this.api.get("/expenses/categories", { headers: this.headers });
    return this.unwrap<CategoryDto[]>(res, "GET /expenses/categories");
  }

  /** Sem unwrap: usado para assertar o 409 da proteção de exclusão. */
  async deleteCategoryRaw(id: string): Promise<APIResponse> {
    return this.api.delete(`/expenses/categories/${id}`, { headers: this.headers });
  }

  // ----------------------------------------------------------------- receitas
  async createOneTimeRevenue(i: {
    description: string;
    amount: number;
    competence: Competence;
  }): Promise<OneTimeRevenueDto> {
    const res = await this.api.post("/revenues/one-time", {
      headers: this.headers,
      data: {
        description: i.description,
        amount: i.amount,
        competenceYear: i.competence.year,
        competenceMonth: i.competence.month,
      },
    });
    return this.unwrap<OneTimeRevenueDto>(res, "POST /revenues/one-time");
  }

  async createFixedRevenue(i: {
    description: string;
    amount: number;
    modality: "ALTERABLE" | "UNALTERABLE";
    start: Competence;
    end?: Competence | null;
  }): Promise<FixedRevenueDto> {
    const res = await this.api.post("/revenues/fixed", {
      headers: this.headers,
      data: {
        description: i.description,
        amount: i.amount,
        modality: i.modality,
        startMonth: i.start.month,
        startYear: i.start.year,
        endMonth: i.end?.month ?? null,
        endYear: i.end?.year ?? null,
      },
    });
    return this.unwrap<FixedRevenueDto>(res, "POST /revenues/fixed");
  }

  /** ATENÇÃO: devolve a VERSÃO criada, não a receita. */
  async addFixedRevenueVersion(
    id: string,
    i: { description: string; amount: number; effective: Competence },
  ): Promise<FixedRevenueVersionDto> {
    const res = await this.api.patch(`/revenues/fixed/${id}`, {
      headers: this.headers,
      data: {
        description: i.description,
        amount: i.amount,
        effectiveMonth: i.effective.month,
        effectiveYear: i.effective.year,
      },
    });
    return this.unwrap<FixedRevenueVersionDto>(res, `PATCH /revenues/fixed/${id}`);
  }

  async terminateFixedRevenue(id: string, end: Competence): Promise<FixedRevenueDto> {
    const res = await this.api.patch(`/revenues/fixed/${id}/terminate`, {
      headers: this.headers,
      data: { endMonth: end.month, endYear: end.year },
    });
    return this.unwrap<FixedRevenueDto>(res, `PATCH /revenues/fixed/${id}/terminate`);
  }

  async listFixedRevenues(): Promise<FixedRevenueDto[]> {
    const res = await this.api.get("/revenues/fixed", { headers: this.headers });
    return this.unwrap<FixedRevenueDto[]>(res, "GET /revenues/fixed");
  }

  // ----------------------------------------------------------------- despesas
  async createOneTimeExpense(i: {
    description: string;
    amount: number;
    categoryId: string;
    competence: Competence;
  }): Promise<OneTimeExpenseDto> {
    const res = await this.api.post("/expenses/one-time", {
      headers: this.headers,
      data: {
        description: i.description,
        amount: i.amount,
        categoryId: i.categoryId,
        competenceYear: i.competence.year,
        competenceMonth: i.competence.month,
      },
    });
    return this.unwrap<OneTimeExpenseDto>(res, "POST /expenses/one-time");
  }

  async createInstallmentExpense(i: {
    description: string;
    totalAmount: number;
    installmentCount: number;
    categoryId: string;
    start: Competence;
  }): Promise<InstallmentExpenseDto> {
    const res = await this.api.post("/expenses/installment", {
      headers: this.headers,
      data: {
        description: i.description,
        totalAmount: i.totalAmount,
        installmentCount: i.installmentCount,
        categoryId: i.categoryId,
        startYear: i.start.year,
        startMonth: i.start.month,
      },
    });
    return this.unwrap<InstallmentExpenseDto>(res, "POST /expenses/installment");
  }

  /** Lê de volta o que a UI criou, para assertar contra a verdade do servidor. */
  async listInstallmentExpenses(): Promise<InstallmentExpenseDto[]> {
    const res = await this.api.get("/expenses/installment", { headers: this.headers });
    return this.unwrap<InstallmentExpenseDto[]>(res, "GET /expenses/installment");
  }

  async createRecurringExpense(i: {
    description: string;
    amount: number;
    categoryId: string;
    start: Competence;
    end?: Competence | null;
  }): Promise<RecurringExpenseDto> {
    const res = await this.api.post("/expenses/recurring", {
      headers: this.headers,
      data: {
        description: i.description,
        amount: i.amount,
        categoryId: i.categoryId,
        startYear: i.start.year,
        startMonth: i.start.month,
        endYear: i.end?.year ?? null,
        endMonth: i.end?.month ?? null,
      },
    });
    return this.unwrap<RecurringExpenseDto>(res, "POST /expenses/recurring");
  }

  async addRecurringExpenseVersion(
    id: string,
    i: {
      description?: string;
      amount?: number;
      categoryId?: string;
      effective: Competence;
    },
  ): Promise<RecurringExpenseDto> {
    const res = await this.api.patch(`/expenses/recurring/${id}`, {
      headers: this.headers,
      data: {
        ...(i.description !== undefined ? { description: i.description } : {}),
        ...(i.amount !== undefined ? { amount: i.amount } : {}),
        ...(i.categoryId !== undefined ? { categoryId: i.categoryId } : {}),
        effectiveYear: i.effective.year,
        effectiveMonth: i.effective.month,
      },
    });
    return this.unwrap<RecurringExpenseDto>(res, `PATCH /expenses/recurring/${id}`);
  }

  async terminateRecurringExpense(id: string, end: Competence): Promise<RecurringExpenseDto> {
    const res = await this.api.patch(`/expenses/recurring/${id}/terminate`, {
      headers: this.headers,
      data: { endYear: end.year, endMonth: end.month },
    });
    return this.unwrap<RecurringExpenseDto>(res, `PATCH /expenses/recurring/${id}/terminate`);
  }

  /** Divergente das demais: encerrar parcelamento é POST, não PATCH. */
  async terminateInstallmentExpense(id: string): Promise<APIResponse> {
    return this.api.post(`/expenses/installment/${id}/terminate`, { headers: this.headers });
  }

  // -------------------------------------------------- consultas consolidadas
  async queryRevenues(c: Competence): Promise<RevenueQueryDto> {
    const res = await this.api.get("/revenues", {
      headers: this.headers,
      params: { competenceYear: c.year, competenceMonth: c.month },
    });
    return this.unwrap<RevenueQueryDto>(res, "GET /revenues");
  }

  async queryExpenses(c: Competence): Promise<ExpenseQueryDto> {
    const res = await this.api.get("/expenses", {
      headers: this.headers,
      params: { competenceYear: c.year, competenceMonth: c.month },
    });
    return this.unwrap<ExpenseQueryDto>(res, "GET /expenses");
  }
}
