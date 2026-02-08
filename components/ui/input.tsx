import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex h-10 w-full rounded-lg border border-steel-200 bg-white px-3 py-2 text-sm text-ink-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-ink-900",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";
