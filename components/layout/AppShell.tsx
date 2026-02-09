import type { ReactNode } from "react";
import AppHeader from "@/components/layout/AppHeader";
import AccessGate from "@/components/layout/AccessGate";

export default function AppShell({
  children
}: {
  children: ReactNode;
}) {
  return (
    <div className="page-shell">
      <div className="bg-grid" />
      <div className="bg-glow glow-a" />
      <div className="bg-glow glow-b" />
      <AppHeader />
      <main className="shell">
        <AccessGate>{children}</AccessGate>
      </main>
    </div>
  );
}
