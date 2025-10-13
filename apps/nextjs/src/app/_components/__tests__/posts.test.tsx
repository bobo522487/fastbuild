import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from '@acme/ui/toast';

import { CreatePostForm, PostCard, PostList } from '../posts';
import { ErrorBoundary } from '../error-boundary';
import { createMockCaller, createUser, createPostWithUser } from '@acme/api/testing';

// Mock tRPC
vi.mock('~/trpc/react', () => ({
  useTRPC: () => ({
    post: {
      create: {
        mutationOptions: vi.fn(() => ({ onSuccess: vi.fn(), onError: vi.fn() })),
      },
      delete: {
        mutationOptions: vi.fn(() => ({ onSuccess: vi.fn(), onError: vi.fn() })),
      },
      all: {
        queryOptions: vi.fn(),
      },
      pathFilter: vi.fn(() => ['post']),
    },
  }),
}));

// Mock toast
vi.mock('@acme/ui/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('CreatePostForm', () => {
  let queryClient: QueryClient;
  let mockUser: any;
  let mockCaller: any;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockUser = createUser();
    mockCaller = createMockCaller(mockUser);

    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <CreatePostForm />
        </ErrorBoundary>
      </QueryClientProvider>
    );
  };

  it('should render form fields correctly', () => {
    renderComponent();

    expect(screen.getByLabelText(/Post Title/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter post title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Content/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/What's on your mind/i/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Post/i })).toBeInTheDocument();
  });

  it('should show validation errors for empty fields', async () => {
    renderComponent();

    const submitButton = screen.getByRole('button', { name: /Create Post/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Title is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Content is required/i)).toBeInTheDocument();
    });
  });

  it('should show loading state during submission', async () => {
    const mockMutate = vi.fn();
    const mockMutation = {
      mutate: mockMutate,
      isPending: true,
      reset: vi.fn(),
    };

    // Mock the mutation hook
    vi.doMock('@tanstack/react-query', async () => {
      const actual = await vi.importActual('@tanstack/react-query');
      return {
        ...actual,
        useMutation: () => mockMutation,
      };
    });

    renderComponent();

    const titleInput = screen.getByPlaceholderText(/Enter post title/i);
    const contentInput = screen.getByPlaceholderText(/What's on your mind/i/i);
    const submitButton = screen.getByRole('button', { name: /Creating/i });

    fireEvent.change(titleInput, { target: { value: 'Test Post' } });
    fireEvent.change(contentInput, { target: { value: 'Test content' } });

    expect(submitButton).toBeDisabled();
    expect(screen.getByText(/Creating/i)).toBeInTheDocument();
  });

  it('should reset form after successful submission', async () => {
    const mockMutate = vi.fn();
    const mockMutation = {
      mutate: mockMutate,
      isPending: false,
      reset: vi.fn(),
    };

    vi.doMock('@tanstack/react-query', async () => {
      const actual = await vi.importActual('@tanstack/react-query');
      return {
        ...actual,
        useMutation: () => mockMutation,
      };
    });

    renderComponent();

    const titleInput = screen.getByPlaceholderText(/Enter post title/i);
    const contentInput = screen.getByPlaceholderText(/What's on your mind/i/i);
    const submitButton = screen.getByRole('button', { name: /Create Post/i });

    fireEvent.change(titleInput, { target: { value: 'Test Post' } });
    fireEvent.change(contentInput, { target: { value: 'Test content' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(titleInput).toHaveValue('');
      expect(contentInput).toHaveValue('');
    });
  });
});

describe('PostCard', () => {
  let queryClient: QueryClient;
  let mockPost: any;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockPost = createPostWithUser();
    vi.clearAllMocks();
  });

  const renderComponent = (post: any = mockPost) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <PostCard post={post} />
        </ErrorBoundary>
      </QueryClientProvider>
    );
  };

  it('should render post information correctly', () => {
    renderComponent();

    expect(screen.getByText(mockPost.title)).toBeInTheDocument();
    expect(screen.getByText(mockPost.content)).toBeInTheDocument();
    expect(screen.getByText(`by ${mockPost.user.name}`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete/i })).toBeInTheDocument();
  });

  it('should show confirmation dialog before deleting', async () => {
    // Mock window.confirm
    const originalConfirm = window.confirm;
    window.confirm = vi.fn(() => false);

    renderComponent();

    const deleteButton = screen.getByRole('button', { name: /Delete/i });
    fireEvent.click(deleteButton);

    expect(window.confirm).toHaveBeenCalledWith(
      'Are you sure you want to delete this post?'
    );

    // Restore original confirm
    window.confirm = originalConfirm;
  });

  it('should show loading state during deletion', async () => {
    // Mock window.confirm to return true
    const originalConfirm = window.confirm;
    window.confirm = vi.fn(() => true);

    const mockMutate = vi.fn();
    const mockMutation = {
      mutate: mockMutate,
      isPending: true,
      reset: vi.fn(),
    };

    vi.doMock('@tanstack/react-query', async () => {
      const actual = await vi.importActual('@tanstack/react-query');
      return {
        ...actual,
        useMutation: () => mockMutation,
      };
    });

    renderComponent();

    const deleteButton = screen.getByRole('button', { name: /Deleting/i });
    fireEvent.click(deleteButton);

    expect(deleteButton).toBeDisabled();
    expect(screen.getByText(/Deleting/i)).toBeInTheDocument();

    // Restore original confirm
    window.confirm = originalConfirm;
  });
});

describe('PostList', () => {
  let queryClient: QueryClient;
  let mockPosts: any[];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockPosts = Array.from({ length: 3 }, () => createPostWithUser());
    vi.clearAllMocks();
  });

  const renderComponent = (posts: any[] = mockPosts) => {
    // Mock the useSuspenseQuery hook
    vi.doMock('@tanstack/react-query', async () => {
      const actual = await vi.importActual('@tanstack/react-query');
      return {
        ...actual,
        useSuspenseQuery: () => ({
          data: posts,
          isLoading: false,
          error: null,
        }),
      };
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <PostList />
        </ErrorBoundary>
      </QueryClientProvider>
    );
  };

  it('should render list of posts', () => {
    renderComponent();

    mockPosts.forEach((post) => {
      expect(screen.getByText(post.title)).toBeInTheDocument();
      expect(screen.getByText(post.content)).toBeInTheDocument();
    });
  });

  it('should show empty state when no posts', () => {
    renderComponent([]);

    expect(screen.getByText(/No posts yet/i)).toBeInTheDocument();
    expect(screen.getByText(/Be the first to share something!/i)).toBeInTheDocument();
  });

  it('should render skeleton loaders initially', () => {
    // Mock loading state
    vi.doMock('@tanstack/react-query', async () => {
      const actual = await vi.importActual('@tanstack/react-query');
      return {
        ...actual,
        useSuspenseQuery: () => ({
          data: [],
          isLoading: true,
          error: null,
        }),
      };
    });

    renderComponent([]);

    // Check for skeleton elements
    const skeletons = screen.getAllByText(/skeleton/i) ||
                     document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should handle error state gracefully', () => {
    // Mock error state
    vi.doMock('@tanstack/react-query', async () => {
      const actual = await vi.importActual('@tanstack/react-query');
      return {
        ...actual,
        useSuspenseQuery: () => ({
          data: [],
          isLoading: false,
          error: new Error('Failed to load'),
        }),
      };
    });

    renderComponent();

    expect(screen.getByText(/Failed to load posts/i)).toBeInTheDocument();
  });
});
