import type { FormMetadata } from '@workspace/types';

export const contactFormMetadata: FormMetadata = {
  version: '1.0.0',
  fields: [
    {
      id: 'name',
      name: 'name',
      type: 'text',
      label: '姓名',
      placeholder: '请输入您的姓名',
      required: true,
    },
    {
      id: 'email',
      name: 'email',
      type: 'text',
      label: '邮箱',
      placeholder: '请输入您的邮箱地址',
      required: true,
    },
    {
      id: 'phone',
      name: 'phone',
      type: 'text',
      label: '电话',
      placeholder: '请输入您的电话号码',
      required: false,
    },
    {
      id: 'subject',
      name: 'subject',
      type: 'select',
      label: '咨询主题',
      placeholder: '请选择咨询主题',
      required: true,
      options: [
        { label: '产品咨询', value: 'product' },
        { label: '技术支持', value: 'support' },
        { label: '合作洽谈', value: 'partnership' },
        { label: '其他', value: 'other' },
      ],
    },
    {
      id: 'message',
      name: 'message',
      type: 'textarea',
      label: '留言内容',
      placeholder: '请详细描述您的需求或问题',
      required: true,
    },
    {
      id: 'newsletter',
      name: 'newsletter',
      type: 'checkbox',
      label: '订阅我们的新闻通讯',
      placeholder: '接收最新的产品更新和优惠信息',
      required: false,
      defaultValue: false,
    },
  ],
};