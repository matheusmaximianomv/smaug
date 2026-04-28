"use client";

import { useState } from "react";
import { Plus, TrendingDown } from "lucide-react";
import { useOneTimeExpenses } from "@/features/despesas/hooks/useOneTimeExpenses";
import { useInstallments } from "@/features/despesas/hooks/useInstallments";
import { useRecurringExpenses } from "@/features/despesas/hooks/useRecurringExpenses";
import { useCategories } from "@/features/categorias/hooks/useCategories";
import { OneTimeExpenseForm } from "@/features/despesas/components/OneTimeExpenseForm";
import { InstallmentForm } from "@/features/despesas/components/InstallmentForm";
import { InstallmentCard } from "@/features/despesas/components/InstallmentCard";
import { InstallmentModal } from "@/features/despesas/components/InstallmentModal";
import { RecurringExpenseCard } from "@/features/despesas/components/RecurringExpenseCard";
import { RecurringExpenseForm } from "@/features/despesas/components/RecurringExpenseForm";
import { MonthYearSelect } from "@/features/receitas/components/MonthYearSelect";
import { DataTable } from "@/shared/components/DataTable";
import { Modal } from "@/shared/components/Modal";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { Button } from "@/shared/components/Button";
import { EmptyState } from "@/shared/components/EmptyState";
import { Skeleton } from "@/shared/components/Skeleton";
import { formatCurrency } from "@/shared/lib/formatCurrency";
import { formatMonthYear } from "@/shared/lib/dateUtils";
import type {
  OneTimeExpense,
  InstallmentExpense,
  RecurringExpense,
} from "@/features/despesas/types";

type Tab = "avulsas" | "parceladas" | "recorrentes";
type ModalType =
  | null
  | "add-avulsa"
  | "edit-avulsa"
  | "add-parcelada"
  | "view-parcelas"
  | "add-recorrente"
  | "add-rec-version"
  | "end-recorrente"
  | "view-rec-history";

function getNow() {
  const d = new Date();
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

export default function DespesasPage() {
  const now = getNow();
  const [tab, setTab] = useState<Tab>("avulsas");
  const [modal, setModal] = useState<ModalType>(null);
  const [selectedAvulsa, setSelectedAvulsa] = useState<OneTimeExpense | null>(null);
  const [selectedInstall, setSelectedInstall] = useState<InstallmentExpense | null>(null);
  const [selectedRecurring, setSelectedRecurring] = useState<RecurringExpense | null>(null);
  const [deleteAvulsa, setDeleteAvulsa] = useState<OneTimeExpense | null>(null);
  const [deleteInstall, setDeleteInstall] = useState<string | null>(null);
  const [deleteRecurring, setDeleteRecurring] = useState<string | null>(null);
  const [endMonth, setEndMonth] = useState(now.month);
  const [endYear, setEndYear] = useState(now.year);
  const [rvDesc, setRvDesc] = useState("");
  const [rvAmount, setRvAmount] = useState("");
  const [rvCat, setRvCat] = useState("");
  const [rvMonth, setRvMonth] = useState(now.month);
  const [rvYear, setRvYear] = useState(now.year);

  const avulsas = useOneTimeExpenses();
  const installments = useInstallments();
  const recurring = useRecurringExpenses();
  const cats = useCategories();

  const sortedAvulsas = [...(avulsas.data ?? [])].sort((a, b) =>
    b.competenceYear !== a.competenceYear
      ? b.competenceYear - a.competenceYear
      : b.competenceMonth - a.competenceMonth,
  );

  const catOptions = cats.data ?? [];

  const handleSaveAvulsa = (data: {
    description: string;
    amount: number;
    categoryId: string;
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

  const handleAddRecVersion = () => {
    if (!selectedRecurring) return;
    recurring.addVersion.mutate(
      {
        id: selectedRecurring.id,
        description: rvDesc.trim(),
        amount: parseFloat(rvAmount.replace(",", ".")),
        categoryId: rvCat,
        effectiveYear: rvYear,
        effectiveMonth: rvMonth,
      },
      {
        onSuccess: () => {
          setModal(null);
          setRvDesc("");
          setRvAmount("");
          setRvCat("");
        },
      },
    );
  };

  const TABS: { id: Tab; label: string; count: number }[] = [
    { id: "avulsas", label: "Avulsas", count: avulsas.data?.length ?? 0 },
    { id: "parceladas", label: "Parceladas", count: installments.data?.length ?? 0 },
    { id: "recorrentes", label: "Recorrentes", count: recurring.data?.length ?? 0 },
  ];

  const tabLabels: Record<Tab, string> = {
    avulsas: "Nova despesa avulsa",
    parceladas: "Novo parcelamento",
    recorrentes: "Nova despesa recorrente",
  };

  const openAdd = () => {
    const map: Record<Tab, ModalType> = {
      avulsas: "add-avulsa",
      parceladas: "add-parcelada",
      recorrentes: "add-recorrente",
    };
    setModal(map[tab]);
  };

  return (
    <div className="p-4 sm:p-7 max-w-[1100px]">
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold">Despesas</h1>
          <p className="text-[13px] text-text-muted mt-0.5">
            Gerencie suas despesas avulsas, parceladas e recorrentes
          </p>
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus size={14} className="mr-1" /> {tabLabels[tab]}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-border mb-5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-[13.5px] font-medium border-b-2 -mb-px flex items-center gap-1.5 transition-colors ${tab === t.id ? "border-red text-red" : "border-transparent text-text-muted hover:text-text"}`}
          >
            {t.label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${tab === t.id ? "bg-red-light text-red" : "bg-bg text-text-muted"}`}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Avulsas */}
      {tab === "avulsas" &&
        (avulsas.isLoading ? (
          <Skeleton className="h-40" />
        ) : (
          <DataTable
            columns={[
              { key: "description", label: "Descrição" },
              { key: "category", label: "Categoria", render: (r) => r.category?.name ?? "—" },
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
                  <span className="font-semibold text-red">{formatCurrency(r.amount)}</span>
                ),
              },
            ]}
            rows={sortedAvulsas}
            onEdit={(r) => {
              setSelectedAvulsa(r);
              setModal("edit-avulsa");
            }}
            onDelete={(r) => setDeleteAvulsa(r)}
            emptyMessage="Nenhuma despesa avulsa cadastrada."
          />
        ))}

      {/* Parceladas */}
      {tab === "parceladas" &&
        (installments.isLoading ? (
          <Skeleton className="h-40" />
        ) : !installments.data?.length ? (
          <EmptyState
            icon={<TrendingDown size={40} />}
            message="Nenhum parcelamento cadastrado."
            action={{ label: "+ Criar parcelamento", onClick: () => setModal("add-parcelada") }}
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {installments.data.map((p) => (
              <InstallmentCard
                key={p.id}
                expense={p}
                currentYear={now.year}
                currentMonth={now.month}
                onViewInstallments={(exp) => {
                  setSelectedInstall(exp);
                  setModal("view-parcelas");
                }}
                onDelete={(id) => setDeleteInstall(id)}
              />
            ))}
          </div>
        ))}

      {/* Recorrentes */}
      {tab === "recorrentes" &&
        (recurring.isLoading ? (
          <Skeleton className="h-40" />
        ) : !recurring.data?.length ? (
          <EmptyState
            icon={<TrendingDown size={40} />}
            message="Nenhuma despesa recorrente cadastrada."
            action={{ label: "+ Criar recorrente", onClick: () => setModal("add-recorrente") }}
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {recurring.data.map((r) => (
              <RecurringExpenseCard
                key={r.id}
                expense={r}
                currentYear={now.year}
                currentMonth={now.month}
                onAddVersion={(id) => {
                  setSelectedRecurring(recurring.data!.find((x) => x.id === id) ?? null);
                  setModal("add-rec-version");
                }}
                onTerminate={(id) => {
                  setSelectedRecurring(recurring.data!.find((x) => x.id === id) ?? null);
                  setModal("end-recorrente");
                }}
                onViewHistory={(exp) => {
                  setSelectedRecurring(exp);
                  setModal("view-rec-history");
                }}
                onDelete={(id) => setDeleteRecurring(id)}
              />
            ))}
          </div>
        ))}

      {/* Modals */}
      <Modal
        isOpen={modal === "add-avulsa"}
        onClose={() => setModal(null)}
        title="Nova despesa avulsa"
      >
        <OneTimeExpenseForm
          categories={catOptions}
          onSave={handleSaveAvulsa}
          onClose={() => setModal(null)}
          isLoading={avulsas.create.isPending}
        />
      </Modal>
      <Modal
        isOpen={modal === "edit-avulsa"}
        onClose={() => setModal(null)}
        title="Editar despesa avulsa"
      >
        <OneTimeExpenseForm
          initial={selectedAvulsa ?? undefined}
          categories={catOptions}
          onSave={handleSaveAvulsa}
          onClose={() => setModal(null)}
          isLoading={avulsas.update.isPending}
        />
      </Modal>
      <Modal
        isOpen={modal === "add-parcelada"}
        onClose={() => setModal(null)}
        title="Novo parcelamento"
        width="md"
      >
        <InstallmentForm
          categories={catOptions}
          onSave={(data) => installments.create.mutate(data, { onSuccess: () => setModal(null) })}
          onClose={() => setModal(null)}
          isLoading={installments.create.isPending}
        />
      </Modal>
      <InstallmentModal
        isOpen={modal === "view-parcelas"}
        onClose={() => setModal(null)}
        expense={selectedInstall}
        currentYear={now.year}
        currentMonth={now.month}
      />
      <Modal
        isOpen={modal === "add-recorrente"}
        onClose={() => setModal(null)}
        title="Nova despesa recorrente"
        width="md"
      >
        <RecurringExpenseForm
          categories={catOptions}
          onSave={(data) => recurring.create.mutate(data, { onSuccess: () => setModal(null) })}
          onClose={() => setModal(null)}
          isLoading={recurring.create.isPending}
        />
      </Modal>

      {/* Add recurring version */}
      <Modal
        isOpen={modal === "add-rec-version"}
        onClose={() => setModal(null)}
        title="Nova versão da despesa"
        width="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-text-subtle bg-bg border border-border rounded-lg px-3 py-2">
            A alteração valerá a partir do mês selecionado. O histórico anterior é preservado.
          </p>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text">Nova descrição</label>
            <input
              value={rvDesc}
              onChange={(e) => setRvDesc(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text">Novo valor (R$)</label>
              <input
                value={rvAmount}
                onChange={(e) => setRvAmount(e.target.value)}
                placeholder="0,00"
                className="flex h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text">Categoria</label>
              <select
                value={rvCat}
                onChange={(e) => setRvCat(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red"
              >
                <option value="">Selecione...</option>
                {catOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <MonthYearSelect
            label="Vigência a partir de"
            month={rvMonth}
            year={rvYear}
            onMonthChange={setRvMonth}
            onYearChange={setRvYear}
            required
          />
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="ghost" onClick={() => setModal(null)}>
              Cancelar
            </Button>
            <Button onClick={handleAddRecVersion} isLoading={recurring.addVersion.isPending}>
              Criar nova versão
            </Button>
          </div>
        </div>
      </Modal>

      {/* End recurring */}
      <Modal
        isOpen={modal === "end-recorrente"}
        onClose={() => setModal(null)}
        title="Encerrar despesa recorrente"
      >
        <div className="space-y-4">
          <p className="text-xs text-text-subtle bg-bg border border-border rounded-lg px-3 py-2">
            A despesa recorrente será encerrada ao final do mês selecionado.
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
            <Button
              variant="danger"
              onClick={() => {
                if (selectedRecurring)
                  recurring.terminate.mutate(
                    { id: selectedRecurring.id, endYear, endMonth },
                    { onSuccess: () => setModal(null) },
                  );
              }}
              isLoading={recurring.terminate.isPending}
            >
              Encerrar despesa
            </Button>
          </div>
        </div>
      </Modal>

      {/* Recurring history */}
      <Modal
        isOpen={modal === "view-rec-history"}
        onClose={() => setModal(null)}
        title="Histórico de versões"
        width="md"
      >
        {selectedRecurring && (
          <div className="flex flex-col">
            {[...selectedRecurring.versions]
              .sort((a, b) =>
                b.effectiveYear !== a.effectiveYear
                  ? b.effectiveYear - a.effectiveYear
                  : b.effectiveMonth - a.effectiveMonth,
              )
              .map((v) => (
                <div
                  key={v.id}
                  className="flex items-start gap-3 py-2.5 border-b border-border last:border-0 flex-wrap"
                >
                  <span className="text-xs font-bold text-text-subtle min-w-[70px]">
                    A partir de {formatMonthYear(v.effectiveYear, v.effectiveMonth)}
                  </span>
                  <div className="flex-1">
                    <div className="text-[13.5px]">{v.description}</div>
                    {v.category && (
                      <div className="text-[11px] text-text-subtle">{v.category.name}</div>
                    )}
                  </div>
                  <span className="text-[14px] font-semibold text-red ml-auto">
                    {formatCurrency(v.amount)}/mês
                  </span>
                </div>
              ))}
          </div>
        )}
      </Modal>

      {/* Delete confirms */}
      <ConfirmDialog
        isOpen={!!deleteAvulsa}
        onClose={() => setDeleteAvulsa(null)}
        onConfirm={() => {
          if (deleteAvulsa)
            avulsas.remove.mutate(deleteAvulsa.id, { onSuccess: () => setDeleteAvulsa(null) });
        }}
        message={`Excluir a despesa "${deleteAvulsa?.description}"?`}
        confirmLabel="Excluir"
        isDanger
        isLoading={avulsas.remove.isPending}
      />
      <ConfirmDialog
        isOpen={!!deleteInstall}
        onClose={() => setDeleteInstall(null)}
        onConfirm={() => {
          if (deleteInstall)
            installments.remove.mutate(deleteInstall, { onSuccess: () => setDeleteInstall(null) });
        }}
        message="Excluir todo o parcelamento? Todas as parcelas serão removidas."
        confirmLabel="Excluir"
        isDanger
        isLoading={installments.remove.isPending}
      />
      <ConfirmDialog
        isOpen={!!deleteRecurring}
        onClose={() => setDeleteRecurring(null)}
        onConfirm={() => {
          if (deleteRecurring)
            recurring.remove.mutate(deleteRecurring, { onSuccess: () => setDeleteRecurring(null) });
        }}
        message="Excluir a despesa recorrente?"
        confirmLabel="Excluir"
        isDanger
        isLoading={recurring.remove.isPending}
      />
    </div>
  );
}
