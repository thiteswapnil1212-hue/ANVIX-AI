
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "group/button relative inline-flex shrink-0 items-center justify-center",
    "rounded-xl border border-transparent bg-clip-padding",
    "text-sm font-medium whitespace-nowrap",
    "transition-all duration-200 ease-out",
    "outline-none select-none",
    "focus-visible:ring-2 focus-visible:ring-[#D4AF37]/60",
    "focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "active:translate-y-px",
    "disabled:pointer-events-none disabled:opacity-50",
    "aria-invalid:border-destructive",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    "[&_svg:not([class*='size-'])]:size-4",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "border-[#D4AF37]/20 bg-[#D4AF37] text-black shadow-sm shadow-[#D4AF37]/10 hover:border-[#E5C45B] hover:bg-[#E5C45B] hover:shadow-md hover:shadow-[#D4AF37]/10",

        outline:
          "border-border bg-background text-foreground hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/5",

        secondary:
          "border-zinc-800 bg-zinc-900 text-zinc-100 hover:border-zinc-700 hover:bg-zinc-800",

        ghost:
          "text-muted-foreground hover:bg-muted hover:text-foreground",

        destructive:
          "border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/20",

        link:
          "h-auto rounded-none p-0 text-primary underline-offset-4 hover:underline",
      },

      size: {
        default: "h-9 gap-2 px-3.5",
        xs: "h-6 gap-1 rounded-md px-2 text-xs",
        sm: "h-8 gap-1.5 rounded-lg px-3 text-xs",
        lg: "h-11 gap-2.5 rounded-xl px-5 text-sm",
        icon: "size-9",
        "icon-xs": "size-6 rounded-md",
        "icon-sm": "size-8 rounded-lg",
        "icon-lg": "size-11 rounded-xl",
      },
    },

    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

type ButtonProps =
  ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean;
    loadingText?: string;
  };

function Button({
  className,
  variant = "default",
  size = "default",
  loading = false,
  loadingText,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && (
        <Loader2
          className="size-4 animate-spin"
          aria-hidden="true"
        />
      )}

      {loading && loadingText ? loadingText : children}
    </ButtonPrimitive>
  );
}

export { Button, buttonVariants };