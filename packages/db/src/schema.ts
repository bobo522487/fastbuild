import { z } from "zod/v4";

export const CreatePostSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title too long"),
  content: z.string().min(1, "Content is required").max(10000, "Content too long"),
});

export const PostUpdateSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title too long").optional(),
  content: z.string().min(1, "Content is required").max(10000, "Content too long").optional(),
});

export type CreatePostInput = z.infer<typeof CreatePostSchema>;
export type PostUpdateInput = z.infer<typeof PostUpdateSchema>;