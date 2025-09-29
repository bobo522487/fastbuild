import { z } from 'zod'

/**
 * 环境检查工具
 */
const isNode = typeof process !== 'undefined' && process.versions && process.versions.node

/**
 * 生成 UUID 的兼容函数
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  // 降级实现
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * Prisma 字段类型到 Zod 类型的映射
 */
export const prismaTypeToZodType = (field: any): z.ZodTypeAny => {
  const { type, isRequired, isList, default: defaultValue, kind } = field

  let zodType: z.ZodTypeAny

  switch (type) {
    case 'String':
      zodType = z.string()
      break
    case 'Int':
      zodType = z.number().int()
      break
    case 'Float':
      zodType = z.number()
      break
    case 'Boolean':
      zodType = z.boolean()
      break
    case 'DateTime':
      zodType = z.date()
      break
    case 'Json':
      zodType = z.record(z.string(), z.unknown())
      break
    case 'Decimal':
      zodType = z.number()
      break
    case 'BigInt':
      zodType = z.bigint()
      break
    case 'Bytes':
      zodType = isNode ? z.instanceof(Buffer) : z.instanceof(Uint8Array)
      break
    default:
      // 处理枚举类型
      if (kind === 'enum' && field.enumValues) {
        const enumValues = field.enumValues.map((v: any) => v.name || v)
        zodType = z.enum(enumValues as [string, ...string[]])
      } else {
        // 对于未知类型，使用 any 类型（生产环境中应该抛出错误）
        zodType = z.any()
      }
  }

  // 处理数组类型
  if (isList) {
    zodType = z.array(zodType)
  }

  // 处理可选字段
  if (!isRequired) {
    zodType = zodType.optional()
  }

  // 处理默认值
  if (defaultValue !== undefined) {
    if (typeof defaultValue === 'object' && defaultValue !== null) {
      // 处理函数类型的默认值
      if ('name' in defaultValue) {
        if (defaultValue.name === 'now') {
          zodType = zodType.default(new Date())
        } else if (defaultValue.name === 'uuid') {
          zodType = zodType.default(generateUUID())
        } else if (defaultValue.name === 'autoincrement') {
          // autoincrement 字段在创建时不需要提供
          zodType = zodType.optional()
        }
      }
    } else {
      zodType = zodType.default(defaultValue)
    }
  }

  return zodType
}

/**
 * 将 Prisma 模型转换为 Zod Schema
 */
export const prismaModelToZodSchema = (modelName: string): z.ZodObject<any> => {
  // 这里需要导入 Prisma DMMF，但由于 Prisma 客户端是在运行时生成的，
  // 我们需要使用一个更安全的方法

  // 对于 FastBuild 项目，我们定义核心模型的 Zod Schema
  const modelSchemas: Record<string, z.ZodObject<any>> = {
    User: z.object({
      id: z.string().min(1).max(100),
      email: z.string().email(),
      name: z.string().optional(),
      image: z.string().url().optional(),
      emailVerified: z.date().optional(),
      passwordHash: z.string().optional(),
      role: z.enum(['ADMIN', 'USER']).default('USER'),
      isActive: z.boolean().default(true),
      createdAt: z.date(),
      updatedAt: z.date(),
    }),

    Form: z.object({
      id: z.string().min(1).max(100),
      name: z.string().min(1, '表单名称不能为空'),
      metadata: z.record(z.string(), z.unknown()),
      createdAt: z.date(),
      updatedAt: z.date(),
    }),

    Submission: z.object({
      id: z.string().min(1).max(100),
      formId: z.string().min(1).max(100),
      data: z.record(z.string(), z.unknown()),
      createdAt: z.date(),
    }),

    Account: z.object({
      id: z.string().min(1).max(100),
      userId: z.string().min(1).max(100),
      type: z.string(),
      provider: z.string(),
      providerAccountId: z.string(),
      refresh_token: z.string().optional(),
      access_token: z.string().optional(),
      expires_at: z.number().optional(),
      token_type: z.string().optional(),
      scope: z.string().optional(),
      id_token: z.string().optional(),
      session_state: z.string().optional(),
    }),

    Session: z.object({
      id: z.string().min(1).max(100),
      sessionToken: z.string(),
      userId: z.string().min(1).max(100),
      expires: z.date(),
    }),

    VerificationToken: z.object({
      identifier: z.string(),
      token: z.string(),
      expires: z.date(),
    }),

    MonitoringEvent: z.object({
      id: z.string().min(1).max(100),
      type: z.string(),
      message: z.string(),
      metadata: z.record(z.string(), z.unknown()).optional(),
      timestamp: z.date(),
      userId: z.string().min(1).max(100).optional(),
    }),

    ErrorLog: z.object({
      id: z.string().min(1).max(100),
      error: z.string(),
      stackTrace: z.string().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
      timestamp: z.date(),
      userId: z.string().min(1).max(100).optional(),
    }),

    PerformanceMetric: z.object({
      id: z.string().min(1).max(100),
      operation: z.string(),
      duration: z.number(),
      metadata: z.record(z.string(), z.unknown()).optional(),
      timestamp: z.date(),
      userId: z.string().min(1).max(100).optional(),
    }),

    UserActivity: z.object({
      id: z.string().min(1).max(100),
      userId: z.string().min(1).max(100),
      action: z.string(),
      resource: z.string().optional(),
      resourceId: z.string().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
      timestamp: z.date(),
    }),
  }

  const schema = modelSchemas[modelName]

  if (!schema) {
    throw new Error(`Unknown model: ${modelName}`)
  }

  return schema
}

/**
 * 创建用于创建记录的 Zod Schema（排除自动生成的字段）
 */
export const prismaModelToCreateSchema = (modelName: string): z.ZodObject<any> => {
  const fullSchema = prismaModelToZodSchema(modelName)

  // 排除自动生成的字段
  const excludedFields = ['id', 'createdAt', 'updatedAt']

  const shape = { ...fullSchema.shape }

  excludedFields.forEach(field => {
    delete shape[field]
  })

  // 特殊处理某些模型
  if (modelName === 'User') {
    // 用户创建时密码是必需的
    shape.passwordHash = z.string().min(8, '密码至少需要8位字符')
    shape.emailVerified = undefined
    shape.isActive = undefined
  }

  return z.object(shape)
}

/**
 * 创建用于更新记录的 Zod Schema（所有字段都是可选的）
 */
export const prismaModelToUpdateSchema = (modelName: string): z.ZodObject<any> => {
  const createSchema = prismaModelToCreateSchema(modelName)

  // 所有字段都是可选的
  const shape: Record<string, z.ZodTypeAny> = {}

  Object.entries(createSchema.shape).forEach(([key, value]) => {
    shape[key] = (value as z.ZodTypeAny).optional()
  })

  return z.object(shape)
}

/**
 * 类型安全的 Prisma 查询构建器
 */
export class PrismaQueryBuilder<T extends Record<string, any>> {
  private schema: z.ZodObject<Record<string, z.ZodTypeAny>>

  constructor(private modelName: string) {
    this.schema = prismaModelToZodSchema(modelName)
  }

  /**
   * 验证创建数据
   */
  validateCreate(data: unknown): T {
    const createSchema = prismaModelToCreateSchema(this.modelName)
    return createSchema.parse(data) as T
  }

  /**
   * 验证更新数据
   */
  validateUpdate(data: unknown): Partial<T> {
    const updateSchema = prismaModelToUpdateSchema(this.modelName)
    return updateSchema.parse(data) as Partial<T>
  }

  /**
   * 验证查询结果
   */
  validateResult(data: unknown): T {
    return this.schema.parse(data) as T
  }

  /**
   * 验证查询结果数组
   */
  validateResults(data: unknown): T[] {
    return z.array(this.schema).parse(data) as T[]
  }
}

/**
 * 创建查询构建器实例
 */
export const createQueryBuilder = <T extends Record<string, any>>(modelName: string) => {
  return new PrismaQueryBuilder<T>(modelName)
}