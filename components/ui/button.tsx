import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        default:
          "bg-[linear-gradient(135deg,_rgba(8,17,33,1),_rgba(15,118,110,0.95))] text-white shadow-[0_10px_20px_rgba(8,17,33,0.28)] hover:-translate-y-px hover:shadow-[0_14px_24px_rgba(8,17,33,0.34)] focus-visible:ring-ink-900",
        secondary:
          "bg-white/85 text-ink-900 border border-steel-200 shadow-sm hover:bg-white hover:border-steel-300 focus-visible:ring-steel-400",
        outline:
          "border border-steel-300 bg-white/55 text-ink-900 hover:bg-white/85 hover:border-steel-400",
        ghost: "text-ink-900 hover:bg-white/70"
      },
      size: {
        sm: "h-9 px-3",
        md: "h-11 px-4",
        lg: "h-12 px-5"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
