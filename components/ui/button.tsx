import { cn } from "@/lib/cn";
import * as React from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const styles: Record<Variant, string> = {
  primary: "bg-blue-600 hover:bg-blue-500 text-white",
  secondary: "bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700",
  ghost: "bg-transparent hover:bg-neutral-900 text-neutral-300",
  danger: "bg-red-600 hover:bg-red-500 text-white",
};

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition disabled:opacity-50 disabled:pointer-events-none",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}
