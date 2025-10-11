import '@testing-library/jest-dom/vitest';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: vi.fn(),
      replace: vi.fn(),
      refresh: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      prefetch: vi.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '/';
  },
}));