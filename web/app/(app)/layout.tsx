"use client";

import { AppShell } from "@/shared/components/AppShell";
import { useAuth } from "@/features/auth/hooks/useAuth";

/**
 * Layout cliente das rotas autenticadas: é aqui (camada `app/`, que pode compor features) que a
 * sessão é retomada e o menu recebe o usuário e as ações de saída — `shared/` não conhece `auth`.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, logoutAll } = useAuth();
  return (
    <AppShell user={user} onLogout={logout} onLogoutAll={logoutAll}>
      {children}
    </AppShell>
  );
}
