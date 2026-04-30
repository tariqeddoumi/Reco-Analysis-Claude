import type { Metadata } from "next";
import { Building2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Connexion",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-[#0f2744] to-slate-800">
      {/* Background pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
        aria-hidden="true"
      />

      {/* Top brand bar */}
      <header className="relative z-10 flex items-center justify-center pt-10 pb-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600 shadow-lg">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-white text-lg font-bold leading-tight">
              Suivi Recommandations
            </h1>
            <p className="text-slate-400 text-xs">Bancaire — Contrôle interne</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center pb-6">
        <p className="text-slate-500 text-xs">
          &copy; {new Date().getFullYear()} Suivi des Recommandations Bancaires — Usage interne uniquement
        </p>
      </footer>
    </div>
  );
}
