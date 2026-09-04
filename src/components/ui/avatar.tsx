import type { ComponentProps } from "react";

import { cn } from "~/lib/utils";

export function Avatar({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar"
      className={cn(
        "bg-muted text-muted-foreground relative flex size-4 shrink-0 items-center justify-center overflow-hidden rounded-full text-[9px] font-medium",
        className,
      )}
      {...props}
    />
  );
}

export function AvatarFallback({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar-fallback"
      className={cn("flex size-full items-center justify-center", className)}
      {...props}
    />
  );
}
