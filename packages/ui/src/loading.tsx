"use client";

import React from "react";

import { cn } from "@fastbuild/ui";

type SpinnerSize = "sm" | "md" | "lg";

const spinnerSizeClass: Record<SpinnerSize, string> = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

export function LoadingSpinner({
  size = "md",
  className = "",
}: {
  size?: SpinnerSize;
  className?: string;
}) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        "text-primary inline-block animate-spin rounded-full border-2 border-current border-t-transparent",
        spinnerSizeClass[size],
        className,
      )}
    >
      <span className="sr-only">Loading...</span>
    </span>
  );
}

export function FullPageLoading({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <LoadingSpinner size="lg" className="mb-4" />
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  );
}

type LoadingButtonVariant = "default" | "ghost" | "outline";

export function LoadingButton<
  T extends React.ButtonHTMLAttributes<HTMLButtonElement>,
>({
  loading,
  className = "",
  children,
  spinnerSize = "sm",
  spinnerPosition = "start",
  variant = "default",
  ...props
}: {
  loading: boolean;
  spinnerSize?: SpinnerSize;
  spinnerPosition?: "start" | "end";
  variant?: LoadingButtonVariant;
} & T) {
  const disabled = loading || props.disabled;

  const variantClasses: Record<LoadingButtonVariant, string> = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    ghost: "bg-transparent",
    outline: "border border-input bg-background",
  } as const;

  return (
    <button
      {...props}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors",
        "disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        className,
      )}
    >
      {loading && spinnerPosition === "start" && (
        <LoadingSpinner size={spinnerSize} className="mr-2" />
      )}
      {children}
      {loading && spinnerPosition === "end" && (
        <LoadingSpinner size={spinnerSize} className="ml-2" />
      )}
    </button>
  );
}

export function FormLoadingOverlay({ loading }: { loading: boolean }) {
  if (!loading) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="flex flex-col items-center">
        <LoadingSpinner size="lg" className="mb-2" />
        <p className="text-muted-foreground text-sm">Processing...</p>
      </div>
    </div>
  );
}

export function InlineLoading({
  message = "Loading...",
  className = "",
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center space-x-2 py-4", className)}>
      <LoadingSpinner size="sm" />
      <span className="text-muted-foreground text-sm">{message}</span>
    </div>
  );
}

export function DeferredLoading({
  children,
  delay = 200,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const [showLoading, setShowLoading] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoading(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  if (!showLoading) {
    return <div style={{ height: "100px" }} />;
  }

  return (
    <div className="flex items-center justify-center py-8">
      {children ?? <LoadingSpinner size="md" />}
    </div>
  );
}
