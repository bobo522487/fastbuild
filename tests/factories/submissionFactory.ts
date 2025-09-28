import { PrismaClient } from '@prisma/client';
import { FormFactory } from './formFactory';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://fastbuild_user:fastbuild_password@172.18.0.2:5432/fastbuild',
    },
  },
});

export interface SubmissionData {
  formId?: string;
  data?: Record<string, any>;
}

export class SubmissionFactory {
  static createBasicData(): Record<string, any> {
    return {
      name: 'Test User',
      email: 'test@example.com',
    };
  }

  static createAdvancedData(): Record<string, any> {
    return {
      name: 'Test User',
      email: 'test@example.com',
      age: 25,
      gender: 'male',
      bio: '这是一个测试用户的个人简介',
    };
  }

  static async create(overrides: SubmissionData = {}): Promise<any> {
    const defaultData = {
      data: this.createBasicData(),
    };

    const data = { ...defaultData, ...overrides };

    // 如果没有提供 formId，创建一个默认表单
    let formId = data.formId;
    if (!formId) {
      const form = await FormFactory.createBasic();
      formId = form.id;
    }

    return prisma.submission.create({
      data: {
        formId,
        data: data.data as any,
      },
    });
  }

  static async createForForm(formId: string, overrides: SubmissionData = {}): Promise<any> {
    return this.create({
      ...overrides,
      formId,
    });
  }

  static async createBasic(overrides: SubmissionData = {}): Promise<any> {
    return this.create({
      ...overrides,
      data: this.createBasicData(),
    });
  }

  static async createAdvanced(overrides: SubmissionData = {}): Promise<any> {
    return this.create({
      ...overrides,
      data: this.createAdvancedData(),
    });
  }

  static async createMany(count: number, overrides: SubmissionData = {}): Promise<any[]> {
    const submissions = [];
    for (let i = 0; i < count; i++) {
      const submission = await this.create({
        ...overrides,
        data: {
          ...this.createBasicData(),
          name: `Test User ${i}`,
          email: `test${i}@example.com`,
          ...overrides.data,
        },
      });
      submissions.push(submission);
    }
    return submissions;
  }

  static async createManyForForm(formId: string, count: number, overrides: SubmissionData = {}): Promise<any[]> {
    const submissions = [];
    for (let i = 0; i < count; i++) {
      const submission = await this.createForForm(formId, {
        ...overrides,
        data: {
          ...this.createBasicData(),
          name: `Test User ${i}`,
          email: `test${i}@example.com`,
          ...overrides.data,
        },
      });
      submissions.push(submission);
    }
    return submissions;
  }
}