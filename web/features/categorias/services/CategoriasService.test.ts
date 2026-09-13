import { describe, expect, it } from "vitest";
import { db, mockApiError, mockNetworkError, seedDb } from "../../../tests/msw";
import { makeCategoryWithCount } from "../../../tests/fixtures";
import { bodyOf, recordRequests, signatures } from "../../../tests/requests";
import { CategoriasService } from "./CategoriasService";

describe("CategoriasService.getAll", () => {
  it("faz GET em /expenses/categories", async () => {
    const calls = recordRequests();

    await CategoriasService.getAll();

    expect(signatures(calls)).toEqual(["GET /expenses/categories"]);
  });

  it("devolve a lista com a contagem de despesas vinculadas", async () => {
    seedDb({
      categories: [makeCategoryWithCount({ name: "Moradia", linkedExpensesCount: 3 })],
    });

    const categories = await CategoriasService.getAll();

    expect(categories).toHaveLength(1);
    expect(categories[0]).toMatchObject({ name: "Moradia", linkedExpensesCount: 3 });
  });

  it("devolve lista vazia quando não há categorias", async () => {
    await expect(CategoriasService.getAll()).resolves.toEqual([]);
  });

  it("propaga erro da API", async () => {
    mockApiError("get", "/expenses/categories", 500, {});

    await expect(CategoriasService.getAll()).rejects.toMatchObject({ response: { status: 500 } });
  });
});

describe("CategoriasService.create", () => {
  it("faz POST em /expenses/categories com o nome", async () => {
    const calls = recordRequests();

    await CategoriasService.create("Moradia");

    expect(signatures(calls)).toEqual(["POST /expenses/categories"]);
    expect(await bodyOf(calls[0])).toEqual({ name: "Moradia" });
  });

  it("devolve a categoria criada", async () => {
    const created = await CategoriasService.create("Moradia");

    expect(created).toMatchObject({ name: "Moradia" });
    expect(db.categories).toHaveLength(1);
  });

  it("propaga o 409 de nome duplicado", async () => {
    seedDb({ categories: [makeCategoryWithCount({ name: "Moradia" })] });

    await expect(CategoriasService.create("moradia")).rejects.toMatchObject({
      response: { status: 409, data: { error: "EXPENSE_CATEGORY_NAME_ALREADY_EXISTS" } },
    });
  });
});

describe("CategoriasService.update", () => {
  it("faz PUT em /expenses/categories/:id (não PATCH)", async () => {
    const category = makeCategoryWithCount({ name: "Moradia" });
    seedDb({ categories: [category] });
    const calls = recordRequests();

    await CategoriasService.update(category.id, "Casa");

    expect(signatures(calls)).toEqual([`PUT /expenses/categories/${category.id}`]);
    expect(await bodyOf(calls[0])).toEqual({ name: "Casa" });
  });

  it("devolve a categoria atualizada", async () => {
    const category = makeCategoryWithCount({ name: "Moradia" });
    seedDb({ categories: [category] });

    const updated = await CategoriasService.update(category.id, "Casa");

    expect(updated.name).toBe("Casa");
  });

  it("propaga o 404 de categoria inexistente", async () => {
    await expect(CategoriasService.update("cat-999", "Casa")).rejects.toMatchObject({
      response: { status: 404, data: { error: "EXPENSE_CATEGORY_NOT_FOUND" } },
    });
  });
});

describe("CategoriasService.delete", () => {
  it("faz DELETE em /expenses/categories/:id", async () => {
    const category = makeCategoryWithCount();
    seedDb({ categories: [category] });
    const calls = recordRequests();

    await CategoriasService.delete(category.id);

    expect(signatures(calls)).toEqual([`DELETE /expenses/categories/${category.id}`]);
  });

  it("remove a categoria do servidor e não devolve conteúdo", async () => {
    const category = makeCategoryWithCount();
    seedDb({ categories: [category] });

    await expect(CategoriasService.delete(category.id)).resolves.toBeUndefined();
    expect(db.categories).toHaveLength(0);
  });

  it("propaga o 409 de categoria com despesas vinculadas", async () => {
    const category = makeCategoryWithCount({ linkedExpensesCount: 2 });
    seedDb({ categories: [category] });

    await expect(CategoriasService.delete(category.id)).rejects.toMatchObject({
      response: { status: 409, data: { error: "EXPENSE_CATEGORY_HAS_LINKED_EXPENSES" } },
    });
  });

  it("propaga falha de rede", async () => {
    const category = makeCategoryWithCount();
    seedDb({ categories: [category] });
    mockNetworkError("delete", `/expenses/categories/${category.id}`);

    await expect(CategoriasService.delete(category.id)).rejects.toThrowError();
  });
});
