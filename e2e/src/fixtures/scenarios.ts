import type { SeedClient } from "../api/seed-client.js";
import type { CompetenceKit } from "../support/competence.js";
import type {
  CategoryDto,
  FixedRevenueDto,
  FixedRevenueVersionDto,
  InstallmentExpenseDto,
  OneTimeExpenseDto,
  OneTimeRevenueDto,
  RecurringExpenseDto,
} from "../api/types.js";

/**
 * Builders de cenário: funções puras sobre o `SeedClient` que devolvem tudo o
 * que criaram, para que o spec asserte contra a resposta da API em vez de
 * contra literais (regra 4 do inventário).
 *
 * Nenhum builder semeia no passado — a API rejeita competência passada em todos
 * os `create-*`. Estados passados vêm de `shiftClock`.
 */

export interface CenarioDashboardCompleto {
  categories: { moradia: CategoryDto; lazer: CategoryDto };
  oneTimeRevenue: OneTimeRevenueDto;
  fixedRevenue: FixedRevenueDto;
  oneTimeExpense: OneTimeExpenseDto;
  installment: InstallmentExpenseDto;
  recurring: RecurringExpenseDto;
  /** Soma esperada de receitas do mês vigente. */
  totalRevenues: number;
  /** Soma esperada de despesas do mês vigente. */
  totalExpenses: number;
}

/**
 * 2 categorias, 1 receita avulsa, 1 fixa, 1 despesa avulsa, 1 parcelamento 3x e
 * 1 recorrente — tudo incidindo em `k.current`. Os valores deixam o mês em
 * superávit de propósito; o caso de déficit é montado no próprio spec.
 */
export async function cenarioDashboardCompleto(
  seed: SeedClient,
  k: CompetenceKit,
): Promise<CenarioDashboardCompleto> {
  const moradia = await seed.createCategory("Moradia");
  const lazer = await seed.createCategory("Lazer");

  const oneTimeRevenue = await seed.createOneTimeRevenue({
    description: "Freelance de setembro",
    amount: 1500,
    competence: k.current,
  });
  const fixedRevenue = await seed.createFixedRevenue({
    description: "Salário",
    amount: 4000,
    modality: "ALTERABLE",
    start: k.current,
  });

  const oneTimeExpense = await seed.createOneTimeExpense({
    description: "Supermercado",
    amount: 300,
    categoryId: moradia.id,
    competence: k.current,
  });
  const installment = await seed.createInstallmentExpense({
    description: "Notebook",
    totalAmount: 900,
    installmentCount: 3,
    categoryId: lazer.id,
    start: k.current,
  });
  const recurring = await seed.createRecurringExpense({
    description: "Aluguel",
    amount: 500,
    categoryId: moradia.id,
    start: k.current,
  });

  const installmentNow = installment.installments[0].amount;

  return {
    categories: { moradia, lazer },
    oneTimeRevenue,
    fixedRevenue,
    oneTimeExpense,
    installment,
    recurring,
    totalRevenues: oneTimeRevenue.amount + (fixedRevenue.currentVersion?.amount ?? 0),
    totalExpenses: oneTimeExpense.amount + installmentNow + recurring.currentVersion.amount,
  };
}

export interface CenarioReceitaFixaVersionada {
  revenue: FixedRevenueDto;
  /** Versão inicial, vigente em `k.current`. */
  primeira: FixedRevenueVersionDto;
  /** Versão adicionada, vigente a partir de `k.next`. */
  segunda: FixedRevenueVersionDto;
}

/** Receita fixa ALTERABLE em `current` + uma versão vigente a partir de `next`. */
export async function cenarioReceitaFixaVersionada(
  seed: SeedClient,
  k: CompetenceKit,
): Promise<CenarioReceitaFixaVersionada> {
  const revenue = await seed.createFixedRevenue({
    description: "Salário",
    amount: 4000,
    modality: "ALTERABLE",
    start: k.current,
  });

  const segunda = await seed.addFixedRevenueVersion(revenue.id, {
    description: "Salário reajustado",
    amount: 4800,
    effective: k.next,
  });

  return { revenue, primeira: revenue.currentVersion!, segunda };
}

export interface CenarioRecorrenteVersionada {
  expense: RecurringExpenseDto;
  /** Estado após a segunda versão — `versions` traz as duas. */
  atualizada: RecurringExpenseDto;
  categories: { original: CategoryDto; nova: CategoryDto };
}

/**
 * Despesa recorrente em `current` + versão em `next` que troca valor **e**
 * categoria (é o que prova que a versão carrega a categoria própria).
 */
export async function cenarioRecorrenteVersionada(
  seed: SeedClient,
  k: CompetenceKit,
): Promise<CenarioRecorrenteVersionada> {
  const original = await seed.createCategory("Moradia");
  const nova = await seed.createCategory("Serviços");

  const expense = await seed.createRecurringExpense({
    description: "Aluguel",
    amount: 1200,
    categoryId: original.id,
    start: k.current,
  });

  const atualizada = await seed.addRecurringExpenseVersion(expense.id, {
    description: "Aluguel reajustado",
    amount: 1350,
    categoryId: nova.id,
    effective: k.next,
  });

  return { expense, atualizada, categories: { original, nova } };
}

export interface CenarioHistoricoMisto {
  fixa: CenarioReceitaFixaVersionada;
  recorrente: CenarioRecorrenteVersionada;
}

/**
 * Os dois cenários versionados juntos: a timeline do histórico passa a ter
 * exatamente dois grupos (`current` e `next`), com uma receita e uma despesa em
 * cada.
 */
export async function cenarioHistoricoMisto(
  seed: SeedClient,
  k: CompetenceKit,
): Promise<CenarioHistoricoMisto> {
  const recorrente = await cenarioRecorrenteVersionada(seed, k);
  const fixa = await cenarioReceitaFixaVersionada(seed, k);
  return { fixa, recorrente };
}

export interface CenarioCategoriaComVinculo {
  category: CategoryDto;
  expense: OneTimeExpenseDto;
}

/** Categoria + despesa avulsa apontando para ela (bloqueia a exclusão). */
export async function cenarioCategoriaComVinculo(
  seed: SeedClient,
  k: CompetenceKit,
): Promise<CenarioCategoriaComVinculo> {
  const category = await seed.createCategory("Alimentação");
  const expense = await seed.createOneTimeExpense({
    description: "Supermercado",
    amount: 250,
    categoryId: category.id,
    competence: k.current,
  });
  return { category, expense };
}

export interface CenarioParcelamento {
  category: CategoryDto;
  installment: InstallmentExpenseDto;
}

/**
 * Parcelamento configurável. A divisão em centavos é regra de domínio (o resto
 * vai para a PRIMEIRA parcela), então o spec assere sempre contra
 * `installment.installments`, nunca contra uma conta feita no teste.
 */
export async function cenarioParcelamento(
  seed: SeedClient,
  k: CompetenceKit,
  options: {
    parcelas: number;
    total: number;
    description?: string;
    start?: CompetenceKit["current"];
  },
): Promise<CenarioParcelamento> {
  const category = await seed.createCategory("Lazer");
  const installment = await seed.createInstallmentExpense({
    description: options.description ?? "Notebook",
    totalAmount: options.total,
    installmentCount: options.parcelas,
    categoryId: category.id,
    start: options.start ?? k.current,
  });
  return { category, installment };
}
