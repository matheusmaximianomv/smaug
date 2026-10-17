"use client";

import { useCategories } from "@/features/categorias/hooks/useCategories";
import { DespesasScreen } from "@/features/despesas/components/DespesasScreen";

export default function DespesasPage() {
  const categories = useCategories();
  return <DespesasScreen categories={categories.data ?? []} />;
}
