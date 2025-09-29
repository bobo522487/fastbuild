/**
 * 优化的表单状态管理器
 * 专门用于管理复杂的表单状态
 */

import { OptimizedStateManager } from './optimized-state-manager';
import { FormMetadata, FormField } from '@workspace/types';
import { computeFieldVisibility } from '@workspace/schema-compiler';

export interface FormFieldValue {
  value: any;
  error?: string;
  touched: boolean;
  dirty: boolean;
}

export interface FormState {
  values: Record<string, any>;
  errors: Record<string, string | undefined>;
  touched: Record<string, boolean>;
  dirty: Record<string, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
  submittedAt?: number;
  lastFieldUpdate?: string;
}

export interface FormStateOptions {
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  validateOnMount?: boolean;
  revalidateMode?: 'onChange' | 'onBlur' | 'onSubmit';
  shouldFocusError?: boolean;
  shouldUseNativeValidation?: boolean;
  shouldUnregister?: boolean;
  delayError?: number;
}

/**
 * 优化的表单状态管理器
 */
export class OptimizedFormStateManager extends OptimizedStateManager<FormState> {
  private metadata: FormMetadata;
  private options: Required<FormStateOptions>;
  private validationTimeouts = new Map<string, number>();
  private fieldVisibilityCache = new Map<string, Record<string, boolean>>();

  constructor(metadata: FormMetadata, options: FormStateOptions = {}) {
    super({
      values: {},
      errors: {},
      touched: {},
      dirty: {},
      isSubmitting: false,
      isValid: true,
      isDirty: false,
    });

    this.metadata = metadata;
    this.options = {
      validateOnChange: true,
      validateOnBlur: true,
      validateOnMount: false,
      revalidateMode: 'onChange',
      shouldFocusError: true,
      shouldUseNativeValidation: false,
      shouldUnregister: false,
      delayError: 0,
      ...options,
    };

    this.initializeDefaultValues();
  }

  /**
   * 设置字段值
   */
  setFieldValue(fieldId: string, value: any, shouldValidate = true): void {
    this.setState(state => {
      const newValues = { ...state.values, [fieldId]: value };
      const newDirty = { ...state.dirty, [fieldId]: true };
      const newIsDirty = Object.values(newDirty).some(Boolean);

      return {
        ...state,
        values: newValues,
        dirty: newDirty,
        isDirty: newIsDirty,
        lastFieldUpdate: fieldId,
      };
    });

    if (shouldValidate && this.options.validateOnChange) {
      this.validateField(fieldId, value);
    }
  }

  /**
   * 批量设置字段值
   */
  setFieldValues(values: Record<string, any>, shouldValidate = true): void {
    const updaters = Object.entries(values).map(([fieldId, value]) =>
      (state: FormState) => ({
        values: { ...state.values, [fieldId]: value },
        dirty: { ...state.dirty, [fieldId]: true },
        isDirty: true,
        lastFieldUpdate: fieldId,
      })
    );

    this.batchUpdate(updaters);

    if (shouldValidate && this.options.validateOnChange) {
      this.validateFields(Object.keys(values));
    }
  }

  /**
   * 获取字段值
   */
  getFieldValue(fieldId: string): any {
    return this.getState().values[fieldId];
  }

  /**
   * 获取字段错误
   */
  getFieldError(fieldId: string): string | undefined {
    return this.getState().errors[fieldId];
  }

  /**
   * 设置字段错误
   */
  setFieldError(fieldId: string, error: string | undefined): void {
    this.setState(state => ({
      ...state,
      errors: { ...state.errors, [fieldId]: error },
      isValid: !Object.values({ ...state.errors, [fieldId]: error }).some(Boolean),
    }));
  }

  /**
   * 清除字段错误
   */
  clearFieldError(fieldId: string): void {
    this.setFieldError(fieldId, undefined);
  }

  /**
   * 标记字段为已触摸
   */
  setFieldTouched(fieldId: string, isTouched = true): void {
    this.setState(state => ({
      ...state,
      touched: { ...state.touched, [fieldId]: isTouched },
    }));

    if (isTouched && this.options.validateOnBlur) {
      this.validateField(fieldId, this.getFieldValue(fieldId));
    }
  }

  /**
   * 批量标记字段为已触摸
   */
  setFieldsTouched(fieldIds: string[], isTouched = true): void {
    const updaters = fieldIds.map(fieldId =>
      (state: FormState) => ({
        touched: { ...state.touched, [fieldId]: isTouched },
      })
    );

    this.batchUpdate(updaters);
  }

  /**
   * 重置表单
   */
  reset(values?: Record<string, any>): void {
    this.setState(state => ({
      ...state,
      values: values || this.getDefaultValues(),
      errors: {},
      touched: {},
      dirty: {},
      isDirty: false,
      submittedAt: undefined,
      lastFieldUpdate: undefined,
    }));

    // 清除验证超时
    this.validationTimeouts.forEach(timeout => clearTimeout(timeout));
    this.validationTimeouts.clear();
  }

  /**
   * 重置字段
   */
  resetField(fieldId: string): void {
    const defaultValue = this.getDefaultValue(fieldId);
    this.setState(state => ({
      ...state,
      values: { ...state.values, [fieldId]: defaultValue },
      errors: { ...state.errors, [fieldId]: undefined },
      touched: { ...state.touched, [fieldId]: false },
      dirty: { ...state.dirty, [fieldId]: false },
      isDirty: Object.values({ ...state.dirty, [fieldId]: false }).some(Boolean),
    }));

    this.clearValidationTimeout(fieldId);
  }

  /**
   * 提交表单
   */
  async submit(onSubmit: (values: Record<string, any>) => Promise<void> | void): Promise<void> {
    const state = this.getState();

    if (state.isSubmitting) return;

    this.setState(prev => ({ ...prev, isSubmitting: true }));

    try {
      // 验证所有字段
      await this.validateAll();

      const currentState = this.getState();
      if (currentState.isValid) {
        await onSubmit(currentState.values);
        this.setState(prev => ({ ...prev, submittedAt: Date.now() }));
      } else if (this.options.shouldFocusError) {
        this.focusFirstError();
      }
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      this.setState(prev => ({ ...prev, isSubmitting: false }));
    }
  }

  /**
   * 验证字段
   */
  async validateField(fieldId: string, value: any): Promise<boolean> {
    // 清除之前的验证超时
    this.clearValidationTimeout(fieldId);

    // 延迟验证（如果配置了延迟）
    if (this.options.delayError > 0) {
      return new Promise<boolean>((resolve) => {
        const timeoutId = window.setTimeout(() => {
          const error = this.performFieldValidation(fieldId, value);
          this.setFieldError(fieldId, error);
          resolve(!error);
        }, this.options.delayError);

        this.validationTimeouts.set(fieldId, timeoutId);
      });
    }

    const error = this.performFieldValidation(fieldId, value);
    this.setFieldError(fieldId, error);
    return !error;
  }

  /**
   * 验证多个字段
   */
  async validateFields(fieldIds: string[]): Promise<boolean> {
    const results = await Promise.all(
      fieldIds.map(fieldId => this.validateField(fieldId, this.getFieldValue(fieldId)))
    );
    return results.every(Boolean);
  }

  /**
   * 验证所有字段
   */
  async validateAll(): Promise<boolean> {
    const fieldIds = this.metadata.fields.map(field => field.id);
    return this.validateFields(fieldIds);
  }

  /**
   * 获取表单状态
   */
  getFormState(): FormState {
    return this.getState();
  }

  /**
   * 获取字段可见性
   */
  getFieldVisibility(): Record<string, boolean> {
    const state = this.getState();
    const cacheKey = JSON.stringify(state.values);

    if (this.fieldVisibilityCache.has(cacheKey)) {
      return this.fieldVisibilityCache.get(cacheKey)!;
    }

    const visibility = computeFieldVisibility(this.metadata.fields, state.values);
    this.fieldVisibilityCache.set(cacheKey, visibility);

    return visibility;
  }

  /**
   * 获取可见字段
   */
  getVisibleFields(): FormField[] {
    const visibility = this.getFieldVisibility();
    return this.metadata.fields.filter(field => visibility[field.id]);
  }

  /**
   * 获取可见字段值
   */
  getVisibleFieldValues(): Record<string, any> {
    const visibleFields = this.getVisibleFields();
    const values = this.getState().values;

    return visibleFields.reduce((acc, field) => {
      acc[field.name] = values[field.name];
      return acc;
    }, {} as Record<string, any>);
  }

  /**
   * 更新表单元数据
   */
  updateMetadata(newMetadata: FormMetadata): void {
    this.metadata = newMetadata;
    this.fieldVisibilityCache.clear();
    this.initializeDefaultValues();
  }

  /**
   * 获取表单统计信息
   */
  getStats() {
    const baseStats = super.getStats();
    const state = this.getState();

    return {
      ...baseStats,
      fieldsCount: this.metadata.fields.length,
      visibleFieldsCount: this.getVisibleFields().length,
      errorsCount: Object.values(state.errors).filter(Boolean).length,
      touchedFieldsCount: Object.values(state.touched).filter(Boolean).length,
      dirtyFieldsCount: Object.values(state.dirty).filter(Boolean).length,
      cacheSize: this.fieldVisibilityCache.size,
    };
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    super.cleanup();
    this.validationTimeouts.forEach(timeout => clearTimeout(timeout));
    this.validationTimeouts.clear();
    this.fieldVisibilityCache.clear();
  }

  /**
   * 聚焦到第一个错误字段
   */
  private focusFirstError(): void {
    const state = this.getState();
    const firstErrorField = this.metadata.fields.find(field => state.errors[field.name]);

    if (firstErrorField) {
      const element = document.querySelector(`[name="${firstErrorField.name}"]`);
      if (element instanceof HTMLElement) {
        element.focus();
      }
    }
  }

  /**
   * 执行字段验证
   */
  private performFieldValidation(fieldId: string, value: any): string | undefined {
    const field = this.metadata.fields.find(f => f.id === fieldId);
    if (!field) return undefined;

    // 基础验证
    if (field.required && (value === undefined || value === null || value === '')) {
      return `${field.label}不能为空`;
    }

    // 类型验证
    if (value !== undefined && value !== null) {
      switch (field.type) {
        case 'email':
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            return '请输入有效的邮箱地址';
          }
          break;
        case 'number':
          if (isNaN(Number(value))) {
            return '请输入有效的数字';
          }
          break;
        case 'url':
          try {
            new URL(value);
          } catch {
            return '请输入有效的网址';
          }
          break;
      }
    }

    return undefined;
  }

  /**
   * 清除验证超时
   */
  private clearValidationTimeout(fieldId: string): void {
    const timeoutId = this.validationTimeouts.get(fieldId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.validationTimeouts.delete(fieldId);
    }
  }

  /**
   * 初始化默认值
   */
  private initializeDefaultValues(): void {
    const defaultValues = this.getDefaultValues();
    this.setState(state => ({
      ...state,
      values: defaultValues,
    }));
  }

  /**
   * 获取默认值
   */
  private getDefaultValues(): Record<string, any> {
    const values: Record<string, any> = {};

    this.metadata.fields.forEach(field => {
      values[field.name] = this.getDefaultValue(field.id);
    });

    return values;
  }

  /**
   * 获取字段默认值
   */
  private getDefaultValue(fieldId: string): any {
    const field = this.metadata.fields.find(f => f.id === fieldId);
    if (!field) return undefined;

    return field.defaultValue !== undefined ? field.defaultValue : this.getTypeDefault(field.type);
  }

  /**
   * 获取类型默认值
   */
  private getTypeDefault(type: FormField['type']): any {
    switch (type) {
      case 'checkbox':
        return false;
      case 'number':
        return 0;
      case 'date':
        return new Date().toISOString().split('T')[0];
      default:
        return '';
    }
  }
}

/**
 * React Hook for optimized form state
 */
export function useOptimizedFormState(
  metadata: FormMetadata,
  options?: FormStateOptions
) {
  const managerRef = useRef<OptimizedFormStateManager | null>(null);

  if (!managerRef.current) {
    managerRef.current = new OptimizedFormStateManager(metadata, options);
  }

  useEffect(() => {
    return () => {
      managerRef.current?.cleanup();
    };
  }, []);

  const formState = useOptimizedState(managerRef.current);
  const { setFieldValue, setFieldValues, setFieldError, setFieldTouched, reset, submit } = managerRef.current;

  return {
    ...formState[0],
    setFieldValue,
    setFieldValues,
    setFieldError,
    setFieldTouched,
    reset,
    submit,
  };
}