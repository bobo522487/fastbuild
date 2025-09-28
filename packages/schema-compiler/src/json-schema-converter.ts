/**
 * JSON Schema 转换器
 * 由于 Zod 4 的 toJSONSchema() 方法可能不可用，我们手动实现转换功能
 */

import { z } from 'zod';
import { FormMetadata, FormField } from '@workspace/types';

/**
 * JSON Schema 类型定义
 */
export interface JsonSchema {
  $schema?: string;
  $id?: string;
  title?: string;
  description?: string;
  type?: 'object' | 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'null';
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean;
  definitions?: Record<string, JsonSchema>;
  oneOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  allOf?: JsonSchema[];
  not?: JsonSchema;
  enum?: any[];
  const?: any;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
  format?: string;
  items?: JsonSchema | JsonSchema[];
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  default?: any;
  examples?: any[];
  readOnly?: boolean;
  writeOnly?: boolean;
  deprecated?: boolean;
}

/**
 * JSON Schema 转换器类
 */
export class JsonSchemaConverter {
  /**
   * 将 FormMetadata 转换为 JSON Schema
   */
  convertFormMetadataToJsonSchema(metadata: FormMetadata, options: {
    title?: string;
    description?: string;
    includeExamples?: boolean;
    strictMode?: boolean;
  } = {}): JsonSchema {
    const {
      title = `Form Schema - ${metadata.version}`,
      description = `Form metadata version ${metadata.version}`,
      includeExamples = true,
      strictMode = false
    } = options;

    const properties: Record<string, JsonSchema> = {};
    const required: string[] = [];

    // 转换每个字段
    for (const field of metadata.fields) {
      const fieldSchema = this.convertFieldToJsonSchema(field, includeExamples);
      properties[field.name] = fieldSchema;

      if (field.required) {
        required.push(field.name);
      }
    }

    const jsonSchema: JsonSchema = {
      $schema: 'http://json-schema.org/draft-07/schema#',
      $id: `#/schemas/form/${metadata.version.replace(/\./g, '-')}`,
      title,
      description,
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
      additionalProperties: strictMode ? false : true,
    };

    // 添加默认值（如果有）
    if (includeExamples) {
      const examples = this.generateExamples(metadata);
      if (examples.length > 0) {
        (jsonSchema as any).examples = examples;
      }
    }

    return jsonSchema;
  }

  /**
   * 将单个字段转换为 JSON Schema
   */
  private convertFieldToJsonSchema(field: FormField, includeExamples: boolean): JsonSchema {
    const baseSchema: JsonSchema = {
      title: field.label,
      description: (field as any).description || `${field.label}字段`,
    };

    // 根据字段类型转换
    switch (field.type) {
      case 'text':
      case 'textarea':
        return {
          ...baseSchema,
          type: 'string',
          minLength: field.required ? 1 : undefined,
          ...(field.placeholder ? { examples: [field.placeholder] } : {}),
          ...(includeExamples ? this.generateFieldExamples(field) : {}),
        };

      case 'number':
        return {
          ...baseSchema,
          type: 'number',
          minimum: 0,
          ...(includeExamples ? this.generateFieldExamples(field) : {}),
        };

      case 'date':
        return {
          ...baseSchema,
          type: 'string',
          format: 'date-time',
          ...(includeExamples ? this.generateFieldExamples(field) : {}),
        };

      case 'checkbox':
        return {
          ...baseSchema,
          type: 'boolean',
          ...(includeExamples ? this.generateFieldExamples(field) : {}),
        };

      case 'select':
        if (!field.options || field.options.length === 0) {
          return {
            ...baseSchema,
            type: 'string',
          };
        }

        return {
          ...baseSchema,
          type: 'string',
          enum: field.options.map(option => option.value),
          ...(field.options.length > 0 ? { examples: [field.options[0].value] } : {}),
        };

      default:
        return {
          ...baseSchema,
          type: 'string',
        };
    }
  }

  /**
   * 为字段生成示例值
   */
  private generateFieldExamples(field: FormField): { examples?: any[] } {
    const examples: any[] = [];

    switch (field.type) {
      case 'text':
      case 'textarea':
        examples.push('示例文本');
        if (field.placeholder) {
          examples.push(field.placeholder);
        }
        break;

      case 'number':
        examples.push(42, 0, 100);
        break;

      case 'date':
        examples.push(new Date().toISOString());
        break;

      case 'checkbox':
        examples.push(true, false);
        break;

      case 'select':
        if (field.options && field.options.length > 0) {
          examples.push(field.options[0].value);
          if (field.options.length > 1) {
            examples.push(field.options[1].value);
          }
        }
        break;
    }

    return examples.length > 0 ? { examples } : {};
  }

  /**
   * 为整个表单生成示例数据
   */
  private generateExamples(metadata: FormMetadata): any[] {
    const examples: any[] = [];

    // 生成一个基本示例
    const basicExample: any = {};
    for (const field of metadata.fields) {
      if (field.defaultValue !== undefined) {
        basicExample[field.name] = field.defaultValue;
      } else {
        basicExample[field.name] = this.getExampleValueForField(field);
      }
    }
    examples.push(basicExample);

    // 生成一个空表示例（可选字段为空）
    const emptyExample: any = {};
    for (const field of metadata.fields) {
      if (field.required) {
        emptyExample[field.name] = this.getExampleValueForField(field);
      } else {
        emptyExample[field.name] = null;
      }
    }
    examples.push(emptyExample);

    return examples;
  }

  /**
   * 获取字段的示例值
   */
  private getExampleValueForField(field: FormField): any {
    switch (field.type) {
      case 'text':
      case 'textarea':
        return field.placeholder || `示例${field.label}`;
      case 'number':
        return 42;
      case 'date':
        return new Date().toISOString();
      case 'checkbox':
        return false;
      case 'select':
        return field.options && field.options.length > 0 ? field.options[0].value : '';
      default:
        return '';
    }
  }

  /**
   * 将 Zod Schema 转换为 JSON Schema
   */
  convertZodSchemaToJsonSchema(schema: z.ZodTypeAny, options: {
    title?: string;
    description?: string;
    includeExamples?: boolean;
  } = {}): JsonSchema {
    const { title, description, includeExamples = true } = options;

    // 处理对象类型
    if (schema._def.typeName === 'ZodObject') {
      const shape = schema._def.shape();
      const properties: Record<string, JsonSchema> = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(shape)) {
        properties[key] = this.convertZodSchemaToJsonSchema(value as z.ZodTypeAny, {
          includeExamples: false, // 避免嵌套示例
        });

        // 检查是否为必填字段
        if (!(value as any)._def.typeName?.includes('Optional')) {
          required.push(key);
        }
      }

      return {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        title,
        description,
        properties,
        required: required.length > 0 ? required : undefined,
        additionalProperties: false,
      };
    }

    // 处理字符串类型
    if (schema._def.typeName === 'ZodString') {
      const stringSchema: JsonSchema = {
        type: 'string',
        title,
        description,
      };

      // 处理字符串验证
      const checks = (schema as any)._def.checks || [];
      for (const check of checks) {
        switch (check.kind) {
          case 'min':
            stringSchema.minLength = check.value;
            break;
          case 'max':
            stringSchema.maxLength = check.value;
            break;
          case 'regex':
            stringSchema.pattern = check.regex.source;
            break;
          case 'email':
            stringSchema.format = 'email';
            break;
          case 'url':
            stringSchema.format = 'uri';
            break;
        }
      }

      return stringSchema;
    }

    // 处理数字类型
    if (schema._def.typeName === 'ZodNumber') {
      const numberSchema: JsonSchema = {
        type: 'number',
        title,
        description,
      };

      const checks = (schema as any)._def.checks || [];
      for (const check of checks) {
        switch (check.kind) {
          case 'min':
            numberSchema.minimum = check.value;
            break;
          case 'max':
            numberSchema.maximum = check.value;
            break;
        }
      }

      return numberSchema;
    }

    // 处理布尔类型
    if (schema._def.typeName === 'ZodBoolean') {
      return {
        type: 'boolean',
        title,
        description,
      };
    }

    // 处理日期类型
    if (schema._def.typeName === 'ZodDate') {
      return {
        type: 'string',
        format: 'date-time',
        title,
        description,
      };
    }

    // 处理枚举类型
    if (schema._def.typeName === 'ZodEnum') {
      return {
        type: 'string',
        enum: (schema as any)._def.values,
        title,
        description,
      };
    }

    // 处理联合类型
    if (schema._def.typeName === 'ZodUnion') {
      const options = (schema as any)._def.options;
      const schemas = options.map((option: z.ZodTypeAny) =>
        this.convertZodSchemaToJsonSchema(option, { includeExamples: false })
      );

      return {
        anyOf: schemas,
        title,
        description,
      };
    }

    // 处理可选类型
    if (schema._def.typeName === 'ZodOptional') {
      const innerSchema = (schema as any)._def.innerType;
      const jsonSchema = this.convertZodSchemaToJsonSchema(innerSchema, {
        includeExamples: false,
      });

      // JSON Schema 中可选字段通过不在 required 数组中表示
      return jsonSchema;
    }

    // 默认返回字符串类型
    return {
      type: 'string',
      title,
      description,
    };
  }

  /**
   * 验证 JSON Schema 的有效性
   */
  validateJsonSchema(schema: JsonSchema): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // 基本验证
    if (!schema.type) {
      errors.push('Schema must have a type');
    }

    if (schema.type === 'object' && !schema.properties) {
      errors.push('Object schema must have properties');
    }

    // 验证必需字段是否在属性中存在
    if (schema.required && schema.properties) {
      for (const requiredField of schema.required) {
        if (!schema.properties[requiredField]) {
          errors.push(`Required field "${requiredField}" not found in properties`);
        }
      }
    }

    // 验证枚举值
    if (schema.enum && schema.enum.length === 0) {
      errors.push('Enum must have at least one value');
    }

    // 验证数字约束
    if (schema.minimum !== undefined && schema.maximum !== undefined) {
      if (schema.minimum > schema.maximum) {
        errors.push('Minimum cannot be greater than maximum');
      }
    }

    // 验证字符串约束
    if (schema.minLength !== undefined && schema.maxLength !== undefined) {
      if (schema.minLength > schema.maxLength) {
        errors.push('MinLength cannot be greater than maxLength');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 生成 JSON Schema 的文档
   */
  generateSchemaDocumentation(schema: JsonSchema): string {
    let doc = '# JSON Schema Documentation\n\n';

    if (schema.title) {
      doc += `## ${schema.title}\n\n`;
    }

    if (schema.description) {
      doc += `${schema.description}\n\n`;
    }

    doc += `**Type**: ${schema.type}\n\n`;

    if (schema.required && schema.required.length > 0) {
      doc += `**Required Fields**: ${schema.required.join(', ')}\n\n`;
    }

    if (schema.properties) {
      doc += '### Properties\n\n';
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        doc += `#### ${propName}\n\n`;
        doc += `- **Type**: ${propSchema.type}\n`;
        if (propSchema.title) {
          doc += `- **Title**: ${propSchema.title}\n`;
        }
        if (propSchema.description) {
          doc += `- **Description**: ${propSchema.description}\n`;
        }
        if (propSchema.format) {
          doc += `- **Format**: ${propSchema.format}\n`;
        }
        if (propSchema.enum) {
          doc += `- **Enum**: ${propSchema.enum.join(', ')}\n`;
        }
        if (propSchema.examples) {
          doc += `- **Examples**: ${propSchema.examples.join(', ')}\n`;
        }
        doc += '\n';
      }
    }

    if (schema.examples) {
      doc += '### Examples\n\n';
      schema.examples.forEach((example, index) => {
        doc += `#### Example ${index + 1}\n`;
        doc += '```json\n';
        doc += JSON.stringify(example, null, 2);
        doc += '\n```\n\n';
      });
    }

    return doc;
  }
}

/**
 * 全局 JSON Schema 转换器实例
 */
export const globalJsonSchemaConverter = new JsonSchemaConverter();

/**
 * 便捷函数：将 FormMetadata 转换为 JSON Schema
 */
export function convertFormMetadataToJsonSchema(
  metadata: FormMetadata,
  options?: Parameters<JsonSchemaConverter['convertFormMetadataToJsonSchema']>[1]
): JsonSchema {
  return globalJsonSchemaConverter.convertFormMetadataToJsonSchema(metadata, options);
}

/**
 * 便捷函数：将 Zod Schema 转换为 JSON Schema
 */
export function convertZodSchemaToJsonSchema(
  schema: z.ZodTypeAny,
  options?: Parameters<JsonSchemaConverter['convertZodSchemaToJsonSchema']>[1]
): JsonSchema {
  return globalJsonSchemaConverter.convertZodSchemaToJsonSchema(schema, options);
}

/**
 * 便捷函数：验证 JSON Schema
 */
export function validateJsonSchema(schema: JsonSchema): ReturnType<JsonSchemaConverter['validateJsonSchema']> {
  return globalJsonSchemaConverter.validateJsonSchema(schema);
}

// 导出默认
export default JsonSchemaConverter;
