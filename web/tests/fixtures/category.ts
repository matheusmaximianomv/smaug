import type { Category, CategoryWithCount } from "@/features/categorias/types";
import { FIXED_DATE, fixtureUuid, nextId } from "./ids";

export function makeCategory(o: Partial<Category> = {}): Category {
  return {
    id: nextId("cat"),
    userId: fixtureUuid(1),
    name: "Moradia",
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    ...o,
  };
}

/** `linkedExpensesCount` é o que decide entre ConfirmDialog e DeleteWarningModal. */
export function makeCategoryWithCount(o: Partial<CategoryWithCount> = {}): CategoryWithCount {
  return { ...makeCategory(o), linkedExpensesCount: 0, ...o };
}
