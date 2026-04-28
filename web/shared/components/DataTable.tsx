import { Pencil, Trash2 } from "lucide-react";
import { cn } from "../lib/utils";

export interface Column<T> {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T extends { id: string }> {
  columns: Column<T>[];
  rows: T[];
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  emptyMessage?: string;
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  onEdit,
  onDelete,
  emptyMessage = "Nenhum registro encontrado.",
}: DataTableProps<T>) {
  if (!rows.length) {
    return <p className="py-6 text-center text-[13.5px] text-text-subtle">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "border-b border-border bg-bg px-3.5 py-2.5 text-[11.5px] font-bold uppercase tracking-wide text-text-muted text-left",
                  col.align === "right" && "text-right",
                  col.align === "center" && "text-center",
                )}
              >
                {col.label}
              </th>
            ))}
            {(onEdit || onDelete) && (
              <th className="border-b border-border bg-bg px-3.5 py-2.5 w-px" />
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id ?? i} className="hover:bg-bg border-b border-border last:border-0">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    "px-3.5 py-4 text-[13.5px]",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                  )}
                >
                  {col.render
                    ? col.render(row)
                    : ((row as Record<string, unknown>)[col.key] as React.ReactNode)}
                </td>
              ))}
              {(onEdit || onDelete) && (
                <td className="px-3.5 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(row)}
                        className="rounded p-1.5 text-text-subtle hover:bg-bg hover:text-text-muted"
                        title="Editar"
                        aria-label="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(row)}
                        className="rounded p-1.5 text-text-subtle hover:bg-red-light hover:text-red"
                        title="Excluir"
                        aria-label="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
