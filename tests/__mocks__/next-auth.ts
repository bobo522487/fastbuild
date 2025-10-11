import { vi } from 'vitest';

// NextAuth mock configuration
export const createMockAuth = () => {
  const mockAuth = {
    getServerSession: vi.fn(),
    handlers: {
      GET: vi.fn(),
      POST: vi.fn(),
    },
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  };

  // Mock session data
  const mockSession = {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      image: 'https://example.com/avatar.jpg',
    },
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };

  // Mock user data
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    emailVerified: new Date(),
    image: 'https://example.com/avatar.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return {
    mockAuth,
    mockSession,
    mockUser,
    // Helper functions
    mockAuthenticatedSession: () => {
      mockAuth.getServerSession.mockResolvedValue(mockSession);
      return mockSession;
    },
    mockUnauthenticatedSession: () => {
      mockAuth.getServerSession.mockResolvedValue(null);
    },
    mockSignInSuccess: () => {
      mockAuth.signIn.mockResolvedValue({ ok: true, url: '/projects' });
    },
    mockSignInFailure: (error: string) => {
      mockAuth.signIn.mockResolvedValue({ ok: false, error });
    },
  };
};

export const { mockAuth, mockSession, mockUser } = createMockAuth();