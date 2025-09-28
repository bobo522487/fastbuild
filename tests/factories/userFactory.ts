import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://fastbuild_user:fastbuild_password@172.18.0.2:5432/fastbuild',
    },
  },
});

export interface UserData {
  email?: string;
  name?: string;
  password?: string;
  role?: 'ADMIN' | 'USER';
  isActive?: boolean;
  emailVerified?: Date;
  image?: string;
}

export class UserFactory {
  static async create(overrides: UserData = {}): Promise<any> {
    const timestamp = Date.now();
    const defaultData = {
      email: `test-${timestamp}@example.com`,
      name: 'Test User',
      password: 'testpassword123',
      role: 'USER' as const,
      isActive: true,
      emailVerified: new Date(),
      image: null,
    };

    const data = { ...defaultData, ...overrides };

    // Hash password if provided
    let passwordHash: string | undefined;
    if (data.password) {
      passwordHash = await bcrypt.hash(data.password, 12);
    }

    return prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash,
        role: data.role,
        isActive: data.isActive,
        emailVerified: data.emailVerified,
        image: data.image,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        isActive: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  static async createAdmin(overrides: UserData = {}): Promise<any> {
    return this.create({
      ...overrides,
      email: overrides.email || `admin-${Date.now()}@example.com`,
      name: overrides.name || 'Admin User',
      role: 'ADMIN',
    });
  }

  static async createMany(count: number, overrides: UserData = {}): Promise<any[]> {
    const users = [];
    for (let i = 0; i < count; i++) {
      const user = await this.create({
        ...overrides,
        email: overrides.email || `test-${Date.now()}-${i}@example.com`,
        name: overrides.name || `Test User ${i}`,
      });
      users.push(user);
    }
    return users;
  }
}