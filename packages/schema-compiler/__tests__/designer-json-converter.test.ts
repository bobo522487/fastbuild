import { describe, it, expect, beforeEach } from 'vitest';
import {
  convertDesignerJsonToFormMetadata,
  convertFormMetadataToDesignerJson,
  validateDesignerJson,
  getDesignerTypeDefaultProps,
} from '../src/designer-json-converter';
import type { DesignerJsonField, DesignerFormField } from '@workspace/types';

describe('DesignerJsonConverter', () => {
  let sampleDesignerJson: DesignerJsonField[];

  beforeEach(() => {
    sampleDesignerJson = [
      {
        type: 'input',
        field: 'name',
        title: '姓名',
        name: 'name',
        info: '请输入姓名',
        $required: true,
        props: {
          placeholder: '请输入姓名',
          maxlength: 50,
        },
        col: {
          span: 12,
        },
        _fc_id: 'name_field',
        _fc_drag_tag: 'input',
      },
      {
        type: 'select',
        field: 'gender',
        title: '性别',
        name: 'gender',
        info: '请选择性别',
        $required: true,
        props: {
          placeholder: '请选择性别',
          options: [
            { label: '男', value: 'male' },
            { label: '女', value: 'female' },
          ],
        },
        col: {
          span: 12,
        },
        _fc_id: 'gender_field',
        _fc_drag_tag: 'select',
      },
      {
        type: 'checkbox',
        field: 'terms',
        title: '同意条款',
        name: 'terms',
        info: '我同意相关条款',
        $required: false,
        props: {
          defaultChecked: false,
        },
        col: {
          span: 24,
        },
        _fc_id: 'terms_field',
        _fc_drag_tag: 'checkbox',
      },
    ];
  });

  describe('convertDesignerJsonToFormMetadata', () => {
    it('应该正确转换设计器JSON为FormMetadata', () => {
      const metadata = convertDesignerJsonToFormMetadata(sampleDesignerJson);

      expect(metadata).toMatchObject({
        version: '1.0.0',
        title: '设计器表单',
        description: '由设计器生成的动态表单',
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
      });

      expect(metadata.fields).toHaveLength(3);
      expect(metadata.fields[0]).toMatchObject({
        id: 'name',
        name: 'name',
        type: 'text',
        label: '姓名',
        placeholder: '请输入姓名',
        required: true,
        description: '请输入姓名',
        $ui: {
          col: { span: 12 },
          props: { placeholder: '请输入姓名', maxlength: 50 },
        },
      });
    });

    it('应该正确映射字段类型', () => {
      const metadata = convertDesignerJsonToFormMetadata(sampleDesignerJson);

      expect(metadata.fields[0].type).toBe('text'); // input -> text
      expect(metadata.fields[1].type).toBe('select'); // select -> select
      expect(metadata.fields[2].type).toBe('checkbox'); // checkbox -> checkbox
    });

    it('应该正确处理选择器选项', () => {
      const metadata = convertDesignerJsonToFormMetadata(sampleDesignerJson);
      const selectField = metadata.fields[1];

      expect(selectField.options).toEqual([
        { label: '男', value: 'male' },
        { label: '女', value: 'female' },
      ]);
    });

    it('应该正确处理必填字段', () => {
      const metadata = convertDesignerJsonToFormMetadata(sampleDesignerJson);

      expect(metadata.fields[0].required).toBe(true);
      expect(metadata.fields[1].required).toBe(true);
      expect(metadata.fields[2].required).toBe(false);
    });

    it('应该正确处理列布局配置', () => {
      const metadata = convertDesignerJsonToFormMetadata(sampleDesignerJson);

      expect(metadata.fields[0].$ui?.col?.span).toBe(12);
      expect(metadata.fields[1].$ui?.col?.span).toBe(12);
      expect(metadata.fields[2].$ui?.col?.span).toBe(24);
    });

    it('应该处理空的设计器JSON', () => {
      const metadata = convertDesignerJsonToFormMetadata([]);

      expect(metadata.fields).toHaveLength(0);
      expect(metadata.version).toBe('1.0.0');
    });
  });

  describe('convertFormMetadataToDesignerJson', () => {
    it('应该正确转换FormMetadata为设计器JSON', () => {
      const metadata = convertDesignerJsonToFormMetadata(sampleDesignerJson);
      const designerJson = convertFormMetadataToDesignerJson(metadata);

      expect(designerJson).toHaveLength(3);
      expect(designerJson[0]).toMatchObject({
        type: 'input',
        field: 'name',
        title: '姓名',
        name: 'name',
        $required: true,
        display: true,
        hidden: false,
        col: { span: 12 },
        _fc_id: 'name_field',
        _fc_drag_tag: 'input',
        info: '请输入姓名',
      });
    });

    it('应该反向映射字段类型', () => {
      const metadata = convertDesignerJsonToFormMetadata(sampleDesignerJson);
      const designerJson = convertFormMetadataToDesignerJson(metadata);

      expect(designerJson[0].type).toBe('input'); // text -> input
      expect(designerJson[1].type).toBe('select'); // select -> select
      expect(designerJson[2].type).toBe('checkbox'); // checkbox -> checkbox
    });

    it('应该正确转换选择器选项', () => {
      const metadata = convertDesignerJsonToFormMetadata(sampleDesignerJson);
      const designerJson = convertFormMetadataToDesignerJson(metadata);

      expect(designerJson[1].props?.options).toEqual([
        { label: '男', value: 'male' },
        { label: '女', value: 'female' },
      ]);
    });
  });

  describe('validateDesignerJson', () => {
    it('应该验证有效的设计器JSON', () => {
      const result = validateDesignerJson(sampleDesignerJson);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该检测无效的JSON格式', () => {
      const result = validateDesignerJson(null as any);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('设计器JSON必须是数组格式');
    });

    it('应该检测缺少必填字段', () => {
      const invalidJson = [
        {
          type: 'input',
          // 缺少 field, title, name
        },
      ];

      const result = validateDesignerJson(invalidJson);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('字段[0]: 缺少field字段');
      expect(result.errors).toContain('字段[0]: 缺少name字段');
      expect(result.errors).toContain('字段[0]: 缺少title字段');
    });

    it('应该检测无效的列配置', () => {
      const invalidJson = [
        {
          type: 'input',
          field: 'test',
          title: '测试',
          name: 'test',
          col: {
            span: 25, // 超出范围
          },
        },
      ];

      const result = validateDesignerJson(invalidJson);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('字段[0]: col.span必须是1-24之间的数字');
    });

    it('应该检测不支持的类型', () => {
      const invalidJson = [
        {
          type: 'unsupported_type',
          field: 'test',
          title: '测试',
          name: 'test',
        },
      ];

      const result = validateDesignerJson(invalidJson);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('字段[0]: 不支持的type类型: unsupported_type');
    });
  });

  describe('getDesignerTypeDefaultProps', () => {
    it('应该返回正确的默认属性', () => {
      const inputProps = getDesignerTypeDefaultProps('input');
      expect(inputProps).toEqual({
        type: 'text',
        maxLength: 500,
      });

      const numberProps = getDesignerTypeDefaultProps('inputNumber');
      expect(numberProps).toEqual({
        type: 'number',
        min: Number.MIN_SAFE_INTEGER,
        max: Number.MAX_SAFE_INTEGER,
      });

      const textareaProps = getDesignerTypeDefaultProps('textarea');
      expect(textareaProps).toEqual({
        rows: 4,
        maxLength: 2000,
      });
    });

    it('应该为未知类型返回空对象', () => {
      const props = getDesignerTypeDefaultProps('unknown_type');
      expect(props).toEqual({});
    });
  });

  describe('双向转换一致性', () => {
    it('应该保持双向转换的一致性', () => {
      // 原始数据
      const originalJson = [...sampleDesignerJson];

      // 正向转换
      const metadata = convertDesignerJsonToFormMetadata(originalJson);

      // 反向转换
      const convertedBack = convertFormMetadataToDesignerJson(metadata);

      // 验证基本结构
      expect(convertedBack).toHaveLength(originalJson.length);

      // 验证关键字段保持一致
      convertedBack.forEach((field, index) => {
        const original = originalJson[index];
        expect(field.type).toBe(original.type);
        expect(field.field).toBe(original.field);
        expect(field.title).toBe(original.title);
        expect(field.name).toBe(original.name);
        expect(field.$required).toBe(original.$required);
        expect(field.col?.span).toBe(original.col?.span);
      });
    });
  });
});