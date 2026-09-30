"use client";

import { useState } from "react";
import { Tabs } from "@/shared/components/Tabs";
import { ExportPanel } from "@/features/dados/components/ExportPanel";
import { ImportPanel } from "@/features/dados/components/ImportPanel";

type Tab = "exportar" | "importar";

export default function DadosPage() {
  const [tab, setTab] = useState<Tab>("exportar");

  return (
    <div className="max-w-[1100px] p-4 sm:p-7">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold">Dados</h1>
        <p className="mt-0.5 text-[13px] text-text-muted">
          Exporte seus lançamentos ou traga dados de fora
        </p>
      </div>

      <Tabs
        tabs={[
          { id: "exportar", label: "Exportar" },
          { id: "importar", label: "Importar" },
        ]}
        value={tab}
        onValueChange={(value) => setTab(value as Tab)}
      />

      {tab === "exportar" ? <ExportPanel /> : <ImportPanel />}
    </div>
  );
}
