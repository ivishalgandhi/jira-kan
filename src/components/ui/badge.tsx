import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "~/lib/utils";

const badgeVariants = cva(
  "relative inline-flex h-5 min-w-5 w-fit shrink-0 items-center justify-center border px-1.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        outline:
          "border-border bg-transparent text-muted-foreground dark:bg-input/32",
        "primary-light":
          "border-primary/10 bg-primary/10 text-primary dark:border-primary/25 dark:bg-primary/15 dark:text-primary",
        "warning-light":
          "border-warning/15 bg-warning/10 text-warning-foreground dark:border-warning/25 dark:bg-warning/15 dark:text-warning",
        "destructive-light":
          "border-destructive/15 bg-destructive/10 text-destructive-foreground dark:border-destructive/25 dark:bg-destructive/15 dark:text-destructive",
      },
    },
    defaultVariants: {
      variant: "outline",
    },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), "rounded-sm", className)}
      {...props}
    />
  );
}
