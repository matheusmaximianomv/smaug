"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, TrendingUp, TrendingDown, Tag, Clock } from "lucide-react";
import { cn } from "../lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/receitas", label: "Receitas", Icon: TrendingUp },
  { href: "/despesas", label: "Despesas", Icon: TrendingDown },
  { href: "/categorias", label: "Categorias", Icon: Tag },
  { href: "/historico", label: "Histórico", Icon: Clock },
];

interface BottomNavProps {
  className?: string;
}

export function BottomNav({ className }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex border-t border-border bg-surface", className)}>
      {NAV_ITEMS.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] font-semibold",
              active ? "text-red" : "text-text-muted",
            )}
          >
            <Icon size={20} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
