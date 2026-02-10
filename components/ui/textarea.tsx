import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[96px] w-full rounded-xl border border-steel-200 bg-white/80 px-3 py-2 text-sm text-ink-900 shadow-sm backdrop-blur-[2px] transition-all duration-200 placeholder:text-steel-400 focus:outline-none focus:ring-2 focus:ring-[rgba(12,148,136,0.35)] focus:border-[rgba(15,118,110,0.45)]",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
