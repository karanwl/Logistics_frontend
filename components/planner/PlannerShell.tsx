import type { ReactNode } from "react";

export default function PlannerShell({ children }: { children: ReactNode }) {
  return (
    <div className="page-stack">
      {children}
    </div>
  );
}
