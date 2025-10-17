"use client";

export {
  DeferredLoading,
  FormLoadingOverlay,
  FullPageLoading,
  InlineLoading,
  LoadingButton,
  LoadingSpinner,
} from "@fastbuild/ui/loading";

import { CardSkeleton } from "@fastbuild/ui/skeleton";

export function PostListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex w-full flex-col gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <PostCardSkeleton
          // eslint-disable-next-line react/no-array-index-key
          key={index}
        />
      ))}
    </div>
  );
}

export function PostCardSkeleton({ pulse = true }: { pulse?: boolean }) {
  return (
    <CardSkeleton
      animated={pulse}
      showAction
      headingClassName="h-6 w-3/4 bg-primary/40"
      bodyLines={["w-full", "w-5/6"]}
      actionClassName="ml-4 h-8 w-16 bg-primary/40"
    />
  );
}
