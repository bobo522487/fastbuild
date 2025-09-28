import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://fastbuild_user:fastbuild_password@172.18.0.2:5432/fastbuild',
    },
  },
});

export interface FormField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'select' | 'date' | 'checkbox' | 'textarea';
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: { label: string; value: string }[];
  condition?: {
    fieldId: string;
    operator: 'equals' | 'not_equals';
    value: any;
  };
  defaultValue?: any;
}

export interface FormMetadata {
  version: string;
  fields: FormField[];
}

export interface FormData {
  name?: string;
  description?: string;
  metadata?: FormMetadata;
}

export class FormFactory {
  static createBasicMetadata(): FormMetadata {
    return {
      version: '1.0.0',
      fields: [
        {
          id: 'name',
          name: 'name',
          type: 'text',
          label: '姓名',
          placeholder: '请输入您的姓名',
          required: true,
        },
        {
          id: 'email',
          name: 'email',
          type: 'text',
          label: '邮箱',
          placeholder: '请输入您的邮箱',
          required: true,
        },
      ],
    };
  }

  static createAdvancedMetadata(): FormMetadata {
    return {
      version: '1.0.0',
      fields: [
        {
          id: 'name',
          name: 'name',
          type: 'text',
          label: '姓名',
          required: true,
        },
        {
          id: 'email',
          name: 'email',
          type: 'text',
          label: '邮箱',
          required: true,
        },
        {
          id: 'age',
          name: 'age',
          type: 'number',
          label: '年龄',
          required: false,
        },
        {
          id: 'gender',
          name: 'gender',
          type: 'select',
          label: '性别',
          required: false,
          options: [
            { label: '男', value: 'male' },
            { label: '女', value: 'female' },
            { label: '其他', value: 'other' },
          ],
        },
        {
          id: 'bio',
          name: 'bio',
          type: 'textarea',
          label: '个人简介',
          required: false,
        },
      ],
    };
  }

  static async create(overrides: FormData = {}): Promise<any> {
    const timestamp = Date.now();
    const defaultData = {
      name: `Test Form ${timestamp}`,
      description: 'Test form description',
      metadata: this.createBasicMetadata(),
    };

    const data = { ...defaultData, ...overrides };

    return prisma.form.create({
      data: {
        name: data.name!,
        description: data.description!,
        metadata: data.metadata as any,
      },
    });
  }

  static async createBasic(overrides: FormData = {}): Promise<any> {
    return this.create({
      ...overrides,
      metadata: this.createBasicMetadata(),
    });
  }

  static async createAdvanced(overrides: FormData = {}): Promise<any> {
    return this.create({
      ...overrides,
      name: overrides.name || `Advanced Form ${Date.now()}`,
      metadata: this.createAdvancedMetadata(),
    });
  }

  static async createMany(count: number, overrides: FormData = {}): Promise<any[]> {
    const forms = [];
    for (let i = 0; i < count; i++) {
      const form = await this.create({
        ...overrides,
        name: overrides.name || `Test Form ${Date.now()}-${i}`,
      });
      forms.push(form);
    }
    return forms;
  }
}