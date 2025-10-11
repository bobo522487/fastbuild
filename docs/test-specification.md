## 14. 测试策略

### 14.1. 测试金字塔

```
       / \
     / E2E \     少量关键流程测试
    /-------\
   / Integration \  API和数据库集成测试
  /---------------\
 / Unit Tests \     大量快速单元测试
/-------------------\
```

**原则**: 测试应该快速、简单、有用。不要为测试而测试。

### 14.2. 现代测试组织结构

采用就近测试 + 集成测试分离的混合策略：

```
src/                             # 源代码目录
├── components/
│   ├── ui/
│   │   ├── button.tsx
│   │   └── button.test.tsx        # 组件单元测试就近放置
│   ├── project/
│   │   ├── project-form.tsx
│   │   └── project-form.test.tsx
│   └── auth/
│       ├── login-form.tsx
│       └── login-form.test.tsx
├── lib/
│   ├── utils.ts
│   └── utils.test.ts              # 工具函数就近测试
├── app/api/
│   ├── projects/
│   │   ├── route.ts
│   │   └── route.test.ts           # API端点就近测试
│   └── auth/
│       ├── register/
│       │   ├── route.ts
│       │   └── route.test.ts

tests/                           # 集中测试目录
├── integration/                  # 跨模块集成测试
│   ├── api/                     # API集成测试
│   │   ├── projects.test.ts
│   │   └── auth.test.ts
│   └── database/                # 数据库集成测试
│       └── projects.test.ts
├── e2e/                         # 端到端测试
│   ├── auth-flow.spec.ts
│   └── project-creation.spec.ts
├── setup/                       # 测试配置
│   └── global-setup.ts
├── utils/                       # 测试工具
│   ├── test-utils.ts
│   ├── factory.ts
│   └── database-helpers.ts
└── __mocks__/                   # Mock文件
    ├── next-auth.ts
    └── prisma.ts
```

**就近测试的优势：**
- **维护性**：测试和代码在一起，重构时同步更新
- **发现性**：容易找到对应的测试文件
- **上下文**：测试文件与源代码共享相同的导入路径
- **现代性**：符合 Next.js 生态系统最佳实践

**测试命令:**
```bash
pnpm test              # 运行所有测试
pnpm test:unit         # 只运行单元测试（就近 + 集中的单元测试）
pnpm test:integration  # 只运行集成测试
pnpm test:coverage     # 生成覆盖率报告
```

**Vitest 配置要点：**
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    include: [
      'src/**/*.test.{js,ts,jsx,tsx}',    // 就近测试
      'tests/integration/**/*.test.{js,ts,jsx,tsx}', // 集成测试
    ],
    exclude: [
      'node_modules',
      'tests/e2e/**',                      // E2E测试单独运行
      'tests/performance/**',
    ],
  },
});
```

### 14.3. 实用测试示例

#### React 组件测试

```typescript
// tests/unit/components/project-form.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectForm } from '~/components/project/project-form';
import { describe, it, expect, vi } from 'vitest';

describe('ProjectForm', () => {
  it('renders form fields correctly', () => {
    render(<ProjectForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/项目名称/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/项目描述/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /创建项目/i })).toBeInTheDocument();
  });

  it('calls onSubmit with form data', async () => {
    const mockSubmit = vi.fn();
    render(<ProjectForm onSubmit={mockSubmit} />);

    await fireEvent.change(screen.getByLabelText(/项目名称/i), {
      target: { value: 'Test Project' }
    });
    await fireEvent.click(screen.getByRole('button', { name: /创建项目/i }));

    expect(mockSubmit).toHaveBeenCalledWith({
      name: 'Test Project',
      description: ''
    });
  });
});
```

#### API 端点测试

```typescript
// tests/integration/api/projects.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { POST, GET } from '~/app/api/projects/route';
import { createTestUser, createTestProject } from '~/tests/utils/factory';

describe('/api/projects', () => {
  beforeEach(async () => {
    // 清理测试数据
    await resetTestDatabase();
  });

  describe('POST /api/projects', () => {
    it('creates a new project', async () => {
      const user = await createTestUser();
      const projectData = {
        name: 'Test Project',
        description: 'A test project'
      };

      const request = new Request('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}`
        },
        body: JSON.stringify(projectData)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe(projectData.name);
      expect(data.slug).toBeDefined();
    });

    it('returns 401 for unauthenticated requests', async () => {
      const request = new Request('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test' })
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/projects', () => {
    it('returns user projects', async () => {
      const user = await createTestUser();
      await createTestProject({ createdBy: user.id });
      await createTestProject({ createdBy: user.id });

      const request = new Request('http://localhost:3000/api/projects', {
        headers: { 'Authorization': `Bearer ${user.id}` }
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
    });
  });
});
```

#### 数据库操作测试

```typescript
// tests/integration/database/projects.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { ProjectService } from '~/server/services/project';

describe('ProjectService', () => {
  let prisma: PrismaClient;
  let projectService: ProjectService;

  beforeEach(async () => {
    prisma = new PrismaClient({
      datasources: {
        db: { url: process.env.TEST_DATABASE_URL }
      }
    });
    projectService = new ProjectService(prisma);
  });

  it('creates project with unique slug', async () => {
    const projectData = {
      name: 'Test Project',
      slug: 'test-project',
      createdBy: 'user-123'
    };

    const project = await projectService.create(projectData);

    expect(project.name).toBe(projectData.name);
    expect(project.slug).toBe(projectData.slug);
    expect(project.id).toBeDefined();
  });

  it('throws error for duplicate slug', async () => {
    const projectData = {
      name: 'Test Project',
      slug: 'duplicate-slug',
      createdBy: 'user-123'
    };

    await projectService.create(projectData);

    await expect(projectService.create(projectData))
      .rejects.toThrow('Unique constraint');
  });
});
```

#### 工具函数测试

```typescript
// tests/unit/utils/error-utils.test.ts
import { describe, it, expect } from 'vitest';
import { formatApiError, createApiError } from '~/lib/errors';

describe('Error Utils', () => {
  describe('formatApiError', () => {
    it('formats Error objects', () => {
      const error = new Error('Test error');
      const formatted = formatApiError(error);

      expect(formatted.message).toBe('Test error');
      expect(formatted.code).toBe('INTERNAL_ERROR');
    });

    it('handles string errors', () => {
      const formatted = formatApiError('Simple error');
      expect(formatted.message).toBe('Simple error');
    });
  });

  describe('createApiError', () => {
    it('creates error with proper structure', () => {
      const error = createApiError('NOT_FOUND', 'Resource not found');

      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toBe('Resource not found');
      expect(error.statusCode).toBe(404);
    });
  });
});
```

### 14.4. 实用的集成测试策略

#### 14.4.1. 测试范围

**API 集成测试**
- REST API 端点的请求-响应测试
- 认证和授权中间件测试
- 数据库操作和事务处理
- 错误处理和状态码验证

**数据库集成测试**
- Prisma 模型和关系测试
- 数据验证和约束测试
- 查询性能和索引测试
- 数据迁移和种子数据测试

#### 14.4.2. 测试环境配置

**开发环境**
```typescript
// tests/setup/development.ts
export const testConfig = {
  database: {
    url: process.env.DATABASE_URL,
    resetBetweenTests: true,
  },
  auth: {
    mockJwt: true, // 开发时使用模拟JWT
  },
  logging: {
    level: 'info',
  }
};
```

**CI 环境**
```typescript
// tests/setup/ci.ts
export const ciConfig = {
  database: {
    url: process.env.TEST_DATABASE_URL,
    resetBetweenTests: true,
  },
  auth: {
    mockJwt: false, // CI中使用真实JWT流程
  },
  reporting: {
    coverage: true,
    junit: true,
  }
};
```

#### 14.4.3. 简单有效的数据管理

**测试数据工厂**

```typescript
// tests/utils/factory.ts
import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

export class TestDataFactory {
  constructor(private prisma: PrismaClient) {}

  async createUser(overrides = {}) {
    return this.prisma.user.create({
      data: {
        email: faker.internet.email(),
        name: faker.person.fullName(),
        passwordHash: 'hashed-password',
        ...overrides,
      },
    });
  }

  async createProject(userId: string, overrides = {}) {
    return this.prisma.project.create({
      data: {
        name: faker.company.name(),
        slug: faker.lorem.slug(),
        createdBy: userId,
        ...overrides,
      },
    });
  }

  async cleanup() {
    // 简单清理：按顺序删除
    await this.prisma.auditLog.deleteMany();
    await this.prisma.projectMember.deleteMany();
    await this.prisma.project.deleteMany();
    await this.prisma.user.deleteMany();
  }
}
```

**Mock 策略**

```typescript
// tests/__mocks__/next-auth.ts
import { vi } from 'vitest';

export const mockNextAuth = {
  getSession: vi.fn(),
  getServerSession: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
};

// tests/__mocks__/prisma.ts
import { vi } from 'vitest';

export const mockPrismaClient = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
  },
  project: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
  },
  $transaction: vi.fn(),
  $disconnect: vi.fn(),
};
```

### 14.5. 简化的 CI/CD 配置

**GitHub Actions**

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install pnpm
        uses: pnpm/action-setup@v3
        with:
          version: 9

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Setup database
        run: |
          pnpm db:push --force-reset
          pnpm db:generate

      - name: Run tests
        run: pnpm test:coverage
        env:
          NODE_ENV: test
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

**这就是全部。**

好的测试策略应该是：
1. **简单** - 容易理解和维护
2. **快速** - 开发时能快速运行
3. **实用** - 测试真正重要的功能

不要被那些花哨的测试框架和复杂的配置分散注意力。专注于编写有效的测试，而不是完美的测试基础设施。

