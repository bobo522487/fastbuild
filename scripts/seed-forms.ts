import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('开始创建示例表单...')

  // 示例表单数据
  const sampleForms = [
    {
      name: '用户反馈表',
      description: '收集用户对产品和服务的反馈意见',
      metadata: {
        version: '1.0.0',
        fields: [
          {
            id: 'name',
            name: 'name',
            type: 'text' as const,
            label: '姓名',
            placeholder: '请输入您的姓名',
            required: true,
          },
          {
            id: 'email',
            name: 'email',
            type: 'text' as const,
            label: '邮箱',
            placeholder: '请输入您的邮箱地址',
            required: true,
          },
          {
            id: 'rating',
            name: 'rating',
            type: 'select' as const,
            label: '产品评分',
            placeholder: '请选择评分',
            required: true,
            options: [
              { label: '非常满意', value: '5' },
              { label: '满意', value: '4' },
              { label: '一般', value: '3' },
              { label: '不满意', value: '2' },
              { label: '非常不满意', value: '1' },
            ],
          },
          {
            id: 'feedback',
            name: 'feedback',
            type: 'textarea' as const,
            label: '反馈内容',
            placeholder: '请详细描述您的使用体验和建议',
            required: true,
          },
          {
            id: 'recommend',
            name: 'recommend',
            type: 'checkbox' as const,
            label: '是否愿意推荐给朋友',
            required: false,
          },
        ],
      },
    },
    {
      name: '活动报名表',
      description: '用于活动的在线报名和信息收集',
      metadata: {
        version: '1.0.0',
        fields: [
          {
            id: 'name',
            name: 'name',
            type: 'text' as const,
            label: '姓名',
            placeholder: '请输入您的姓名',
            required: true,
          },
          {
            id: 'phone',
            name: 'phone',
            type: 'text' as const,
            label: '电话',
            placeholder: '请输入您的联系电话',
            required: true,
          },
          {
            id: 'company',
            name: 'company',
            type: 'text' as const,
            label: '公司',
            placeholder: '请输入您的公司名称',
            required: false,
          },
          {
            id: 'position',
            name: 'position',
            type: 'text' as const,
            label: '职位',
            placeholder: '请输入您的职位',
            required: false,
          },
          {
            id: 'requirements',
            name: 'requirements',
            type: 'textarea' as const,
            label: '特殊需求',
            placeholder: '请描述您的特殊需求或饮食限制',
            required: false,
          },
        ],
      },
    },
    {
      name: '联系表单',
      description: '网站联系表单，收集用户咨询和建议',
      metadata: {
        version: '1.0.0',
        fields: [
          {
            id: 'name',
            name: 'name',
            type: 'text' as const,
            label: '姓名',
            placeholder: '请输入您的姓名',
            required: true,
          },
          {
            id: 'email',
            name: 'email',
            type: 'text' as const,
            label: '邮箱',
            placeholder: '请输入您的邮箱地址',
            required: true,
          },
          {
            id: 'subject',
            name: 'subject',
            type: 'text' as const,
            label: '主题',
            placeholder: '请输入咨询主题',
            required: true,
          },
          {
            id: 'message',
            name: 'message',
            type: 'textarea' as const,
            label: '留言内容',
            placeholder: '请详细描述您的问题或建议',
            required: true,
          },
        ],
      },
    },
  ]

  try {
    // 创建示例表单
    for (const formData of sampleForms) {
      const form = await prisma.form.create({
        data: formData,
      })
      console.log(`✅ 创建表单: ${form.name} (ID: ${form.id})`)
    }

    console.log(`🎉 成功创建 ${sampleForms.length} 个示例表单`)
  } catch (error) {
    console.error('❌ 创建表单时发生错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()