import { describe, it, expect } from 'vitest';

describe('数据库连接单元测试', () => {
  describe('prisma 实例导出', () => {
    it('应该导出 prisma 实例', () => {
      const { prisma } = require('@workspace/database');
      expect(prisma).toBeDefined();
    });

    it('应该具有数据库连接的基本结构', () => {
      const { prisma } = require('@workspace/database');

      // 验证基本属性存在
      expect(prisma).toHaveProperty('user');
      expect(prisma).toHaveProperty('form');
      expect(prisma).toHaveProperty('submission');
      expect(prisma).toHaveProperty('userSession');
    });
  });

  describe('数据模型访问', () => {
    it('应该提供用户模型访问', () => {
      const { prisma } = require('@workspace/database');

      expect(prisma.user).toBeDefined();
      expect(typeof prisma.user).toBe('object');
    });

    it('应该提供表单模型访问', () => {
      const { prisma } = require('@workspace/database');

      expect(prisma.form).toBeDefined();
      expect(typeof prisma.form).toBe('object');
    });

    it('应该提供提交模型访问', () => {
      const { prisma } = require('@workspace/database');

      expect(prisma.submission).toBeDefined();
      expect(typeof prisma.submission).toBe('object');
    });

    it('应该提供用户会话模型访问', () => {
      const { prisma } = require('@workspace/database');

      expect(prisma.userSession).toBeDefined();
      expect(typeof prisma.userSession).toBe('object');
    });
  });

  describe('模块导出', () => {
    it('应该正确导出 prisma 实例', () => {
      const { prisma } = require('@workspace/database');

      // 验证导出的是一个对象
      expect(typeof prisma).toBe('object');
      expect(prisma).not.toBeNull();
    });

    it('应该具有预期的模型结构', () => {
      const { prisma } = require('@workspace/database');

      // 验证所有预期的模型都存在
      const expectedModels = ['user', 'form', 'submission', 'userSession'];
      expectedModels.forEach(model => {
        expect(prisma).toHaveProperty(model);
      });
    });
  });

  describe('类型安全', () => {
    it('应该保持类型安全', () => {
      // 这个测试主要确保 TypeScript 编译通过
      const { prisma } = require('@workspace/database');

      // 验证我们可以访问模型而不抛出运行时错误
      expect(() => {
        prisma.user;
        prisma.form;
        prisma.submission;
        prisma.userSession;
      }).not.toThrow();
    });
  });
});