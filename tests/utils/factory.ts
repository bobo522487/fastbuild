import { faker } from '@faker-js/faker';

export interface TestUser {
  id?: string;
  email: string;
  name: string;
  password: string;
  emailVerified?: Date;
  image?: string;
}

export interface TestProject {
  id?: string;
  name: string;
  slug: string;
  description?: string;
  visibility: 'PRIVATE' | 'PUBLIC';
  createdAt?: Date;
  updatedAt?: Date;
  ownerId: string;
}

export class TestDataFactory {
  /**
   * 创建测试用户数据
   */
  static createTestUser(overrides: Partial<TestUser> = {}): TestUser {
    return {
      email: faker.internet.email({
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        provider: 'gmail.com',
      }),
      name: faker.person.fullName(),
      password: faker.internet.password({ length: 12, memorable: false }),
      emailVerified: faker.date.past(),
      image: faker.internet.avatar(),
      ...overrides,
    };
  }

  /**
   * 创建测试项目数据
   */
  static createTestProject(overrides: Partial<TestProject> = {}): TestProject {
    const baseName = faker.company.name();
    const slug = baseName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

    return {
      name: baseName,
      slug: slug,
      description: faker.lorem.sentence(),
      visibility: 'PRIVATE',
      createdAt: faker.date.recent(),
      updatedAt: faker.date.recent(),
      ...overrides,
    };
  }

  /**
   * 创建批量测试用户
   */
  static createTestUsers(count: number, overrides: Partial<TestUser> = {}): TestUser[] {
    return Array.from({ length: count }, () => this.createTestUser(overrides));
  }

  /**
   * 创建批量测试项目
   */
  static createTestProjects(count: number, ownerId: string, overrides: Partial<TestProject> = {}): TestProject[] {
    return Array.from({ length: count }, () =>
      this.createTestProject({ ownerId, ...overrides })
    );
  }

  /**
   * 创建有效的项目slug
   */
  static createValidSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * 创建测试用的认证令牌
   */
  static createTestToken(): string {
    return `test_token_${faker.string.uuid()}`;
  }

  /**
   * 创建会话数据
   */
  static createTestSession(userId: string, overrides: Partial<any> = {}) {
    return {
      id: faker.string.uuid(),
      sessionToken: faker.string.uuid(),
      userId,
      expires: faker.date.future(),
      ...overrides,
    };
  }
}