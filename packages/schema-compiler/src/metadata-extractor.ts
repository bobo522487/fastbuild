/**
 * 元数据提取工具
 * 利用 Zod 4 的 .meta() 方法从编译后的 schema 中提取字段元数据
 */

import { z } from 'zod';

/**
 * 字段元数据接口
 */
export interface FieldMetadata {
  fieldId: string;
  fieldType: string;
  label: string;
  placeholder?: string;
  required: boolean;
  description?: string;
  ui: {
    component: string;
    validation: {
      showError: boolean;
      realtime: boolean;
    };
  };
  business: {
    sensitive: boolean;
    encrypted: boolean;
  };
}

/**
 * 从 Zod Schema 中提取元数据
 */
export function extractMetadata(schema: z.ZodObject<any>): Record<string, FieldMetadata> {
  const metadata: Record<string, FieldMetadata> = {};

  // 遍历 schema 的所有字段
  const shape = schema._def.shape();

  for (const [fieldName, fieldSchema] of Object.entries(shape)) {
    // 尝试从 schema 中获取元数据
    const fieldMetadata = extractFieldMetadata(fieldSchema as z.ZodTypeAny);
    if (fieldMetadata) {
      metadata[fieldName] = fieldMetadata;
    }
  }

  return metadata;
}

/**
 * 从单个字段 schema 中提取元数据
 */
function extractFieldMetadata(schema: z.ZodTypeAny): FieldMetadata | null {
  try {
    // 检查是否有 meta 数据
    if (typeof (schema as any)._def === 'object' && (schema as any)._def) {
      // 尝试获取 meta 数据（Zod 4 的 .meta() 方法存储的数据）
      const meta = (schema as any)._def.meta ||
                  (schema as any)._def.schema?._def?.meta ||
                  (schema as any)._def.left?._def?.meta ||
                  (schema as any)._def.right?._def?.meta;

      if (meta) {
        return meta;
      }
    }

    // 如果是联合类型，检查各个分支
    if ((schema as any)._def.typeName === 'ZodUnion') {
      const options = (schema as any)._def.options;
      for (const option of options) {
        const meta = extractFieldMetadata(option);
        if (meta) {
          return meta;
        }
      }
    }

    // 如果是转换类型，检查内部 schema
    if ((schema as any)._def.typeName === 'ZodEffects') {
      const innerSchema = (schema as any)._def.schema;
      const meta = extractFieldMetadata(innerSchema);
      if (meta) {
        return meta;
      }
    }

    return null;
  } catch (error) {
    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
      console.warn('Failed to extract field metadata:', error);
    }
    return null;
  }
}

/**
 * 生成 UI 组件配置
 */
export function generateUIConfig(metadata: Record<string, FieldMetadata>): Record<string, any> {
  const config: Record<string, any> = {};

  for (const [fieldName, fieldMeta] of Object.entries(metadata)) {
    config[fieldName] = {
      component: fieldMeta.ui.component,
      label: fieldMeta.label,
      placeholder: fieldMeta.placeholder,
      required: fieldMeta.required,
      validation: fieldMeta.ui.validation,
      sensitive: fieldMeta.business.sensitive,
    };
  }

  return config;
}

/**
 * 生成文档字符串
 */
export function generateDocumentation(metadata: Record<string, FieldMetadata>): string {
  let doc = '# 表单字段文档\n\n';

  for (const [fieldName, fieldMeta] of Object.entries(metadata)) {
    doc += `## ${fieldName}\n\n`;
    doc += `- **类型**: ${fieldMeta.fieldType}\n`;
    doc += `- **标签**: ${fieldMeta.label}\n`;
    doc += `- **必填**: ${fieldMeta.required ? '是' : '否'}\n`;

    if (fieldMeta.placeholder) {
      doc += `- **占位符**: ${fieldMeta.placeholder}\n`;
    }

    if (fieldMeta.description) {
      doc += `- **描述**: ${fieldMeta.description}\n`;
    }

    doc += `- **UI 组件**: ${fieldMeta.ui.component}\n`;
    doc += `- **敏感字段**: ${fieldMeta.business.sensitive ? '是' : '否'}\n`;
    doc += `- **加密存储**: ${fieldMeta.business.encrypted ? '是' : '否'}\n\n`;
  }

  return doc;
}

/**
 * 验证元数据完整性
 */
export function validateMetadata(metadata: Record<string, FieldMetadata>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  for (const [fieldName, fieldMeta] of Object.entries(metadata)) {
    // 检查必填字段
    if (!fieldMeta.fieldId) {
      errors.push(`字段 ${fieldName} 缺少 fieldId`);
    }

    if (!fieldMeta.fieldType) {
      errors.push(`字段 ${fieldName} 缺少 fieldType`);
    }

    if (!fieldMeta.label) {
      errors.push(`字段 ${fieldName} 缺少 label`);
    }

    if (!fieldMeta.ui.component) {
      errors.push(`字段 ${fieldName} 缺少 UI 组件配置`);
    }

    // 检查组件类型是否有效
    const validComponents = ['input', 'textarea', 'select', 'checkbox', 'date-picker'];
    if (!validComponents.includes(fieldMeta.ui.component)) {
      errors.push(`字段 ${fieldName} 使用了无效的 UI 组件: ${fieldMeta.ui.component}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// 导出默认
export default {
  extractMetadata,
  generateUIConfig,
  generateDocumentation,
  validateMetadata,
};
