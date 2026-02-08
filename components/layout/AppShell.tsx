import type { ReactNode } from "react";

export default function AppShell({
  children,
  header
}: {
  children: ReactNode;
  header?: ReactNode;
}) {
  return (
    <div className="page-shell">
      <div className="bg-grid" />
      <div className="bg-glow glow-a" />
      <div className="bg-glow glow-b" />
      {header}
      <main className="shell">{children}</main>
    </div>
  );
}
