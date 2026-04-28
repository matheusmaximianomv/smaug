import { Pencil, Trash2 } from "lucide-react";
import type { CategoryWithCount } from "../types";

interface CategoryCardProps {
  category: CategoryWithCount;
  onEdit: (cat: CategoryWithCount) => void;
  onDelete: (cat: CategoryWithCount) => void;
}

export function CategoryCard({ category, onEdit, onDelete }: CategoryCardProps) {
  const initial = category.name.charAt(0).toUpperCase();
  const count = category.linkedExpensesCount;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4 hover:shadow-sm transition-shadow">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-light text-[15px] font-bold text-red">
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-semibold truncate">{category.name}</div>
        <div className="text-xs text-text-subtle">
          {count} despesa{count !== 1 ? "s" : ""} vinculada{count !== 1 ? "s" : ""}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onEdit(category)}
          className="rounded p-1.5 text-text-subtle hover:bg-bg hover:text-text-muted"
          title="Editar"
          aria-label="Editar categoria"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={() => onDelete(category)}
          className="rounded p-1.5 text-text-subtle hover:bg-red-light hover:text-red"
          title="Excluir"
          aria-label="Excluir categoria"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
