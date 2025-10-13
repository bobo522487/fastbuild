import { describe, expect, it } from 'vitest';

export * from '../../testing/factories';

import { createMockCaller, createUser } from '../../testing/factories';

describe('test factory helpers', () => {
  it('expose helper creators', () => {
    expect(typeof createUser).toBe('function');
    expect(typeof createMockCaller).toBe('function');
  });
});
