// 单元测试设置
import { vi, describe, it, test, expect } from 'vitest';

// 导入统一的模拟配置
import { setupDatabaseMocks } from '../mocks/database';
import { setupAuthMocks } from '../mocks/auth';
import { setupReactMocks } from '../mocks/react';

// 模拟环境变量
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/fastbuild_test';
process.env.JWT_SECRET = 'test-jwt-secret';

// 模拟 console 方法
console.log = vi.fn();
console.error = vi.fn();
console.warn = vi.fn();
console.info = vi.fn();

// 设置统一的模拟
setupDatabaseMocks();
setupAuthMocks();
setupReactMocks();

// 全局测试变量
global.describe = describe;
global.it = it;
global.test = test;
global.expect = expect;
global.vi = vi;