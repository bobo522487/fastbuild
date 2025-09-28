import { trpc } from '@/trpc/provider';
import { withRetry, formatTRPCError, getUserFriendlyMessage } from '@/trpc/error-handling';
import type { AppRouter } from '@workspace/api';

/**
 * 类型安全的 API 客户端
 * 提供统一的错误处理和重试机制
 */
export class ApiClient {
  /**
   * 表单管理 API
   */
  static form = {
    /**
     * 获取表单列表
     */
    list: async (input?: Parameters<typeof trpc.form.list.query>[0]) => {
      return await withRetry(() => trpc.form.list.query(input));
    },

    /**
     * 根据ID获取表单
     */
    getById: async (input: Parameters<typeof trpc.form.getById.query>[0]) => {
      return await withRetry(() => trpc.form.getById.query(input));
    },

    /**
     * 创建表单
     */
    create: async (input: Parameters<typeof trpc.form.create.mutate>[0]) => {
      return await withRetry(() => trpc.form.create.mutate(input));
    },

    /**
     * 更新表单
     */
    update: async (input: Parameters<typeof trpc.form.update.mutate>[0]) => {
      return await withRetry(() => trpc.form.update.mutate(input));
    },

    /**
     * 删除表单
     */
    delete: async (input: Parameters<typeof trpc.form.delete.mutate>[0]) => {
      return await withRetry(() => trpc.form.delete.mutate(input));
    },

    /**
     * 获取表单提交数据
     */
    getSubmissions: async (input: Parameters<typeof trpc.form.getSubmissions.query>[0]) => {
      return await withRetry(() => trpc.form.getSubmissions.query(input));
    },
  };

  /**
   * 认证 API
   */
  static auth = {
    /**
     * 用户登录
     */
    login: async (input: Parameters<typeof trpc.auth.login.mutate>[0]) => {
      return await withRetry(() => trpc.auth.login.mutate(input));
    },

    /**
     * 用户注册
     */
    register: async (input: Parameters<typeof trpc.auth.register.mutate>[0]) => {
      return await withRetry(() => trpc.auth.register.mutate(input));
    },

    /**
     * 刷新令牌
     */
    refreshToken: async (input: Parameters<typeof trpc.auth.refreshToken.mutate>[0]) => {
      return await withRetry(() => trpc.auth.refreshToken.mutate(input));
    },

    /**
     * 获取当前用户信息
     */
    me: async () => {
      return await withRetry(() => trpc.auth.me.query());
    },

    /**
     * 更新用户资料
     */
    updateProfile: async (input: Parameters<typeof trpc.auth.updateProfile.mutate>[0]) => {
      return await withRetry(() => trpc.auth.updateProfile.mutate(input));
    },

    /**
     * 修改密码
     */
    changePassword: async (input: Parameters<typeof trpc.auth.changePassword.mutate>[0]) => {
      return await withRetry(() => trpc.auth.changePassword.mutate(input));
    },

    /**
     * 用户登出
     */
    logout: async () => {
      return await withRetry(() => trpc.auth.logout.mutate());
    },

    /**
     * 创建用户（管理员功能）
     */
    createUser: async (input: Parameters<typeof trpc.auth.createUser.mutate>[0]) => {
      return await withRetry(() => trpc.auth.createUser.mutate(input));
    },

    /**
     * 获取用户列表（管理员功能）
     */
    listUsers: async (input?: Parameters<typeof trpc.auth.listUsers.query>[0]) => {
      return await withRetry(() => trpc.auth.listUsers.query(input));
    },
  };

  /**
   * 表单提交 API
   */
  static submission = {
    /**
     * 提交表单
     */
    create: async (input: Parameters<typeof trpc.submission.create.mutate>[0]) => {
      return await withRetry(() => trpc.submission.create.mutate(input));
    },

    /**
     * 获取提交详情
     */
    getById: async (input: Parameters<typeof trpc.submission.getById.query>[0]) => {
      return await withRetry(() => trpc.submission.getById.query(input));
    },

    /**
     * 根据表单ID获取提交列表
     */
    getByFormId: async (input: Parameters<typeof trpc.submission.getByFormId.query>[0]) => {
      return await withRetry(() => trpc.submission.getByFormId.query(input));
    },

    /**
     * 更新提交
     */
    update: async (input: Parameters<typeof trpc.submission.update.mutate>[0]) => {
      return await withRetry(() => trpc.submission.update.mutate(input));
    },

    /**
     * 删除提交
     */
    delete: async (input: Parameters<typeof trpc.submission.delete.mutate>[0]) => {
      return await withRetry(() => trpc.submission.delete.mutate(input));
    },

    /**
     * 获取提交统计
     */
    getStats: async (input: Parameters<typeof trpc.submission.getStats.query>[0]) => {
      return await withRetry(() => trpc.submission.getStats.query(input));
    },

    /**
     * 批量删除提交
     */
    bulkDelete: async (input: Parameters<typeof trpc.submission.bulkDelete.mutate>[0]) => {
      return await withRetry(() => trpc.submission.bulkDelete.mutate(input));
    },
  };

  /**
   * 健康检查 API
   */
  static health = {
    /**
     * 基础健康检查
     */
    check: async () => {
      return await withRetry(() => trpc.health.check.query());
    },

    /**
     * 数据库健康检查
     */
    database: async () => {
      return await withRetry(() => trpc.health.database.query());
    },

    /**
     * 系统信息
     */
    info: async () => {
      return await withRetry(() => trpc.health.info.query());
    },
  };

  /**
   * Schema 编译 API
   */
  static schema = {
    /**
     * 编译表单 Schema
     */
    compile: async (input: Parameters<typeof trpc.schema.compile.mutate>[0]) => {
      return await withRetry(() => trpc.schema.compile.mutate(input));
    },

    /**
     * 验证表单数据
     */
    validate: async (input: Parameters<typeof trpc.schema.validate.mutate>[0]) => {
      return await withRetry(() => trpc.schema.validate.mutate(input));
    },

    /**
     * 获取字段类型定义
     */
    getFieldTypes: async () => {
      return await withRetry(() => trpc.schema.getFieldTypes.query());
    },
  };
}

/**
 * API 错误包装器
 * 提供更好的错误处理和用户友好的错误消息
 */
export class ApiErrorWrapper extends Error {
  public readonly code: string;
  public readonly details?: any;
  public readonly isRetryable: boolean;

  constructor(
    public readonly originalError: any,
    public readonly userMessage: string
  ) {
    super(userMessage);
    this.name = 'ApiErrorWrapper';

    const formattedError = formatTRPCError(originalError);
    this.code = formattedError.code;
    this.details = formattedError.details;
    this.isRetryable = formattedError.isRetryable;
  }

  /**
   * 创建错误包装器实例
   */
  static fromError(error: any): ApiErrorWrapper {
    const userMessage = getUserFriendlyMessage(formatTRPCError(error));
    return new ApiErrorWrapper(error, userMessage);
  }

  /**
   * 检查是否为特定错误类型
   */
  isErrorCode(code: string): boolean {
    return this.code === code;
  }

  /**
   * 检查是否为认证错误
   */
  isAuthError(): boolean {
    return this.code === 'UNAUTHORIZED' || this.code === 'FORBIDDEN';
  }

  /**
   * 检查是否为网络错误
   */
  isNetworkError(): boolean {
    return this.code === 'NETWORK_ERROR' || this.code === 'TIMEOUT_ERROR';
  }
}

/**
 * 带错误处理的 API 调用包装器
 */
export async function safeApiCall<T>(
  apiCall: () => Promise<T>
): Promise<{ success: true; data: T } | { success: false; error: ApiErrorWrapper }> {
  try {
    const data = await apiCall();
    return { success: true, data };
  } catch (error) {
    const wrappedError = ApiErrorWrapper.fromError(error);
    return { success: false, error: wrappedError };
  }
}

/**
 * React Hook 用于安全 API 调用
 */
export function useSafeApiCall() {
  return { safeApiCall, ApiErrorWrapper };
}