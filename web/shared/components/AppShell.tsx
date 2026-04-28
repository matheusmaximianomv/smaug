"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function AppShell({ children }: { children: React.ReactNode }) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const initials =
    user?.name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "?";

  return (
    <div className="flex h-screen bg-bg">
      {/* Desktop Sidebar */}
      {!isMobile && <Sidebar className="w-nav shrink-0 fixed inset-y-0 left-0 z-20 h-full" />}

      {/* Mobile sidebar overlay */}
      {isMobile && sidebarOpen && (
        <>
          <div className="fixed inset-0 z-30 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <Sidebar className="fixed inset-y-0 left-0 z-40 w-nav" />
        </>
      )}

      {/* Main area */}
      <div className={`flex flex-1 flex-col overflow-hidden ${!isMobile ? "ml-nav" : ""}`}>
        {/* Mobile top bar */}
        {isMobile && (
          <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-border bg-surface px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded p-1.5 text-text"
              aria-label="Abrir menu"
            >
              <Menu size={20} />
            </button>
            <span className="text-base font-black tracking-wide">
              SMA<span className="text-red">U</span>G
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red text-[11px] font-bold text-white">
              {initials}
            </div>
          </div>
        )}

        {/* Page content */}
        <main className={`flex-1 overflow-y-auto ${isMobile ? "pb-16" : ""}`}>{children}</main>

        {/* Mobile bottom nav */}
        {isMobile && <BottomNav className="fixed bottom-0 inset-x-0 z-20 pb-safe" />}
      </div>
    </div>
  );
}
