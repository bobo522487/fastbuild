// TypeScript类型定义合同：Schema驱动运行时MVP
// 版本: 1.0.0
// 分支: 002-schema-driven-runtime-mvp

export * from './field-types';
export * from './validation-types';
export * from './ui-types';
export * from './api-types';

// 重新导出主要类型 - 核心表单类型
export {
  FormMetadata,
  FormField,
  FieldType,
  FieldValidation,
  FormValidation,
  FormUIConfig,
  SubmitConfig,
  ValidationResult,
  ValidationError,
  SchemaCompiler,
  FormContext,
  FormValidationState,
  FormSubmissionState,
  SubmitResult,
  FormValidationResult,
} from './field-types';

// 重新导出主要类型 - 验证类型
export {
  ValidationRule,
  FieldValidationRule,
  FormValidationRule,
  ValidationContext,
  ValidationError,
  ValidationResult,
  Validator,
  ValidatorRegistry,
  ValidationPipeline,
  ValidationRuleBuilder,
  ValidationConfig,
  ValidationMetrics,
  ValidationMonitor,
  ValidationEvent,
  ValidationEventType,
  ValidationEventHandler,
  ValidationEventEmitter,
  ValidationContextBuilder,
  ValidationUtils,
} from './validation-types';

// 重新导出主要类型 - UI类型
export {
  LayoutConfig,
  ThemeConfig,
  SizeVariant,
  StyleVariant,
  BaseUIComponentConfig,
  InputComponentConfig,
  TextareaComponentConfig,
  SelectComponentConfig,
  CheckboxComponentConfig,
  RadioComponentConfig,
  DateComponentConfig,
  FileComponentConfig,
  ButtonComponentConfig,
  FormUIConfig,
  FormUIComponent,
  UIState,
  UIEventType,
  UIEvent,
  UIEventHandler,
  UIComponentRenderer,
  UIThemeProvider,
  ResponsiveConfig,
  AccessibilityConfig,
  AnimationConfig,
  CompleteUIConfig,
} from './ui-types';

// 重新导出主要类型 - API类型
export {
  ApiResponse,
  ApiError,
  ApiErrorCode,
  PaginationParams,
  PaginationMeta,
  PaginatedResponse,
  FormListItem,
  FormDetail,
  CreateFormParams,
  UpdateFormParams,
  FormQueryParams,
  SubmissionStatus,
  SubmissionMetadata,
  SubmissionDetail,
  SubmissionListItem,
  CreateSubmissionParams,
  UpdateSubmissionParams,
  SubmissionQueryParams,
  BatchSubmissionParams,
  BatchSubmissionResult,
  SchemaCompileParams,
  SchemaCompileResult,
  SchemaValidateParams,
  SchemaStats,
  AuthContext,
  FormRouter,
  SubmissionRouter,
  SchemaRouter,
  ApiClient,
  ApiMiddleware,
  ApiConfig,
} from './api-types';