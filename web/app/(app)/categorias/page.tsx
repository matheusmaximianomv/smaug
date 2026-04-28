"use client";

import { useState } from "react";
import { Plus, Tag } from "lucide-react";
import { useCategories } from "@/features/categorias/hooks/useCategories";
import { CategoryCard } from "@/features/categorias/components/CategoryCard";
import { CategoryForm } from "@/features/categorias/components/CategoryForm";
import { DeleteWarningModal } from "@/features/categorias/components/DeleteWarningModal";
import { Modal } from "@/shared/components/Modal";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { Button } from "@/shared/components/Button";
import { EmptyState } from "@/shared/components/EmptyState";
import { Skeleton } from "@/shared/components/Skeleton";
import type { CategoryWithCount } from "@/features/categorias/types";

export default function CategoriasPage() {
  const { data: categories, isLoading, create, update, remove } = useCategories();
  const [modal, setModal] = useState<null | "add" | "edit">(null);
  const [selected, setSelected] = useState<CategoryWithCount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CategoryWithCount | null>(null);
  const [blockedTarget, setBlockedTarget] = useState<CategoryWithCount | null>(null);

  const openEdit = (cat: CategoryWithCount) => {
    setSelected(cat);
    setModal("edit");
  };
  const openDelete = (cat: CategoryWithCount) => {
    if (cat.linkedExpensesCount > 0) {
      setBlockedTarget(cat);
      return;
    }
    setDeleteTarget(cat);
  };

  const handleSave = (data: { name: string }) => {
    if (modal === "add") {
      create.mutate(data.name, { onSuccess: () => setModal(null) });
    } else if (modal === "edit" && selected) {
      update.mutate({ id: selected.id, name: data.name }, { onSuccess: () => setModal(null) });
    }
  };

  return (
    <div className="p-4 sm:p-7 max-w-[1100px]">
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold">Categorias</h1>
          <p className="text-[13px] text-text-muted mt-0.5">Organize suas despesas por categoria</p>
        </div>
        <Button onClick={() => setModal("add")} size="sm">
          <Plus size={14} className="mr-1" /> Nova categoria
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : !categories?.length ? (
        <EmptyState
          icon={<Tag size={40} />}
          message="Nenhuma categoria cadastrada."
          action={{ label: "+ Criar primeira categoria", onClick: () => setModal("add") }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <CategoryCard key={cat.id} category={cat} onEdit={openEdit} onDelete={openDelete} />
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modal === "add" || modal === "edit"}
        onClose={() => setModal(null)}
        title={modal === "add" ? "Nova categoria" : "Editar categoria"}
        width="sm"
      >
        <CategoryForm
          initial={modal === "edit" && selected ? { name: selected.name } : undefined}
          onSave={handleSave}
          onClose={() => setModal(null)}
          isLoading={create.isPending || update.isPending}
        />
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget)
            remove.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
        }}
        message={`Tem certeza que deseja excluir a categoria "${deleteTarget?.name}"?`}
        confirmLabel="Excluir"
        isDanger
        isLoading={remove.isPending}
      />

      {/* Blocked Delete Modal */}
      <DeleteWarningModal
        isOpen={!!blockedTarget}
        onClose={() => setBlockedTarget(null)}
        categoryName={blockedTarget?.name ?? ""}
      />
    </div>
  );
}
