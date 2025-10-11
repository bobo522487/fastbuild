import { vi } from 'vitest';

// Prisma Client mock configuration
export const createMockPrismaClient = () => {
  // Mock data storage
  const mockData = {
    users: [],
    projects: [],
    projectMembers: [],
    auditLogs: [],
    sessions: [],
    accounts: [],
  };

  // Base mock operations
  const createMockOperations = (entityName: string) => ({
    create: vi.fn().mockImplementation(async ({ data }) => {
      const entity = {
        id: `test-${entityName}-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      mockData[entityName].push(entity);
      return entity;
    }),

    findUnique: vi.fn().mockImplementation(async ({ where }) => {
      const entity = mockData[entityName].find(item => {
        return Object.entries(where).every(([key, value]) => item[key] === value);
      });
      return entity || null;
    }),

    findMany: vi.fn().mockImplementation(async ({ where, take, skip, orderBy } = {}) => {
      let results = [...mockData[entityName]];

      // Apply where filters
      if (where) {
        results = results.filter(item => {
          return Object.entries(where).every(([key, value]) => {
            if (typeof value === 'object' && value !== null) {
              // Handle nested queries like { contains: 'test' }
              return Object.entries(value).every(([op, opValue]) => {
                if (op === 'contains') {
                  return item[key].includes(opValue);
                }
                return item[key] === opValue;
              });
            }
            return item[key] === value;
          });
        });
      }

      // Apply sorting
      if (orderBy) {
        results.sort((a, b) => {
          for (const [key, direction] of Object.entries(orderBy)) {
            const comparison = a[key] > b[key] ? 1 : -1;
            return direction === 'desc' ? -comparison : comparison;
          }
        });
      }

      // Apply pagination
      if (skip) results = results.slice(skip);
      if (take) results = results.slice(0, take);

      return results;
    }),

    update: vi.fn().mockImplementation(async ({ where, data }) => {
      const index = mockData[entityName].findIndex(item =>
        Object.entries(where).every(([key, value]) => item[key] === value)
      );

      if (index === -1) {
        throw new Error(`${entityName} not found`);
      }

      const updatedEntity = {
        ...mockData[entityName][index],
        ...data,
        updatedAt: new Date(),
      };

      mockData[entityName][index] = updatedEntity;
      return updatedEntity;
    }),

    delete: vi.fn().mockImplementation(async ({ where }) => {
      const index = mockData[entityName].findIndex(item =>
        Object.entries(where).every(([key, value]) => item[key] === value)
      );

      if (index === -1) {
        throw new Error(`${entityName} not found`);
      }

      const deletedEntity = mockData[entityName].splice(index, 1)[0];
      return deletedEntity;
    }),

    count: vi.fn().mockImplementation(async ({ where } = {}) => {
      let results = [...mockData[entityName]];

      if (where) {
        results = results.filter(item => {
          return Object.entries(where).every(([key, value]) => {
            if (typeof value === 'object' && value !== null) {
              return Object.entries(value).every(([op, opValue]) => {
                if (op === 'contains') {
                  return item[key].includes(opValue);
                }
                return item[key] === opValue;
              });
            }
            return item[key] === value;
          });
        });
      }

      return results.length;
    }),

    // Aggregate operations
    aggregate: vi.fn().mockImplementation(async ({ _count, _avg, _sum, _min, _max } = {}) => {
      const results = mockData[entityName];
      const aggregateResult: any = {};

      if (_count) {
        aggregateResult._count = {};
        for (const field of Object.keys(_count)) {
          aggregateResult._count[field] = results.length;
        }
      }

      if (_avg) {
        aggregateResult._avg = {};
        for (const field of Object.keys(_avg)) {
          const values = results.map(r => Number(r[field])).filter(v => !isNaN(v));
          aggregateResult._avg[field] = values.length > 0
            ? values.reduce((a, b) => a + b, 0) / values.length
            : null;
        }
      }

      if (_sum) {
        aggregateResult._sum = {};
        for (const field of Object.keys(_sum)) {
          const values = results.map(r => Number(r[field])).filter(v => !isNaN(v));
          aggregateResult._sum[field] = values.reduce((a, b) => a + b, 0);
        }
      }

      if (_min) {
        aggregateResult._min = {};
        for (const field of Object.keys(_min)) {
          const values = results.map(r => r[field]).filter(v => v != null);
          aggregateResult._min[field] = values.length > 0 ? Math.min(...values) : null;
        }
      }

      if (_max) {
        aggregateResult._max = {};
        for (const field of Object.keys(_max)) {
          const values = results.map(r => r[field]).filter(v => v != null);
          aggregateResult._max[field] = values.length > 0 ? Math.max(...values) : null;
        }
      }

      return aggregateResult;
    }),
  });

  // Create mock Prisma client
  const mockPrismaClient = {
    user: createMockOperations('users'),
    project: createMockOperations('projects'),
    projectMember: createMockOperations('projectMembers'),
    auditLog: createMockOperations('auditLogs'),
    session: createMockOperations('sessions'),
    account: createMockOperations('accounts'),

    // Transaction support
    $transaction: vi.fn().mockImplementation(async (operations) => {
      if (Array.isArray(operations)) {
        return Promise.all(operations);
      } else if (typeof operations === 'function') {
        return operations(mockPrismaClient);
      }
    }),

    // Connection management
    $connect: vi.fn().mockResolvedValue(undefined),
    $disconnect: vi.fn().mockResolvedValue(undefined),
    $on: vi.fn(),
    $use: vi.fn(),

    // Raw queries
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
  };

  return {
    mockPrismaClient,
    mockData,
    // Helper functions
    resetMockData: () => {
      Object.keys(mockData).forEach(key => {
        mockData[key] = [];
      });
    },
    getMockData: () => mockData,
    setMockData: (newData: any) => {
      Object.assign(mockData, newData);
    },
  };
};

export const { mockPrismaClient, mockData, resetMockData } = createMockPrismaClient();