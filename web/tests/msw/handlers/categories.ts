import { http, HttpResponse } from "msw";
import { url } from "../base";
import { db } from "../db";
import { makeCategoryWithCount } from "../../fixtures";

export const categoryHandlers = [
  http.get(url("/expenses/categories"), () => HttpResponse.json(db.categories)),

  http.post(url("/expenses/categories"), async ({ request }) => {
    const { name } = (await request.json()) as { name: string };
    // A API compara por nameLower (unique por usuário).
    if (db.categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      return HttpResponse.json({ error: "EXPENSE_CATEGORY_NAME_ALREADY_EXISTS" }, { status: 409 });
    }
    const created = makeCategoryWithCount({ name });
    db.categories.push(created);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.put(url("/expenses/categories/:id"), async ({ request, params }) => {
    const { name } = (await request.json()) as { name: string };
    const cat = db.categories.find((c) => c.id === params.id);
    if (!cat) {
      return HttpResponse.json({ error: "EXPENSE_CATEGORY_NOT_FOUND" }, { status: 404 });
    }
    cat.name = name;
    return HttpResponse.json(cat);
  }),

  http.delete(url("/expenses/categories/:id"), ({ params }) => {
    const cat = db.categories.find((c) => c.id === params.id);
    if (!cat) {
      return HttpResponse.json({ error: "EXPENSE_CATEGORY_NOT_FOUND" }, { status: 404 });
    }
    if (cat.linkedExpensesCount > 0) {
      return HttpResponse.json({ error: "EXPENSE_CATEGORY_HAS_LINKED_EXPENSES" }, { status: 409 });
    }
    db.categories = db.categories.filter((c) => c.id !== params.id);
    return new HttpResponse(null, { status: 204 });
  }),
];
