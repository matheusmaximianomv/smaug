import Link from "next/link";
import { RegisterForm } from "@/features/auth/components/RegisterForm";

export default function CadastroPage() {
  return (
    <div className="w-full max-w-sm">
      <div className="rounded-2xl border border-border bg-surface p-10 shadow-sm">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-red">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path
                d="M11 3C7 3 4 6 4 9.5c0 2.5 1.5 4.5 3.5 5.5L11 19l3.5-4c2-1 3.5-3 3.5-5.5C18 6 15 3 11 3Z"
                fill="white"
                opacity="0.9"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-black tracking-wide">
            SMA<span className="text-red">U</span>G
          </h1>
        </div>
        <h2 className="mb-2 text-lg font-bold text-text">Criar conta</h2>
        <p className="mb-6 text-sm leading-relaxed text-text-muted">
          Crie sua conta para começar a gerenciar suas finanças pessoais.
        </p>
        <RegisterForm />
        <p className="mt-6 text-center text-sm text-text-muted">
          Já tem uma conta?{" "}
          <Link href="/login" className="font-medium text-red hover:underline">
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  );
}
