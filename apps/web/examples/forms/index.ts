export { contactFormMetadata } from './contact-form';
export { userRegistrationMetadata } from './user-registration';
export { surveyFormMetadata } from './survey-form';

export const exampleForms = [
  {
    id: 'contact',
    name: '联系表单',
    description: '用于用户联系我们，包含姓名、邮箱、电话等基本信息',
    metadata: contactFormMetadata,
  },
  {
    id: 'registration',
    name: '用户注册',
    description: '新用户注册表单，包含账号信息和个人资料',
    metadata: userRegistrationMetadata,
  },
  {
    id: 'survey',
    name: '满意度调查',
    description: '产品满意度调查问卷，包含评分和建议收集',
    metadata: surveyFormMetadata,
  },
] as const;