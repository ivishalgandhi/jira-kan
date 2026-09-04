import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

export function InputGroup({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="input-group"
      role="group"
      className={cn(
        "group/input-group border-input dark:bg-input/30 relative flex h-9 w-full min-w-0 items-center rounded-md border shadow-xs outline-none",
        "has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-ring/50 has-[[data-slot=input-group-control]:focus-visible]:ring-[3px]",
        className,
      )}
      {...props}
    />
  );
}

const addonVariants = cva(
  "text-muted-foreground flex h-auto cursor-text items-center justify-center gap-2 py-1.5 text-sm select-none [&>svg:not([class*='size-'])]:size-4",
  {
    variants: {
      align: {
        "inline-start": "order-first pl-3",
        "inline-end": "order-last pr-3",
      },
    },
    defaultVariants: {
      align: "inline-start",
    },
  },
);

export function InputGroupAddon({
  className,
  align = "inline-start",
  ...props
}: ComponentProps<"div"> & VariantProps<typeof addonVariants>) {
  return (
    <div
      data-slot="input-group-addon"
      className={cn(addonVariants({ align }), className)}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("button")) return;
        event.currentTarget.parentElement
          ?.querySelector("input")
          ?.focus();
      }}
      {...props}
    />
  );
}

export function InputGroupInput({
  className,
  ...props
}: ComponentProps<"input">) {
  return (
    <Input
      data-slot="input-group-control"
      className={cn(
        "flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent",
        className,
      )}
      {...props}
    />
  );
}
