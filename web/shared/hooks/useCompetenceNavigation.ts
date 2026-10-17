"use client";

import { useState, useSyncExternalStore } from "react";
import {
  addMonths,
  getCompetenceStatus,
  getCurrentCompetence,
  sameCompetence,
  type Competence,
} from "../lib/competence";

interface CompetenceNavigationOptions {
  /** Chave de `sessionStorage` onde a seleção sobrevive a troca de tela e recarga. */
  persistKey?: string;
  /** "Agora" informado pelo servidor; sem ele vale o relógio local. */
  reference?: Competence;
}

/** Mesma chave em Receitas e Despesas: o mês escolhido numa tela vale para a outra. */
export const LEDGER_COMPETENCE_KEY = "smaug:competencia-lancamentos";

const noopSubscribe = () => () => {};

/**
 * Armazenamento é melhoria, não requisito: modo privado, cota estourada ou SSR
 * (onde `sessionStorage` nem existe) lançam exceção, e a tela precisa abrir no
 * mês corrente mesmo assim.
 */
function readStored(key: string | undefined): string | null {
  if (!key) return null;
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string | undefined, c: Competence): void {
  if (!key) return;
  try {
    sessionStorage.setItem(key, JSON.stringify(c));
  } catch {
    // ver readStored
  }
}

function parseStored(raw: string | null): Competence | null {
  if (!raw) return null;
  try {
    const { year, month } = (JSON.parse(raw) ?? {}) as Partial<Competence>;
    if (typeof year !== "number" || typeof month !== "number") return null;
    const valid = Number.isInteger(year) && Number.isInteger(month) && month >= 1 && month <= 12;
    return valid ? { year, month } : null;
  } catch {
    return null;
  }
}

/**
 * Navegação por competência compartilhada por Dashboard, Receitas e Despesas.
 *
 * A seleção é derivada (escolha explícita → valor salvo → primeira `reference`
 * do servidor → mês local) em vez de copiada para estado num efeito: assim o
 * alinhamento à `reference` acontece uma única vez e só quando o usuário ainda
 * não escolheu nada. O valor salvo é lido por `useSyncExternalStore` com
 * snapshot de servidor nulo, para que a hidratação não acuse divergência quando
 * a aba recarrega num mês diferente do corrente.
 */
export function useCompetenceNavigation({
  persistKey,
  reference,
}: CompetenceNavigationOptions = {}) {
  const local = getCurrentCompetence();
  const current = reference ?? local;

  const [chosen, setChosen] = useState<Competence | null>(null);
  const [firstReference, setFirstReference] = useState<Competence | undefined>(reference);
  if (reference && !firstReference) setFirstReference(reference);

  const storedRaw = useSyncExternalStore(
    noopSubscribe,
    () => readStored(persistKey),
    () => null,
  );

  const selected = chosen ?? parseStored(storedRaw) ?? firstReference ?? local;
  const status = getCompetenceStatus(selected, current);

  const select = (c: Competence) => {
    setChosen(c);
    writeStored(persistKey, c);
  };
  const navigate = (delta: number) => select(addMonths(selected, delta));
  const goToCurrent = () => select(current);

  return {
    selected,
    status,
    isCurrent: status === "current",
    current,
    navigate,
    select,
    goToCurrent,
  };
}

/**
 * Navegação das telas de lançamentos: persistida na sessão e alinhada ao "agora"
 * do servidor. A `reference` só chega com a primeira resposta, que por sua vez
 * depende do mês selecionado — por isso ela é adotada depois, por
 * `adoptReference`, chamado durante a renderização (o padrão "guardar
 * informação de renders anteriores" do React, com guarda contra laço).
 */
export function useLedgerNavigation() {
  const [reference, setReference] = useState<Competence>();
  const navigation = useCompetenceNavigation({ persistKey: LEDGER_COMPETENCE_KEY, reference });

  const adoptReference = (next: Competence | undefined) => {
    if (next && !sameCompetence(next, reference)) setReference(next);
  };

  return { ...navigation, reference, adoptReference };
}
