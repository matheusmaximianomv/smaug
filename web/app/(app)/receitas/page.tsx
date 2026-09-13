"use client";

import { useState } from "react";
import { Plus, TrendingUp } from "lucide-react";
import { useOneTimeRevenues } from "@/features/receitas/hooks/useOneTimeRevenues";
import { useFixedRevenues } from "@/features/receitas/hooks/useFixedRevenues";
import { OneTimeRevenueForm } from "@/features/receitas/components/OneTimeRevenueForm";
import { FixedRevenueForm } from "@/features/receitas/components/FixedRevenueForm";
import { FixedRevenueCard } from "@/features/receitas/components/FixedRevenueCard";
import { VersionHistoryModal } from "@/features/receitas/components/VersionHistoryModal";
import {
  FixedRevenueVersionForm,
  type FixedRevenueVersionPayload,
} from "@/features/receitas/components/FixedRevenueVersionForm";
import { MonthYearSelect } from "@/features/receitas/components/MonthYearSelect";
import { DataTable } from "@/shared/components/DataTable";
import { Tabs } from "@/shared/components/Tabs";
import { Modal } from "@/shared/components/Modal";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { Button } from "@/shared/components/Button";
import { EmptyState } from "@/shared/components/EmptyState";
import { Skeleton } from "@/shared/components/Skeleton";
import { formatCurrency } from "@/shared/lib/formatCurrency";
import { formatMonthYear } from "@/shared/lib/dateUtils";
import type { OneTimeRevenue, FixedRevenue } from "@/features/receitas/types";

type Tab = "avulsas" | "fixas";
type ModalType =
  | null
  | "add-avulsa"
  | "edit-avulsa"
  | "add-fixa"
  | "add-version"
  | "end-fixa"
  | "view-history";

function getNow() {
  const d = new Date();
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

export default function ReceitasPage() {
  const now = getNow();
  const [tab, setTab] = useState<Tab>("avulsas");
  const [modal, setModal] = useState<ModalType>(null);
  const [selectedAvulsa, setSelectedAvulsa] = useState<OneTimeRevenue | null>(null);
  const [selectedFixed, setSelectedFixed] = useState<FixedRevenue | null>(null);
  const [deleteAvulsa, setDeleteAvulsa] = useState<OneTimeRevenue | null>(null);
  const [deleteFixed, setDeleteFixed] = useState<string | null>(null);
  const [endMonth, setEndMonth] = useState(now.month);
  const [endYear, setEndYear] = useState(now.year);

  const avulsas = useOneTimeRevenues();
  const fixas = useFixedRevenues();

  const sortedAvulsas = [...(avulsas.data ?? [])].sort((a, b) =>
    b.competenceYear !== a.competenceYear
      ? b.competenceYear - a.competenceYear
      : b.competenceMonth - a.competenceMonth,
  );

  const handleSaveAvulsa = (data: {
    description: string;
    amount: number;
    competenceYear: number;
    competenceMonth: number;
  }) => {
    if (modal === "add-avulsa") {
      avulsas.create.mutate(data, { onSuccess: () => setModal(null) });
    } else if (modal === "edit-avulsa" && selectedAvulsa) {
      avulsas.update.mutate(
        { id: selectedAvulsa.id, ...data },
        { onSuccess: () => setModal(null) },
      );
    }
  };

  const handleSaveFixed = (data: Parameters<typeof fixas.create.mutate>[0]) => {
    fixas.create.mutate(data, { onSuccess: () => setModal(null) });
  };

  const handleAddVersion = (data: FixedRevenueVersionPayload) => {
    if (!selectedFixed) return;
    fixas.addVersion.mutate({ id: selectedFixed.id, ...data }, { onSuccess: () => setModal(null) });
  };

  const handleEndFixed = () => {
    if (!selectedFixed) return;
    fixas.terminate.mutate(
      { id: selectedFixed.id, endYear, endMonth },
      { onSuccess: () => setModal(null) },
    );
  };

  const TABS = [
    { id: "avulsas", label: "Avulsas", count: avulsas.data?.length ?? 0 },
    { id: "fixas", label: "Fixas", count: fixas.data?.length ?? 0 },
  ];

  return (
    <div className="p-4 sm:p-7 max-w-[1100px]">
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold">Receitas</h1>
          <p className="text-[13px] text-text-muted mt-0.5">
            Gerencie suas receitas avulsas e fixas
          </p>
        </div>
        <Button size="sm" onClick={() => setModal(tab === "avulsas" ? "add-avulsa" : "add-fixa")}>
          <Plus size={14} className="mr-1" />{" "}
          {tab === "avulsas" ? "Nova receita avulsa" : "Nova receita fixa"}
        </Button>
      </div>

      <Tabs tabs={TABS} value={tab} onValueChange={(v) => setTab(v as Tab)} className="mb-5" />

      {/* Avulsas Tab */}
      {tab === "avulsas" &&
        (avulsas.isLoading ? (
          <Skeleton className="h-40" />
        ) : (
          <DataTable
            columns={[
              { key: "description", label: "Descrição" },
              {
                key: "competence",
                label: "Competência",
                render: (r) => formatMonthYear(r.competenceYear, r.competenceMonth),
              },
              {
                key: "amount",
                label: "Valor",
                align: "right",
                render: (r) => (
                  <span className="font-semibold text-green">{formatCurrency(r.amount)}</span>
                ),
              },
            ]}
            rows={sortedAvulsas}
            onEdit={(r) => {
              setSelectedAvulsa(r);
              setModal("edit-avulsa");
            }}
            onDelete={(r) => setDeleteAvulsa(r)}
            emptyMessage="Nenhuma receita avulsa cadastrada."
          />
        ))}

      {/* Fixas Tab */}
      {tab === "fixas" &&
        (fixas.isLoading ? (
          <Skeleton className="h-40" />
        ) : !fixas.data?.length ? (
          <EmptyState
            icon={<TrendingUp size={40} />}
            message="Nenhuma receita fixa cadastrada."
            action={{ label: "+ Criar primeira receita fixa", onClick: () => setModal("add-fixa") }}
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {fixas.data.map((f) => (
              <FixedRevenueCard
                key={f.id}
                revenue={f}
                currentYear={now.year}
                currentMonth={now.month}
                onAddVersion={(id) => {
                  setSelectedFixed(fixas.data.find((x) => x.id === id) ?? null);
                  setModal("add-version");
                }}
                onTerminate={(id) => {
                  setSelectedFixed(fixas.data.find((x) => x.id === id) ?? null);
                  setModal("end-fixa");
                }}
                onViewHistory={(rev) => {
                  setSelectedFixed(rev);
                  setModal("view-history");
                }}
                onDelete={(id) => setDeleteFixed(id)}
              />
            ))}
          </div>
        ))}

      {/* Modals */}
      <Modal
        isOpen={modal === "add-avulsa"}
        onClose={() => setModal(null)}
        title="Nova receita avulsa"
      >
        <OneTimeRevenueForm
          onSave={handleSaveAvulsa}
          onClose={() => setModal(null)}
          isLoading={avulsas.create.isPending}
        />
      </Modal>
      <Modal
        isOpen={modal === "edit-avulsa"}
        onClose={() => setModal(null)}
        title="Editar receita avulsa"
      >
        <OneTimeRevenueForm
          initial={selectedAvulsa ?? undefined}
          onSave={handleSaveAvulsa}
          onClose={() => setModal(null)}
          isLoading={avulsas.update.isPending}
        />
      </Modal>
      <Modal
        isOpen={modal === "add-fixa"}
        onClose={() => setModal(null)}
        title="Nova receita fixa"
        width="md"
      >
        <FixedRevenueForm
          onSave={handleSaveFixed}
          onClose={() => setModal(null)}
          isLoading={fixas.create.isPending}
        />
      </Modal>

      {/* Add version modal */}
      <Modal
        isOpen={modal === "add-version"}
        onClose={() => setModal(null)}
        title="Nova versão da receita fixa"
      >
        <FixedRevenueVersionForm
          onSave={handleAddVersion}
          onClose={() => setModal(null)}
          isLoading={fixas.addVersion.isPending}
        />
      </Modal>

      {/* End fixed modal */}
      <Modal
        isOpen={modal === "end-fixa"}
        onClose={() => setModal(null)}
        title="Encerrar receita fixa"
      >
        <div className="space-y-4">
          <p className="text-xs text-text-subtle bg-bg border border-border rounded-lg px-3 py-2">
            A receita fixa será encerrada ao final do mês selecionado.
          </p>
          <MonthYearSelect
            label="Mês de encerramento"
            month={endMonth}
            year={endYear}
            onMonthChange={setEndMonth}
            onYearChange={setEndYear}
            required
          />
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="ghost" onClick={() => setModal(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleEndFixed} isLoading={fixas.terminate.isPending}>
              Encerrar receita
            </Button>
          </div>
        </div>
      </Modal>

      {/* Version history modal */}
      <VersionHistoryModal
        isOpen={modal === "view-history"}
        onClose={() => setModal(null)}
        revenue={selectedFixed}
      />

      {/* Delete avulsa confirm */}
      <ConfirmDialog
        isOpen={!!deleteAvulsa}
        onClose={() => setDeleteAvulsa(null)}
        onConfirm={() => {
          if (deleteAvulsa)
            avulsas.remove.mutate(deleteAvulsa.id, { onSuccess: () => setDeleteAvulsa(null) });
        }}
        message={`Tem certeza que deseja excluir a receita "${deleteAvulsa?.description}"?`}
        confirmLabel="Excluir"
        isDanger
        isLoading={avulsas.remove.isPending}
      />

      {/* Delete fixed confirm */}
      <ConfirmDialog
        isOpen={!!deleteFixed}
        onClose={() => setDeleteFixed(null)}
        onConfirm={() => {
          if (deleteFixed)
            fixas.remove.mutate(deleteFixed, { onSuccess: () => setDeleteFixed(null) });
        }}
        message="Tem certeza que deseja excluir permanentemente esta receita fixa?"
        confirmLabel="Excluir"
        isDanger
        isLoading={fixas.remove.isPending}
      />
    </div>
  );
}
