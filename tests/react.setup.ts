/**
 * React Testing Library Setup
 * 专门用于React组件测试的配置和工具
 */

import { beforeEach, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// 每个测试后自动清理React组件
afterEach(() => {
  cleanup();
});

// 全局React测试工具
global.ReactTestingLibrary = {
  // 可以在这里添加自定义的React测试工具函数
  mockAuthContext: (user = null) => ({
    user,
    loading: false,
  }),

  mockFormContext: (values = {}) => ({
    values,
    errors: {},
    touched: {},
    isSubmitting: false,
    isValid: true,
  }),

  // 创建测试用的表单字段
  createTestField: (overrides = {}) => ({
    id: 'test-field',
    name: 'testField',
    type: 'text',
    label: 'Test Field',
    required: false,
    placeholder: '',
    ...overrides,
  }),

  // 创建测试用的表单
  createTestForm: (overrides = {}) => ({
    id: 'test-form',
    name: 'Test Form',
    version: '1.0.0',
    fields: [],
    ...overrides,
  }),
};