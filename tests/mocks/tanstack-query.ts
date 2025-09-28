import { vi } from 'vitest';
import React from 'react';

// 统一的 TanStack Query 模拟配置
export const setupTanStackQueryMocks = () => {
  vi.mock('@tanstack/react-query', () => ({
    QueryClient: vi.fn().mockImplementation(() => ({
      defaultOptions: {
        queries: {
          staleTime: 30 * 1000,
          refetchOnWindowFocus: false,
        },
      },
    })),
    QueryClientProvider: ({ children, client }: { children: React.ReactNode; client: any }) =>
      React.createElement('div', { 'data-query-client': 'true' }, children),
    useQuery: vi.fn().mockImplementation(({ queryKey, queryFn }) => ({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })),
    useMutation: vi.fn().mockImplementation(({ mutationFn }) => ({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
      error: null,
      reset: vi.fn(),
    })),
  }));
};