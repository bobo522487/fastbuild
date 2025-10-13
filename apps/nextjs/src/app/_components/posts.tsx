"use client";

import { useForm } from "@tanstack/react-form";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";

import type { RouterOutputs } from "@acme/api";
import { CreatePostSchema } from "@acme/db";
import { Button } from "@acme/ui/button";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@acme/ui/field";
import { Input } from "@acme/ui/input";
import { toast } from "@acme/ui/toast";

import { useTRPC } from "~/trpc/react";
import { ErrorBoundary, CreatePostErrorFallback, PostListErrorFallback } from "./error-boundary";
import { LoadingButton, PostListSkeleton, PostCardSkeleton } from "./loading-states";

export function CreatePostForm() {
  const trpc = useTRPC();

  const queryClient = useQueryClient();
  const createPost = useMutation(
    trpc.post.create.mutationOptions({
      onSuccess: async () => {
        form.reset();
        toast.success("Post created successfully!");
        await queryClient.invalidateQueries(trpc.post.pathFilter());
      },
      onError: (err) => {
        const errorMessage = err.data?.code === "UNAUTHORIZED"
          ? "You must be logged in to post"
          : err.data?.code === "TOO_MANY_REQUESTS"
          ? "Too many requests. Please try again later."
          : err.message || "Failed to create post";

        toast.error(errorMessage);
      },
    }),
  );

  const form = useForm({
    defaultValues: {
      content: "",
      title: "",
    },
    validators: {
      onSubmit: CreatePostSchema,
    },
    onSubmit: (data) => createPost.mutate(data.value),
  });

  return (
    <ErrorBoundary fallback={CreatePostErrorFallback}>
      <form
        className="relative w-full max-w-2xl"
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
      >
        <FieldGroup>
          <form.Field
            name="title"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldContent>
                    <FieldLabel htmlFor={field.name}>Post Title</FieldLabel>
                  </FieldContent>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    placeholder="Enter post title"
                    disabled={createPost.isPending}
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          />
          <form.Field
            name="content"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldContent>
                    <FieldLabel htmlFor={field.name}>Content</FieldLabel>
                  </FieldContent>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    placeholder="What's on your mind?"
                    disabled={createPost.isPending}
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          />
        </FieldGroup>
        <LoadingButton
          type="submit"
          loading={createPost.isPending}
          disabled={!form.state.canSubmit}
        >
          {createPost.isPending ? "Creating..." : "Create Post"}
        </LoadingButton>
      </form>
    </ErrorBoundary>
  );
}

export function PostList() {
  return (
    <ErrorBoundary fallback={PostListErrorFallback}>
      <PostListContent />
    </ErrorBoundary>
  );
}

function PostListContent() {
  const trpc = useTRPC();
  const { data: posts, isLoading, error } = useSuspenseQuery(trpc.post.all.queryOptions());

  if (error) {
    return (
      <div className="flex w-full flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 p-8">
        <p className="text-red-800">Failed to load posts</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="relative flex w-full flex-col gap-4">
        <PostCardSkeleton />
        <PostCardSkeleton />
        <PostCardSkeleton />

        <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/50">
          <p className="text-2xl font-bold text-muted-foreground">No posts yet</p>
          <p className="text-muted-foreground text-sm">Be the first to share something!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {posts.map((p) => {
        return <PostCard key={p.id} post={p} />;
      })}
    </div>
  );
}

export function PostCard(props: {
  post: RouterOutputs["post"]["all"][number];
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const deletePost = useMutation(
    trpc.post.delete.mutationOptions({
      onSuccess: async () => {
        toast.success("Post deleted successfully!");
        await queryClient.invalidateQueries(trpc.post.pathFilter());
      },
      onError: (err) => {
        const errorMessage = err.data?.code === "UNAUTHORIZED"
          ? "You must be logged in to delete a post"
          : err.data?.code === "FORBIDDEN"
          ? "You can only delete your own posts"
          : err.data?.code === "NOT_FOUND"
          ? "Post not found"
          : err.message || "Failed to delete post";

        toast.error(errorMessage);
      },
    }),
  );

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      deletePost.mutate(props.post.id);
    }
  };

  return (
    <div className="bg-muted flex flex-row rounded-lg p-4">
      <div className="grow">
        <h2 className="text-primary text-2xl font-bold">{props.post.title}</h2>
        <p className="mt-2 text-sm">{props.post.content}</p>
        <p className="text-muted-foreground mt-2 text-xs">
          by {props.post.user.name} • {new Date(props.post.createdAt).toLocaleDateString()}
        </p>
      </div>
      <div>
        <LoadingButton
          variant="ghost"
          className="text-primary cursor-pointer text-sm font-bold uppercase hover:bg-transparent hover:text-white"
          onClick={handleDelete}
          loading={deletePost.isPending}
          disabled={deletePost.isPending}
        >
          {deletePost.isPending ? "Deleting..." : "Delete"}
        </LoadingButton>
      </div>
    </div>
  );
}
