import { OneTimeExpenseFicha } from "./OneTimeExpenseFicha";
import { InstallmentExpenseFicha } from "./InstallmentExpenseFicha";
import { RecurringExpenseFicha } from "./RecurringExpenseFicha";
import type { Competence, CompetenceStatus } from "@/shared/lib/competence";
import type { Category } from "@/features/categorias/types";
import type { ExpenseMonthItem, OneTimeExpenseMonthItem } from "../types";

interface ExpenseFichaProps {
  item: ExpenseMonthItem;
  status: CompetenceStatus;
  reference: Competence;
  categories: Category[];
  onClose: () => void;
  onEdit: (item: OneTimeExpenseMonthItem) => void;
}

/** Escolhe a Ficha pelo tipo do item da consulta mensal. */
export function ExpenseFicha({
  item,
  status,
  reference,
  categories,
  onClose,
  onEdit,
}: ExpenseFichaProps) {
  if (item.type === "ONE_TIME") {
    return (
      <OneTimeExpenseFicha
        item={item}
        isPast={status === "past"}
        onClose={onClose}
        onEdit={onEdit}
      />
    );
  }
  if (item.type === "INSTALLMENT") {
    return <InstallmentExpenseFicha item={item} reference={reference} onClose={onClose} />;
  }
  return <RecurringExpenseFicha item={item} categories={categories} onClose={onClose} />;
}
