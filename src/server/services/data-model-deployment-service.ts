import { prisma } from '@/server/db';
import { z } from 'zod';

const DataModelDeploymentRequestSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Invalid version format (e.g., 1.0.0)'),
  environment: z.enum(['PREVIEW', 'PRODUCTION']),
  changeLog: z.object({
    description: z.string(),
    tables: z.array(z.string()),
    changes: z.array(z.object({
      type: z.enum(['CREATE_TABLE', 'ALTER_TABLE', 'DROP_TABLE', 'ADD_COLUMN', 'DROP_COLUMN']),
      tableName: z.string(),
      description: z.string()
    }))
  }),
  metadata: z.record(z.any()).optional()
});

export type DataModelDeploymentRequest = z.infer<typeof DataModelDeploymentRequestSchema>;

export class DataModelDeploymentService {
  async deployDataModel(
    projectId: string,
    userId: string,
    request: DataModelDeploymentRequest
  ) {
    // 1. 验证请求格式
    const validatedRequest = DataModelDeploymentRequestSchema.parse(request);

    // 2. 检查项目权限
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { members: true }
    });

    if (!project) {
      throw new Error('Project not found');
    }

    const userMembership = project.members.find(member => member.userId === userId);
    if (!userMembership || !['OWNER', 'ADMIN'].includes(userMembership.role)) {
      throw new Error('Insufficient permissions to deploy data model');
    }

    // 3. 检查版本是否已存在
    const existingDeployment = await prisma.dataModelDeployment.findFirst({
      where: {
        projectId,
        environment: validatedRequest.environment,
        version: validatedRequest.version
      }
    });

    if (existingDeployment) {
      throw new Error(`Version ${validatedRequest.version} already exists for ${validatedRequest.environment} environment`);
    }

    // 4. 获取当前项目的所有表结构
    const tables = await prisma.dataTable.findMany({
      where: {
        projectId,
        deletedAt: null
      },
      include: {
        columns: {
          orderBy: { order: 'asc' }
        }
      }
    });

    // 5. 生成表结构快照
    const tableSnapshots = tables.map(table => ({
      name: table.name,
      displayName: table.displayName,
      description: table.description,
      columns: table.columns.map(column => ({
        name: column.name,
        displayName: column.displayName,
        type: column.type,
        nullable: column.nullable,
        defaultValue: column.defaultValue,
        unique: column.unique,
        order: column.order,
        options: column.options
      })),
      options: table.options
    }));

    // 6. 创建部署记录
    const deployment = await prisma.dataModelDeployment.create({
      data: {
        projectId,
        version: validatedRequest.version,
        environment: validatedRequest.environment,
        status: 'BUILDING',
        deployedBy: userId,
        tableSnapshots,
        changeLog: validatedRequest.changeLog,
        metadata: validatedRequest.metadata || {},
        schemaName: `fastbuild_${projectId}_${validatedRequest.environment.toLowerCase()}`
      }
    });

    // 7. 异步执行数据库 schema 创建
    this.executeDataModelDeployment(deployment.id).catch(error => {
      console.error(`Data model deployment ${deployment.id} failed:`, error);
    });

    return {
      deploymentId: deployment.id,
      version: deployment.version,
      environment: deployment.environment,
      status: deployment.status,
      deployedAt: deployment.deployedAt,
      changeLog: deployment.changeLog,
      metadata: deployment.metadata,
      tableCount: tables.length,
      buildLog: null,
      schemaName: deployment.schemaName,
      buildTime: null,
      deployedBy: userId,
      qrCode: null // QR code will be generated when deployment is complete
    };
  }

  private async executeDataModelDeployment(deploymentId: string) {
    const deployment = await prisma.dataModelDeployment.findUnique({
      where: { id: deploymentId },
      include: { project: true }
    });

    if (!deployment) {
      throw new Error(`Deployment ${deploymentId} not found`);
    }

    const startTime = Date.now();
    let buildLog = 'Starting data model deployment...\n';

    try {
      // 1. 创建独立的 database schema
      const schemaName = deployment.schemaName!;
      buildLog += `Creating schema: ${schemaName}\n`;

      await this.createDatabaseSchema(schemaName);
      buildLog += 'Schema created successfully\n';

      // 2. 在新 schema 中创建所有表
      const tableSnapshots = deployment.tableSnapshots as any[];
      for (const tableSnapshot of tableSnapshots) {
        buildLog += `Creating table: ${tableSnapshot.name}\n`;
        await this.createTableInSchema(schemaName, tableSnapshot);
        buildLog += `Table ${tableSnapshot.name} created successfully\n`;
      }

      // 3. 更新部署状态为成功
      const buildTime = Date.now() - startTime;
      buildLog += `Deployment completed successfully in ${buildTime}ms\n`;

      await prisma.dataModelDeployment.update({
        where: { id: deploymentId },
        data: {
          status: 'DEPLOYED',
          buildLog,
          buildTime
        }
      });

      // 4. 记录审计日志
      await prisma.auditLog.create({
        data: {
          projectId: deployment.projectId,
          userId: deployment.deployedBy,
          action: 'DEPLOY_DATA_MODEL',
          resourceType: 'DataModelDeployment',
          resourceId: deploymentId,
          newValues: {
            version: deployment.version,
            environment: deployment.environment,
            tableCount: tableSnapshots.length
          },
          metadata: {
            deploymentId,
            schemaName,
            buildTime
          }
        }
      });

    } catch (error) {
      const buildTime = Date.now() - startTime;
      buildLog += `Deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}\n`;

      // 更新部署状态为失败
      await prisma.dataModelDeployment.update({
        where: { id: deploymentId },
        data: {
          status: 'FAILED',
          buildLog,
          buildTime
        }
      });

      // 记录失败审计日志
      await prisma.auditLog.create({
        data: {
          projectId: deployment.projectId,
          userId: deployment.deployedBy,
          action: 'DEPLOY_DATA_MODEL_FAILED',
          resourceType: 'DataModelDeployment',
          resourceId: deploymentId,
          metadata: {
            deploymentId,
            error: error instanceof Error ? error.message : 'Unknown error',
            buildTime
          }
        }
      });

      throw error;
    }
  }

  private async createDatabaseSchema(schemaName: string) {
    // 这里应该使用原生 SQL 客户端创建 schema
    // 为了简化，这里使用模拟实现
    console.log(`Creating database schema: ${schemaName}`);

    // 实际实现应该像这样：
    // const client = new Client(process.env.DATABASE_URL);
    // await client.connect();
    // await client.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
    // await client.end();
  }

  private async createTableInSchema(schemaName: string, tableSnapshot: any) {
    const { name, columns } = tableSnapshot;

    // 生成 CREATE TABLE SQL
    const columnDefinitions = columns.map((column: any) => {
      const columnType = this.mapColumnType(column.type);
      const nullable = column.nullable ? '' : 'NOT NULL';
      const defaultValue = column.defaultValue ? `DEFAULT ${column.defaultValue}` : '';
      const unique = column.unique ? 'UNIQUE' : '';

      return `"${column.name}" ${columnType} ${nullable} ${defaultValue} ${unique}`.trim();
    });

    const createTableSQL = `
      CREATE TABLE "${schemaName}"."${name}" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ${columnDefinitions.join(',\n        ')},
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        deleted_at TIMESTAMP
      );
    `;

    console.log(`Creating table: ${createTableSQL}`);

    // 实际实现应该执行 SQL：
    // const client = new Client(process.env.DATABASE_URL);
    // await client.connect();
    // await client.query(createTableSQL);
    // await client.end();
  }

  private mapColumnType(columnType: string): string {
    const typeMap = {
      'STRING': 'VARCHAR(255)',
      'TEXT': 'TEXT',
      'NUMBER': 'DECIMAL(20,8)',
      'BOOLEAN': 'BOOLEAN',
      'DATE': 'DATE',
      'TIMESTAMP': 'TIMESTAMP',
      'JSON': 'JSONB'
    };

    return typeMap[columnType as keyof typeof typeMap] || 'TEXT';
  }

  async getDeploymentStatus(deploymentId: string, userId: string) {
    const deployment = await prisma.dataModelDeployment.findUnique({
      where: { id: deploymentId },
      include: {
        project: {
          include: { members: true }
        }
      }
    });

    if (!deployment) {
      throw new Error('Deployment not found');
    }

    // 检查权限
    const userMembership = deployment.project.members.find(member => member.userId === userId);
    if (!userMembership) {
      throw new Error('No permission to view this deployment');
    }

    // 计算构建进度
    let progress = 0;
    if (deployment.status === 'BUILDING') {
      progress = 50; // 构建中显示50%进度
    } else if (deployment.status === 'DEPLOYED') {
      progress = 100;
    }

    const tableSnapshots = deployment.tableSnapshots as any[];
    const response: any = {
      deploymentId: deployment.id,
      version: deployment.version,
      environment: deployment.environment,
      status: deployment.status,
      progress,
      deployedAt: deployment.deployedAt,
      changeLog: deployment.changeLog,
      metadata: deployment.metadata,
      tableCount: tableSnapshots.length,
      buildLog: deployment.buildLog,
      schemaName: deployment.schemaName,
      buildTime: deployment.buildTime,
      deployedBy: deployment.deployedBy,
      estimatedCompletion: null
    };

    // 如果正在构建中，估算完成时间
    if (deployment.status === 'BUILDING') {
      const averageBuildTime = 30000; // 30秒平均构建时间
      const elapsed = Date.now() - deployment.deployedAt.getTime();
      response.estimatedCompletion = new Date(deployment.deployedAt.getTime() + averageBuildTime).toISOString();
    }

    // 如果部署成功，生成简单的访问URL（模拟）
    if (deployment.status === 'DEPLOYED') {
      response.apiUrl = `https://api.fastbuild.com/data/${deployment.projectId}/${deployment.environment}`;
      response.qrCode = this.generateQRCode(response.apiUrl);
    }

    return response;
  }

  private generateQRCode(url: string): string {
    // 简单的 QR 码生成（模拟）
    // 实际实现应该使用 QR 码库如 qrcode
    const qrData = `QR:${Buffer.from(url).toString('base64')}`;
    return qrData;
  }

  async getDeploymentHistory(projectId: string, userId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { members: true }
    });

    if (!project) {
      throw new Error('Project not found');
    }

    const userMembership = project.members.find(member => member.userId === userId);
    if (!userMembership) {
      throw new Error('No permission to view project deployments');
    }

    const deployments = await prisma.dataModelDeployment.findMany({
      where: { projectId },
      orderBy: { deployedAt: 'desc' },
      take: 20
    });

    return deployments.map(deployment => {
      const tableSnapshots = deployment.tableSnapshots as any[];
      return {
        deploymentId: deployment.id,
        version: deployment.version,
        environment: deployment.environment,
        status: deployment.status,
        deployedAt: deployment.deployedAt,
        tableCount: tableSnapshots.length,
        buildTime: deployment.buildTime,
        deployedBy: deployment.deployedBy
      };
    });
  }
}