# FastBuild 视图定义 JSON Schema v4.0

**项目:** fastbuild
**日期:** 2025-10-11
**版本:** v4.0
**规范类型:** JSON Schema Definition

---

## 概述

本文档定义了 FastBuild v4.0 安全视图系统的完整 JSON Schema，确保用户提交的视图定义符合安全标准并通过严格验证。

### 设计目标

1. **类型安全**: TypeScript 类型同步验证
2. **安全约束**: 防止 SQL 注入和恶意操作
3. **结构化验证**: 强制使用枚举化运算符
4. **开发友好**: 清晰的错误提示和文档

---

## 核心 JSON Schema

### 完整 Schema 定义

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://fastbuild.com/schemas/view-definition-v4.json",
  "title": "FastBuild 安全视图定义",
  "description": "安全、结构化的视图定义，防止 SQL 注入并提供强大的查询能力",
  "type": "object",
  "required": ["columns"],
  "properties": {
    "columns": {
      "type": "array",
      "description": "视图的列定义，必须包含至少一列",
      "items": {
        "$ref": "#/$defs/ViewColumn"
      },
      "minItems": 1,
      "maxItems": 50
    },
    "filters": {
      "type": "array",
      "description": "过滤条件定义",
      "items": {
        "$ref": "#/$defs/ViewFilter"
      },
      "maxItems": 20
    },
    "groups": {
      "type": "array",
      "description": "分组字段列表",
      "items": {
        "$ref": "#/$defs/Identifier"
      },
      "maxItems": 10,
      "uniqueItems": true
    },
    "orders": {
      "type": "array",
      "description": "排序规则定义",
      "items": {
        "$ref": "#/$defs/ViewOrder"
      },
      "maxItems": 10
    },
    "limit": {
      "type": "integer",
      "description": "结果集限制数量",
      "minimum": 1,
      "maximum": 10000
    },
    "offset": {
      "type": "integer",
      "description": "结果集偏移量",
      "minimum": 0,
      "maximum": 100000
    }
  },
  "allOf": [
    {
      "$ref": "#/$defs/AggregationConsistencyValidation"
    }
  ],
  "$defs": {
    "ViewColumn": {
      "type": "object",
      "description": "视图列定义",
      "required": ["source"],
      "properties": {
        "source": {
          "$ref": "#/$defs/Identifier",
          "description": "源列名，必须存在于基础表中"
        },
        "alias": {
          "$ref": "#/$defs/Identifier",
          "description": "列别名，用于重命名输出列"
        },
        "aggregate": {
          "$ref": "#/$defs/AggregateOperator",
          "description": "聚合函数，用于统计分析"
        }
      },
      "additionalProperties": false
    },
    "ViewFilter": {
      "type": "object",
      "description": "视图过滤条件",
      "required": ["field", "operator"],
      "properties": {
        "field": {
          "$ref": "#/$defs/Identifier",
          "description": "过滤字段名"
        },
        "operator": {
          "$ref": "#/$defs/ComparisonOperator",
          "description": "比较运算符"
        },
        "value": {
          "description": "过滤值，类型根据运算符而定",
          "oneOf": [
            {
              "type": "string"
            },
            {
              "type": "number"
            },
            {
              "type": "boolean"
            },
            {
              "type": "array"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "allOf": [
        {
          "$ref": "#/$defs/FilterValueConsistency"
        }
      ],
      "additionalProperties": false
    },
    "ViewOrder": {
      "type": "object",
      "description": "排序规则定义",
      "required": ["field", "direction"],
      "properties": {
        "field": {
          "$ref": "#/$defs/Identifier",
          "description": "排序字段名"
        },
        "direction": {
          "type": "string",
          "enum": ["asc", "desc"],
          "description": "排序方向"
        }
      },
      "additionalProperties": false
    },
    "Identifier": {
      "type": "string",
      "description": "安全的标识符（表名、列名等）",
      "pattern": "^[a-zA-Z_][a-zA-Z0-9_]{0,62}$",
      "minLength": 1,
      "maxLength": 63
    },
    "AggregateOperator": {
      "type": "string",
      "description": "聚合运算符",
      "enum": [
        "COUNT",
        "SUM",
        "AVG",
        "MIN",
        "MAX"
      ]
    },
    "ComparisonOperator": {
      "type": "string",
      "description": "比较运算符",
      "enum": [
        "=",
        "!=",
        ">",
        ">=",
        "<",
        "<=",
        "LIKE",
        "IN",
        "NOT IN",
        "IS NULL",
        "IS NOT NULL"
      ]
    },
    "AggregationConsistencyValidation": {
      "description": "验证聚合函数和分组的一致性",
      "type": "object",
      "properties": {
        "columns": {
          "type": "array"
        },
        "groups": {
          "type": "array"
        }
      },
      "required": ["columns"],
      "if": {
        "properties": {
          "columns": {
            "type": "array",
            "items": {
              "properties": {
                "aggregate": {
                  "type": "string"
                }
              }
            }
          }
        }
      },
      "then": {
        "properties": {
          "columns": {
            "type": "array",
            "minItems": 1
          },
          "groups": {
            "type": "array"
          }
        },
        "anyOf": [
          {
            "properties": {
              "columns": {
                "type": "array",
                "items": {
                  "not": {
                    "properties": {
                      "aggregate": {
                        "type": "string"
                      }
                    },
                    "required": ["aggregate"]
                  }
                }
              }
            }
          },
          {
            "properties": {
              "groups": {
                "type": "array",
                "minItems": 1
              }
            },
            "required": ["groups"]
          }
        ]
      }
    },
    "FilterValueConsistency": {
      "description": "验证过滤条件与值的一致性",
      "type": "object",
      "properties": {
        "operator": {
          "type": "string"
        },
        "value": {}
      },
      "required": ["operator"],
      "if": {
        "properties": {
          "operator": {
            "enum": ["IS NULL", "IS NOT NULL"]
          }
        }
      },
      "then": {
        "not": {
          "required": ["value"]
        }
      },
      "else": {
        "required": ["value"]
      }
    }
  }
}
```

---

## TypeScript 类型定义

### 核心接口

```typescript
/**
 * 安全视图定义接口
 */
export interface SafeViewDefinition {
  /** 视图的列定义，必须包含至少一列 */
  columns: ViewColumn[];

  /** 过滤条件定义 */
  filters?: ViewFilter[];

  /** 分组字段列表 */
  groups?: string[];

  /** 排序规则定义 */
  orders?: ViewOrder[];

  /** 结果集限制数量 */
  limit?: number;

  /** 结果集偏移量 */
  offset?: number;
}

/**
 * 视图列定义
 */
export interface ViewColumn {
  /** 源列名，必须存在于基础表中 */
  source: string;

  /** 列别名，用于重命名输出列 */
  alias?: string;

  /** 聚合函数，用于统计分析 */
  aggregate?: AggregateOperator;
}

/**
 * 视图过滤条件
 */
export interface ViewFilter {
  /** 过滤字段名 */
  field: string;

  /** 比较运算符 */
  operator: ComparisonOperator;

  /** 过滤值，类型根据运算符而定 */
  value?: any;
}

/**
 * 排序规则定义
 */
export interface ViewOrder {
  /** 排序字段名 */
  field: string;

  /** 排序方向 */
  direction: 'asc' | 'desc';
}

/**
 * 聚合运算符枚举
 */
export enum AggregateOperator {
  COUNT = 'COUNT',
  SUM = 'SUM',
  AVG = 'AVG',
  MIN = 'MIN',
  MAX = 'MAX'
}

/**
 * 比较运算符枚举
 */
export enum ComparisonOperator {
  EQUALS = '=',
  NOT_EQUALS = '!=',
  GREATER_THAN = '>',
  GREATER_EQUAL = '>=',
  LESS_THAN = '<',
  LESS_EQUAL = '<=',
  LIKE = 'LIKE',
  IN = 'IN',
  NOT_IN = 'NOT IN',
  IS_NULL = 'IS NULL',
  IS_NOT_NULL = 'IS NOT NULL'
}
```

### Zod 验证 Schema

```typescript
import { z } from 'zod';

/**
 * 标识符验证：只允许字母、数字、下划线，以字母开头
 */
const IdentifierSchema = z.string()
  .min(1)
  .max(63)
  .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Invalid identifier format');

/**
 * 聚合运算符验证
 */
const AggregateOperatorSchema = z.enum([
  'COUNT',
  'SUM',
  'AVG',
  'MIN',
  'MAX'
]);

/**
 * 比较运算符验证
 */
const ComparisonOperatorSchema = z.enum([
  '=',
  '!=',
  '>',
  '>=',
  '<',
  '<=',
  'LIKE',
  'IN',
  'NOT IN',
  'IS NULL',
  'IS NOT NULL'
]);

/**
 * 视图列定义验证
 */
const ViewColumnSchema = z.object({
  source: IdentifierSchema,
  alias: IdentifierSchema.optional(),
  aggregate: AggregateOperatorSchema.optional()
}).strict();

/**
 * 视图过滤条件验证
 */
const ViewFilterSchema = z.object({
  field: IdentifierSchema,
  operator: ComparisonOperatorSchema,
  value: z.any().optional()
}).strict().superRefine((data, ctx) => {
  // IS NULL 和 IS NOT NULL 不应该有值
  if ((data.operator === 'IS NULL' || data.operator === 'IS NOT NULL') && data.value !== undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${data.operator} operator should not have a value`
    });
  }

  // 其他运算符必须有值
  if (data.operator !== 'IS NULL' && data.operator !== 'IS NOT NULL' && data.value === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${data.operator} operator requires a value`
    });
  }
});

/**
 * 视图排序规则验证
 */
const ViewOrderSchema = z.object({
  field: IdentifierSchema,
  direction: z.enum(['asc', 'desc'])
}).strict();

/**
 * 完整的视图定义验证 Schema
 */
export const SafeViewDefinitionSchema = z.object({
  columns: z.array(ViewColumnSchema).min(1).max(50),
  filters: z.array(ViewFilterSchema).max(20).optional(),
  groups: z.array(IdentifierSchema).max(10).optional(),
  orders: z.array(ViewOrderSchema).max(10).optional(),
  limit: z.number().int().min(1).max(10000).optional(),
  offset: z.number().int().min(0).max(100000).optional()
}).strict().superRefine((data, ctx) => {
  // 验证聚合函数和分组的一致性
  const hasAggregates = data.columns.some(col => col.aggregate);
  const hasGroups = data.groups && data.groups.length > 0;

  // 如果有聚合函数但没有分组，且有多列，则报错
  if (hasAggregates && !hasGroups && data.columns.length > 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'When using aggregate functions with multiple columns, GROUP BY must be specified'
    });
  }
});

// 导出类型
export type SafeViewDefinition = z.infer<typeof SafeViewDefinitionSchema>;
export type ViewColumn = z.infer<typeof ViewColumnSchema>;
export type ViewFilter = z.infer<typeof ViewFilterSchema>;
export type ViewOrder = z.infer<typeof ViewOrderSchema>;
```

---

## 使用示例

### 基础查询示例

```json
{
  "columns": [
    {
      "source": "name",
      "alias": "customer_name"
    },
    {
      "source": "email"
    },
    {
      "source": "status"
    }
  ],
  "filters": [
    {
      "field": "status",
      "operator": "=",
      "value": "active"
    },
    {
      "field": "created_at",
      "operator": ">=",
      "value": "2024-01-01"
    }
  ],
  "orders": [
    {
      "field": "name",
      "direction": "asc"
    }
  ],
  "limit": 100,
  "offset": 0
}
```

### 聚合查询示例

```json
{
  "columns": [
    {
      "source": "status",
      "alias": "customer_status"
    },
    {
      "source": "id",
      "aggregate": "COUNT",
      "alias": "total_customers"
    },
    {
      "source": "priority",
      "aggregate": "AVG",
      "alias": "avg_priority"
    }
  ],
  "filters": [
    {
      "field": "priority",
      "operator": ">",
      "value": 5
    }
  ],
  "groups": ["status"],
  "orders": [
    {
      "field": "avg_priority",
      "direction": "desc"
    }
  ],
  "limit": 50
}
```

### 复杂过滤示例

```json
{
  "columns": [
    {
      "source": "name"
    },
    {
      "source": "email"
    },
    {
      "source": "priority"
    }
  ],
  "filters": [
    {
      "field": "status",
      "operator": "IN",
      "value": ["active", "premium"]
    },
    {
      "field": "priority",
      "operator": ">=",
      "value": 7
    },
    {
      "field": "email",
      "operator": "LIKE",
      "value": "%@company.com"
    },
    {
      "field": "deleted_at",
      "operator": "IS NULL"
    }
  ],
  "orders": [
    {
      "field": "priority",
      "direction": "desc"
    },
    {
      "field": "name",
      "direction": "asc"
    }
  ]
}
```

---

## 验证实现

### 服务器端验证

```typescript
import { SafeViewDefinitionSchema } from './schemas';

export const validateViewDefinition = (input: unknown): SafeViewDefinition => {
  try {
    return SafeViewDefinitionSchema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // 格式化错误信息
      const formattedErrors = error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message,
        code: err.code
      }));

      throw new ValidationError('Invalid view definition', formattedErrors);
    }
    throw error;
  }
};
```

### 客户端验证

```typescript
// React Hook Form 集成
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SafeViewDefinitionSchema } from './schemas';

export const useViewDefinitionForm = () => {
  return useForm<SafeViewDefinition>({
    resolver: zodResolver(SafeViewDefinitionSchema),
    defaultValues: {
      columns: [{ source: '' }],
      filters: [],
      groups: [],
      orders: [],
      limit: 100,
      offset: 0
    }
  });
};
```

---

## 安全约束

### 输入验证约束

1. **标识符约束**：
   - 长度：1-63 字符
   - 字符集：字母、数字、下划线
   - 起始字符：必须是字母或下划线
   - 禁止字符：特殊符号、空格、中文等

2. **数组约束**：
   - 列定义：1-50 项
   - 过滤条件：最多 20 项
   - 分组字段：最多 10 项
   - 排序规则：最多 10 项

3. **数值约束**：
   - 限制数量：1-10000
   - 偏移量：0-100000
   - 防止过大值导致性能问题

### 业务逻辑约束

1. **聚合一致性**：
   - 使用聚合函数时必须指定分组
   - 单列聚合可以无分组
   - 多列聚合必须有分组

2. **过滤条件一致性**：
   - IS NULL/IS NOT NULL 不应有值
   - 其他运算符必须有值
   - IN/NOT IN 的值必须是数组

3. **列存在性验证**：
   - 所有引用的列必须存在于基础表
   - 禁止访问系统字段
   - 防止列名冲突

---

## 错误处理

### 验证错误格式

```typescript
interface ValidationError {
  path: string;
  message: string;
  code: string;
}

interface ViewDefinitionValidationResult {
  success: boolean;
  data?: SafeViewDefinition;
  errors?: ValidationError[];
}
```

### 常见错误示例

```json
{
  "success": false,
  "errors": [
    {
      "path": "columns.0.source",
      "message": "Invalid identifier format",
      "code": "invalid_string"
    },
    {
      "path": "filters.0",
      "message": "IS NULL operator should not have a value",
      "code": "custom"
    },
    {
      "path": "",
      "message": "When using aggregate functions with multiple columns, GROUP BY must be specified",
      "code": "custom"
    }
  ]
}
```

---

## 性能考虑

### 查询优化

1. **限制条件**：
   - 最大返回行数：10000
   - 最大过滤条件：20
   - 防止复杂查询导致性能问题

2. **索引建议**：
   - 过滤字段建议创建索引
   - 排序字段建议创建索引
   - 分组字段建议创建索引

3. **执行计划**：
   - 复杂查询需要执行计划分析
   - 避免全表扫描
   - 监控查询执行时间

### 缓存策略

```typescript
// 视图定义缓存
const viewDefinitionCache = new Map<string, SafeViewDefinition>();

const getCachedViewDefinition = (id: string): SafeViewDefinition | undefined => {
  return viewDefinitionCache.get(id);
};

const cacheViewDefinition = (id: string, definition: SafeViewDefinition): void => {
  viewDefinitionCache.set(id, definition);
};
```

---

## 版本兼容性

### Schema 版本控制

- **当前版本**: v4.0
- **向后兼容**: 支持 v3.x 格式转换
- **前向兼容**: 预留扩展字段
- **迁移策略**: 自动格式升级

### 变更日志

#### v4.0.0 (2025-10-11)
- ✅ 新增安全 JSON Schema
- ✅ 枚举化运算符支持
- ✅ 严格的类型验证
- ✅ 聚合一致性验证
- ✅ 过滤条件一致性验证

#### 未来计划
- 🔄 支持子查询
- 🔄 支持窗口函数
- 🔄 支持连接查询
- 🔄 支持复杂表达式

---

**FastBuild 视图定义 JSON Schema v4.0** - 安全、类型化、高性能的视图定义标准。

*本规范与安全指南同步更新，确保系统安全性和功能完整性的平衡。*