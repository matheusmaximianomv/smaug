import { vi } from "vitest";
import { toast } from "@/shared/hooks/useToast";

/**
 * `shared/hooks/useToast.ts` guarda fila e listeners em variáveis de módulo, sem
 * API de reset. O `isolate: true` padrão do Vitest dá um registro de módulos novo
 * por ARQUIVO, então o vazamento só existe DENTRO de um arquivo — por isso não
 * adicionamos export de teste ao código de produção.
 *
 * Preferência de uso:
 * 1. `spyOnToast()` — assere a mensagem pt-BR e a action de retry sem tocar na
 *    fila nem em timers. É o default para testes de hook.
 * 2. `drainToasts()` — rede de segurança no afterEach global.
 * 3. Fake timers — só em `useToast.test.ts` e `Toast.test.tsx`.
 */
export function spyOnToast() {
  return {
    success: vi.spyOn(toast, "success").mockImplementation(() => {}),
    error: vi.spyOn(toast, "error").mockImplementation(() => {}),
    info: vi.spyOn(toast, "info").mockImplementation(() => {}),
    warning: vi.spyOn(toast, "warning").mockImplementation(() => {}),
  };
}

export function drainToasts(): void {
  if (vi.isFakeTimers()) vi.runOnlyPendingTimers();
}
