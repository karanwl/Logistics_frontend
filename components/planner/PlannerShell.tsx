import type { ReactNode } from "react";

export default function PlannerShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-6">
      {children}
    </div>
  );
}
