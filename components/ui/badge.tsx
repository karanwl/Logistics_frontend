import * as React from "react";
import { cn } from "@/lib/utils/cn";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-steel-200 bg-white px-2.5 py-1 text-xs font-medium text-steel-600",
        className
      )}
      {...props}
    />
  );
}
