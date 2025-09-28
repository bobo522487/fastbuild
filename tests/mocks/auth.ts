import { vi } from 'vitest';

// 统一的认证相关模拟配置
export const setupAuthMocks = () => {
  // Mock bcryptjs
  vi.mock('bcryptjs', () => ({
    hash: vi.fn(() => 'hashed-password'),
    compare: vi.fn(() => Promise.resolve(true)),
  }));

  // Mock jsonwebtoken
  vi.mock('jsonwebtoken', () => ({
    default: {
      sign: vi.fn(() => 'mock-token'),
      verify: vi.fn(() => ({ userId: 'test-user-id', email: 'test@example.com', role: 'USER' })),
    },
    sign: vi.fn(() => 'mock-token'),
    verify: vi.fn(() => ({ userId: 'test-user-id', email: 'test@example.com', role: 'USER' })),
  }));
};