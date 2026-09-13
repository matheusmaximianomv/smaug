import { http, HttpResponse } from "msw";
import { url } from "../base";
import { db } from "../db";
import { makeUser } from "../../fixtures";

export const userHandlers = [
  http.post(url("/users"), async ({ request }) => {
    const body = (await request.json()) as { name: string; email: string };
    if (db.users.some((u) => u.email === body.email)) {
      return HttpResponse.json({ error: "EMAIL_ALREADY_EXISTS" }, { status: 409 });
    }
    const created = makeUser({ name: body.name, email: body.email });
    db.users.push(created);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.get(url("/users/:id"), ({ params }) => {
    const user = db.users.find((u) => u.id === params.id);
    if (!user) return HttpResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
    return HttpResponse.json(user);
  }),
];
