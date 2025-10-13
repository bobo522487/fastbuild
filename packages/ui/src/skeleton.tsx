"use client";

import React from "react";

import { cn } from "@acme/ui";

export function Skeleton({
  className = "",
  animated = true,
  ...props
}: {
  animated?: boolean;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        animated ? "animate-pulse" : undefined,
        "rounded-sm bg-muted-foreground/20",
        className,
      )}
      aria-hidden
      {...props}
    />
  );
}

type BodyLineConfig =
  | string
  | {
    className?: string;
  };

export function CardSkeleton({
  className = "",
  headingClassName = "h-6 w-3/4 bg-primary/40",
  bodyLines = ["w-full", "w-5/6"],
  bodyClassName = "space-y-2",
  showAction = false,
  actionClassName = "ml-4 h-8 w-16 bg-primary/40",
  children,
  animated = true,
}: {
  className?: string;
  headingClassName?: string;
  bodyLines?: BodyLineConfig[];
  bodyClassName?: string;
  showAction?: boolean;
  actionClassName?: string;
  children?: React.ReactNode;
  animated?: boolean;
}) {
  return (
    <div className={cn("flex flex-row rounded-lg bg-muted p-4", className)}>
      <div className={cn("grow", bodyClassName)}>
        <Skeleton
          animated={animated}
          className={cn("rounded-sm", headingClassName)}
        />
        <div className={cn("mt-2 space-y-2")}>
          {bodyLines.map((line, index) => (
            <Skeleton
              // eslint-disable-next-line react/no-array-index-key
              key={index}
              className={cn(
                "h-4 rounded-sm opacity-30",
                typeof line === "string" ? line : line.className,
              )}
              animated={animated}
            />
          ))}
        </div>
        {children}
      </div>
      {showAction ? (
        <Skeleton
          animated={animated}
          className={cn("ml-4 shrink-0 rounded-sm", actionClassName)}
        />
      ) : null}
    </div>
  );
}
