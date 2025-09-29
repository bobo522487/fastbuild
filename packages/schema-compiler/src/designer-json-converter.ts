/**
 * 设计器JSON转换器
 * 将设计器JSON转换为FormMetadata格式
 */

import type {
  DesignerJsonField,
  DesignerFormMetadata,
  DesignerFormField,
  DesignerUIConfig,
  FormField,
  FieldType,
  SelectOption,
} from '@workspace/types';

/**
 * 设计器类型映射配置
 */
const DESIGNER_TYPE_MAPPING: Record<string, FieldType> = {
  'input': 'text',
  'inputNumber': 'number',
  'select': 'select',
  'checkbox': 'checkbox',
  'radio': 'radio',
  'date': 'date',
  'datetime': 'date',
  'time': 'date',
  'textarea': 'textarea',
  'switch': 'checkbox',
  'slider': 'number',
  'rate': 'number',
  'cascader': 'select',
  'treeSelect': 'select',
  'upload': 'file',
  // 扩展更多类型映射
};

/**
 * 默认组件属性映射
 */
const DEFAULT_PROPS_MAPPING: Record<FieldType, Record<string, any>> = {
  'text': {
    type: 'text',
    maxLength: 500,
  },
  'number': {
    type: 'number',
    min: Number.MIN_SAFE_INTEGER,
    max: Number.MAX_SAFE_INTEGER,
  },
  'textarea': {
    rows: 4,
    maxLength: 2000,
  },
  'select': {
    placeholder: '请选择...',
  },
  'checkbox': {
    defaultChecked: false,
  },
  'date': {
    type: 'date',
    placeholder: '请选择日期',
  },
  'radio': {
    defaultChecked: false,
  },
  'file': {
    multiple: false,
    accept: '*/*',
  },
  // 扩展更多默认属性
};

/**
 * 转换设计器JSON为FormMetadata
 */
export function convertDesignerJsonToFormMetadata(
  designerJson: DesignerJsonField[]
): DesignerFormMetadata {
  return {
    version: '1.0.0',
    title: '设计器表单',
    description: '由设计器生成的动态表单',
    fields: designerJson.map(convertDesignerField),
    layout: {
      type: 'grid',
      columns: 24,
      gap: 4,
    },
    designer: {
      version: '1.0.0',
      theme: 'default',
      responsive: true,
    },
    ui: {
      layout: {
        type: 'grid',
        spacing: 'md',
        columns: 24,
      },
      showLabels: true,
      showDescriptions: true,
      showValidation: true,
    },
  };
}

/**
 * 转换单个设计器字段
 */
function convertDesignerField(designerField: DesignerJsonField): DesignerFormField {
  const fieldType = mapDesignerTypeToFieldType(designerField.type);

  return {
    id: designerField.field,
    name: designerField.name,
    type: fieldType,
    label: designerField.title || '',
    placeholder: designerField.info || designerField.props?.placeholder || '',
    required: designerField.$required || false,
    description: designerField.info,
    defaultValue: getDefaultValue(designerField, fieldType),
    options: convertOptions(designerField),
    validation: convertValidation(designerField, fieldType),
    condition: convertCondition(designerField),
    $ui: convertUIConfig(designerField),
    // 兼容性字段
    _fc_id: designerField._fc_id,
    _fc_drag_tag: designerField._fc_drag_tag,
    info: designerField.info,
    $required: designerField.$required,
    title: designerField.title,
  };
}

/**
 * 映射设计器类型到字段类型
 */
function mapDesignerTypeToFieldType(designerType: string): FieldType {
  return DESIGNER_TYPE_MAPPING[designerType] || 'text';
}

/**
 * 获取字段默认值
 */
function getDefaultValue(designerField: DesignerJsonField, fieldType: FieldType): any {
  // 从props中获取默认值
  if (designerField.props?.defaultValue !== undefined) {
    return designerField.props.defaultValue;
  }

  // 根据字段类型返回默认值
  switch (fieldType) {
    case 'checkbox':
      return false;
    case 'number':
      return null;
    case 'select':
    case 'radio':
      return '';
    default:
      return '';
  }
}

/**
 * 转换选择器选项
 */
function convertOptions(designerField: DesignerJsonField): SelectOption[] | undefined {
  if (!designerField.props?.options) {
    return undefined;
  }

  const options = designerField.props.options;

  // 处理不同格式的选项
  if (Array.isArray(options)) {
    return options.map((option, index) => {
      if (typeof option === 'string') {
        return {
          label: option,
          value: option,
        };
      } else if (typeof option === 'object') {
        return {
          label: option.label || option.text || option.value,
          value: option.value || option.key || String(index),
          disabled: option.disabled || false,
          group: option.group,
        };
      }
      return {
        label: String(option),
        value: String(option),
      };
    });
  }

  return undefined;
}

/**
 * 转换验证规则
 */
function convertValidation(designerField: DesignerJsonField, fieldType: FieldType): any {
  const validation: any = {};
  const props = designerField.props || {};

  // 必填验证
  if (designerField.$required) {
    validation.required = `${designerField.title || '此字段'}不能为空`;
  }

  // 根据字段类型添加验证
  switch (fieldType) {
    case 'text':
    case 'textarea':
      if (props.maxlength) {
        validation.max = `${designerField.title || '此字段'}不能超过${props.maxlength}个字符`;
      }
      if (props.minlength) {
        validation.min = `${designerField.title || '此字段'}至少需要${props.minlength}个字符`;
      }
      if (props.pattern) {
        validation.pattern = {
          value: props.pattern,
          message: `${designerField.title || '此字段'}格式不正确`,
        };
      }
      break;

    case 'number':
      if (props.min !== undefined) {
        validation.min = {
          value: props.min,
          message: `${designerField.title || '此字段'}不能小于${props.min}`,
        };
      }
      if (props.max !== undefined) {
        validation.max = {
          value: props.max,
          message: `${designerField.title || '此字段'}不能大于${props.max}`,
        };
      }
      break;

    case 'select':
    case 'radio':
      if (props.multiple && props.minCount) {
        validation.min = `至少选择${props.minCount}个选项`;
      }
      if (props.multiple && props.maxCount) {
        validation.max = `最多选择${props.maxCount}个选项`;
      }
      break;
  }

  // 自定义验证规则
  if (props.validator) {
    validation.custom = props.validator;
  }

  return Object.keys(validation).length > 0 ? validation : undefined;
}

/**
 * 转换条件逻辑
 */
function convertCondition(designerField: DesignerJsonField): any {
  // 这里可以根据设计器的条件逻辑进行转换
  // 当前设计器JSON中没有条件逻辑，返回undefined
  return undefined;
}

/**
 * 转换UI配置
 */
function convertUIConfig(designerField: DesignerJsonField): DesignerUIConfig {
  const uiConfig: DesignerUIConfig = {};

  // 列布局配置
  if (designerField.col) {
    uiConfig.col = {
      span: designerField.col.span || 24,
      offset: designerField.col.offset,
      push: designerField.col.push,
      pull: designerField.col.pull,
    };
  }

  // 显示控制
  if (designerField.display !== undefined) {
    uiConfig.display = designerField.display;
  }
  if (designerField.hidden !== undefined) {
    uiConfig.hidden = designerField.hidden;
  }

  // 组件属性
  if (designerField.props) {
    uiConfig.props = { ...designerField.props };
  }

  // 响应式配置
  if (designerField.responsive) {
    uiConfig.responsive = designerField.responsive;
  }

  // 生成响应式类名
  uiConfig.className = generateResponsiveClasses(uiConfig);

  return uiConfig;
}

/**
 * 生成响应式类名
 */
function generateResponsiveClasses(uiConfig: DesignerUIConfig): string {
  const classes: string[] = [];

  // 基础列类
  if (uiConfig.col) {
    const span = uiConfig.col.span || 24;
    const mdSpan = Math.ceil(span / 2); // 桌面端减半
    classes.push(`col-span-24`);
    classes.push(`md:col-span-${mdSpan}`);
  }

  // 偏移类
  if (uiConfig.col?.offset) {
    classes.push(`col-start-${uiConfig.col.offset + 1}`);
  }

  // 自定义类名
  if (uiConfig.className) {
    classes.push(uiConfig.className);
  }

  return classes.join(' ');
}

/**
 * 反向转换：FormMetadata转设计器JSON
 */
export function convertFormMetadataToDesignerJson(
  metadata: DesignerFormMetadata
): DesignerJsonField[] {
  return metadata.fields.map(convertFormFieldToDesignerJson);
}

/**
 * 转换表单字段为设计器JSON
 */
function convertFormFieldToDesignerJson(field: DesignerFormField): DesignerJsonField {
  const designerField: DesignerJsonField = {
    type: mapFieldTypeToDesignerType(field.type),
    field: field.id,
    title: field.label,
    name: field.name,
    $required: field.required,
    display: field.$ui?.display !== false,
    hidden: field.$ui?.hidden || false,
    _fc_id: field._fc_id,
    _fc_drag_tag: mapFieldTypeToDesignerType(field.type),
    info: field.description,
  };

  // UI配置
  if (field.$ui) {
    if (field.$ui.col) {
      designerField.col = field.$ui.col;
    }
    if (field.$ui.props) {
      designerField.props = { ...field.$ui.props };
    }
  }

  // 选项配置
  if (field.options) {
    if (!designerField.props) {
      designerField.props = {};
    }
    designerField.props.options = field.options.map(option => ({
      label: option.label,
      value: option.value,
      disabled: option.disabled,
    }));
  }

  return designerField;
}

/**
 * 映射字段类型到设计器类型
 */
function mapFieldTypeToDesignerType(fieldType: FieldType): string {
  const reverseMapping: Record<FieldType, string> = {
    'text': 'input',
    'number': 'inputNumber',
    'select': 'select',
    'checkbox': 'checkbox',
    'radio': 'radio',
    'date': 'date',
    'textarea': 'textarea',
    'file': 'upload',
    // 其他映射
  };

  return reverseMapping[fieldType] || 'input';
}

/**
 * 验证设计器JSON格式
 */
export function validateDesignerJson(designerJson: any[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!Array.isArray(designerJson)) {
    errors.push('设计器JSON必须是数组格式');
    return { valid: false, errors };
  }

  designerJson.forEach((field, index) => {
    const fieldIndex = `字段[${index}]`;

    // 必填字段验证
    if (!field.type) {
      errors.push(`${fieldIndex}: 缺少type字段`);
    }
    if (!field.field) {
      errors.push(`${fieldIndex}: 缺少field字段`);
    }
    if (!field.name) {
      errors.push(`${fieldIndex}: 缺少name字段`);
    }
    if (!field.title) {
      errors.push(`${fieldIndex}: 缺少title字段`);
    }

    // 列配置验证
    if (field.col && field.col.span) {
      if (typeof field.col.span !== 'number' || field.col.span < 1 || field.col.span > 24) {
        errors.push(`${fieldIndex}: col.span必须是1-24之间的数字`);
      }
    }

    // 类型映射验证
    if (field.type && !DESIGNER_TYPE_MAPPING[field.type]) {
      errors.push(`${fieldIndex}: 不支持的type类型: ${field.type}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 获取设计器类型的默认属性
 */
export function getDesignerTypeDefaultProps(designerType: string): Record<string, any> {
  const fieldType = mapDesignerTypeToFieldType(designerType);
  return DEFAULT_PROPS_MAPPING[fieldType] || {};
}