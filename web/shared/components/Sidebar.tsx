"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, TrendingUp, TrendingDown, Tag, Clock, LogOut } from "lucide-react";
import { cn } from "../lib/utils";
import { useAuth } from "@/features/auth/hooks/useAuth";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/receitas", label: "Receitas", Icon: TrendingUp },
  { href: "/despesas", label: "Despesas", Icon: TrendingDown },
  { href: "/categorias", label: "Categorias", Icon: Tag },
  { href: "/historico", label: "Histórico", Icon: Clock },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const initials =
    user?.name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "?";

  return (
    <aside className={cn("flex flex-col bg-surface border-r border-border", className)}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 border-b border-border px-5 py-[22px]">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red">
          <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
            <path
              d="M11 3C7 3 4 6 4 9.5c0 2.5 1.5 4.5 3.5 5.5L11 19l3.5-4c2-1 3.5-3 3.5-5.5C18 6 15 3 11 3Z"
              fill="white"
              opacity="0.9"
            />
          </svg>
        </div>
        <span className="text-[15px] font-bold tracking-[0.04em]">
          SMA<span className="text-red">U</span>G
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-2.5">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2.5 text-[13.5px] font-medium transition-colors",
                active ? "bg-red-light text-red" : "text-text-muted hover:bg-bg hover:text-text",
              )}
            >
              <Icon size={16} className={cn("shrink-0", active ? "opacity-100" : "opacity-70")} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="flex items-center gap-2.5 border-t border-border px-4 py-3.5">
        <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-red text-xs font-bold text-white">
          {initials}
        </div>
        <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-medium">
          {user?.name ?? ""}
        </span>
        <button
          onClick={logout}
          className="rounded p-1 text-text-subtle hover:text-red"
          title="Sair"
          aria-label="Sair"
        >
          <LogOut size={14} />
        </button>
      </div>
    </aside>
  );
}
