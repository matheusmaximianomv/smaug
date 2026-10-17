import { OneTimeRevenueFicha } from "./OneTimeRevenueFicha";
import { FixedRevenueFicha } from "./FixedRevenueFicha";
import type { CompetenceStatus } from "@/shared/lib/competence";
import type { OneTimeRevenue, RevenueMonthItem } from "../types";

interface RevenueFichaProps {
  item: RevenueMonthItem;
  status: CompetenceStatus;
  onClose: () => void;
  onEdit: (item: OneTimeRevenue) => void;
}

/** Escolhe a Ficha pelo tipo do item da consulta mensal. */
export function RevenueFicha({ item, status, onClose, onEdit }: RevenueFichaProps) {
  if (item.type === "ONE_TIME") {
    return (
      <OneTimeRevenueFicha
        item={item}
        isPast={status === "past"}
        onClose={onClose}
        onEdit={onEdit}
      />
    );
  }
  return <FixedRevenueFicha item={item} onClose={onClose} />;
}
