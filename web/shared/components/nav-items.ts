import { LayoutDashboard, TrendingUp, TrendingDown, Tag, Clock, Database } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  Icon: LucideIcon;
}

/**
 * Fonte única da navegação. `Sidebar` (desktop) e `BottomNav` (mobile) renderizam a mesma lista;
 * quando cada um mantinha a sua cópia, um item novo precisava ser lembrado nos dois lugares.
 */
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/receitas", label: "Receitas", Icon: TrendingUp },
  { href: "/despesas", label: "Despesas", Icon: TrendingDown },
  { href: "/categorias", label: "Categorias", Icon: Tag },
  { href: "/historico", label: "Histórico", Icon: Clock },
  { href: "/dados", label: "Dados", Icon: Database },
];

/** Um item está ativo na própria rota e em qualquer rota abaixo dela. */
export function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}
