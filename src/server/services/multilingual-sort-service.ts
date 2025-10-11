import { PrismaClient } from '@prisma/client';

/**
 * 多语言排序服务 - 利用 PostgreSQL 18 PG_UNICODE_FAST 排序规则
 * 提供高性能的多语言文本排序和搜索功能
 */
export class MultilingualSortService {
  constructor(private prisma: PrismaClient) {}

  /**
   * 检查 PG_UNICODE_FAST 支持状态
   */
  async checkUnicodeFastSupport(): Promise<{
    supported: boolean;
    collations: Array<{ name: string; provider: string; version?: string }>;
  }> {
    try {
      const collations = await this.prisma.$queryRaw`
        SELECT
          collname as name,
          collprovider as provider,
          collversion as version
        FROM pg_collation
        WHERE collname LIKE '%unicode%' OR collname LIKE '%fast%'
        ORDER BY collname
      ` as any[];

      const unicodeFastSupported = collations.some(
        (c: any) => c.name.toLowerCase().includes('unicode_fast')
      );

      return {
        supported: unicodeFastSupported,
        collations
      };
    } catch (error) {
      console.error('❌ 检查排序规则支持失败:', error);
      return {
        supported: false,
        collations: []
      };
    }
  }

  /**
   * 获取项目列表（多语言排序）
   */
  async getProjectsSorted(
    filters: {
      userId?: string;
      visibility?: 'PUBLIC' | 'PRIVATE';
      search?: string;
      sortBy?: 'name' | 'createdAt' | 'updatedAt';
      sortOrder?: 'asc' | 'desc';
      limit?: number;
      offset?: number;
    } = {}
  ) {
    const {
      userId,
      visibility,
      search,
      sortBy = 'name',
      sortOrder = 'asc',
      limit = 20,
      offset = 0
    } = filters;

    try {
      // 构建查询条件
      const whereConditions: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (userId) {
        whereConditions.push(`p."createdBy" = $${paramIndex++}`);
        queryParams.push(userId);
      }

      if (visibility) {
        whereConditions.push(`p.visibility = $${paramIndex++}`);
        queryParams.push(visibility);
      }

      if (search) {
        whereConditions.push(`(
          p.name_unifast ILIKE $${paramIndex++} OR
          p.description_unifast ILIKE $${paramIndex++}
        )`);
        queryParams.push(`%${search}%`, `%${search}%`);
      }

      const whereClause = whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      // 构建排序
      const orderByField = sortBy === 'name'
        ? 'p.name_unifast'
        : `p."${sortBy}"`;

      const orderByClause = `ORDER BY ${orderByField} ${sortOrder.toUpperCase()}`;

      // 执行查询
      const query = `
        SELECT
          p.id,
          p.name,
          p.slug,
          p.description,
          p.visibility,
          p."createdAt",
          p."updatedAt",
          p."createdBy",
          u.name as "creatorName",
          u.email as "creatorEmail",
          -- 统计信息
          (SELECT COUNT(*) FROM "ProjectMember" pm WHERE pm."projectId" = p.id) as member_count,
          (SELECT COUNT(*) FROM "Application" a WHERE a."projectId" = p.id) as app_count
        FROM "Project" p
        LEFT JOIN "User" u ON u.id = p."createdBy"
        ${whereClause}
        ${orderByClause}
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      queryParams.push(limit, offset);

      const projects = await this.prisma.$queryRawUnsafe(query, ...queryParams) as any[];

      // 获取总数
      const countQuery = `
        SELECT COUNT(*) as total
        FROM "Project" p
        ${whereClause}
      `;

      const [countResult] = await this.prisma.$queryRawUnsafe(
        countQuery,
        ...queryParams.slice(0, -2)
      ) as any[];

      return {
        projects,
        total: parseInt(countResult.total),
        hasMore: (offset + projects.length) < countResult.total
      };
    } catch (error) {
      console.error('❌ 获取项目列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取应用列表（多语言排序）
   */
  async getApplicationsSorted(
    filters: {
      projectId?: string;
      search?: string;
      sortBy?: 'name' | 'createdAt' | 'updatedAt';
      sortOrder?: 'asc' | 'desc';
      limit?: number;
      offset?: number;
    } = {}
  ) {
    const {
      projectId,
      search,
      sortBy = 'name',
      sortOrder = 'asc',
      limit = 20,
      offset = 0
    } = filters;

    try {
      const whereConditions: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (projectId) {
        whereConditions.push(`a."projectId" = $${paramIndex++}`);
        queryParams.push(projectId);
      }

      if (search) {
        whereConditions.push(`(
          a.name_unifast ILIKE $${paramIndex++} OR
          a.description_unifast ILIKE $${paramIndex++}
        )`);
        queryParams.push(`%${search}%`, `%${search}%`);
      }

      const whereClause = whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      const orderByField = sortBy === 'name'
        ? 'a.name_unifast'
        : `a."${sortBy}"`;

      const orderByClause = `ORDER BY ${orderByField} ${sortOrder.toUpperCase()}`;

      const query = `
        SELECT
          a.id,
          a.name,
          a.slug,
          a.description,
          a."createdAt",
          a."updatedAt",
          a."projectId",
          p.name as "projectName",
          p.slug as "projectSlug",
          u.name as "creatorName",
          -- 统计信息
          (SELECT COUNT(*) FROM "AppPage" ap WHERE ap."applicationId" = a.id) as page_count,
          (SELECT COUNT(*) FROM "AppDeployment" ad WHERE ad."applicationId" = a.id AND ad.status = 'DEPLOYED') as deployment_count
        FROM "Application" a
        LEFT JOIN "Project" p ON p.id = a."projectId"
        LEFT JOIN "User" u ON u.id = a."createdBy"
        ${whereClause}
        ${orderByClause}
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      queryParams.push(limit, offset);

      const applications = await this.prisma.$queryRawUnsafe(query, ...queryParams) as any[];

      // 获取总数
      const countQuery = `
        SELECT COUNT(*) as total
        FROM "Application" a
        ${whereClause}
      `;

      const [countResult] = await this.prisma.$queryRawUnsafe(
        countQuery,
        ...queryParams.slice(0, -2)
      ) as any[];

      return {
        applications,
        total: parseInt(countResult.total),
        hasMore: (offset + applications.length) < countResult.total
      };
    } catch (error) {
      console.error('❌ 获取应用列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取数据表列表（多语言排序）
   */
  async getDataTablesSorted(
    filters: {
      projectId?: string;
      search?: string;
      sortBy?: 'name' | 'displayName' | 'createdAt' | 'updatedAt';
      sortOrder?: 'asc' | 'desc';
      includeDeleted?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    const {
      projectId,
      search,
      sortBy = 'name',
      sortOrder = 'asc',
      includeDeleted = false,
      limit = 20,
      offset = 0
    } = filters;

    try {
      const whereConditions: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (projectId) {
        whereConditions.push(`dt."projectId" = $${paramIndex++}`);
        queryParams.push(projectId);
      }

      if (!includeDeleted) {
        whereConditions.push(`dt."deletedAt" IS NULL`);
      }

      if (search) {
        whereConditions.push(`(
          dt.name_unifast ILIKE $${paramIndex++} OR
          dt.display_name_unifast ILIKE $${paramIndex++} OR
          dt.description_unifast ILIKE $${paramIndex++}
        )`);
        queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      const whereClause = whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      const orderByField = sortBy === 'name'
        ? 'dt.name_unifast'
        : sortBy === 'displayName'
        ? 'dt.display_name_unifast'
        : `dt."${sortBy}"`;

      const orderByClause = `ORDER BY ${orderByField} ${sortOrder.toUpperCase()}`;

      const query = `
        SELECT
          dt.id,
          dt.name,
          dt."displayName",
          dt.description,
          dt."createdAt",
          dt."updatedAt",
          dt."deletedAt",
          dt."projectId",
          dt.options,
          p.name as "projectName",
          u.name as "creatorName",
          -- 统计信息
          (SELECT COUNT(*) FROM "DataColumn" dc WHERE dc."tableId" = dt.id) as column_count,
          (SELECT COUNT(*) FROM "TableView" tv WHERE tv."tableId" = dt.id) as view_count
        FROM "DataTable" dt
        LEFT JOIN "Project" p ON p.id = dt."projectId"
        LEFT JOIN "User" u ON u.id = dt."createdBy"
        ${whereClause}
        ${orderByClause}
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      queryParams.push(limit, offset);

      const tables = await this.prisma.$queryRawUnsafe(query, ...queryParams) as any[];

      // 获取总数
      const countQuery = `
        SELECT COUNT(*) as total
        FROM "DataTable" dt
        ${whereClause}
      `;

      const [countResult] = await this.prisma.$queryRawUnsafe(
        countQuery,
        ...queryParams.slice(0, -2)
      ) as any[];

      return {
        tables,
        total: parseInt(countResult.total),
        hasMore: (offset + tables.length) < countResult.total
      };
    } catch (error) {
      console.error('❌ 获取数据表列表失败:', error);
      throw error;
    }
  }

  /**
   * 搜索建议（自动完成）
   */
  async getSearchSuggestions(
    query: string,
    type: 'projects' | 'applications' | 'tables',
    limit: number = 5
  ): Promise<string[]> {
    try {
      let sqlQuery = '';
      const searchPattern = `${query}%`;

      switch (type) {
        case 'projects':
          sqlQuery = `
            SELECT DISTINCT name_unifast as suggestion
            FROM "Project"
            WHERE name_unifast ILIKE $1
            ORDER BY name_unifast
            LIMIT $2
          `;
          break;

        case 'applications':
          sqlQuery = `
            SELECT DISTINCT name_unifast as suggestion
            FROM "Application"
            WHERE name_unifast ILIKE $1
            ORDER BY name_unifast
            LIMIT $2
          `;
          break;

        case 'tables':
          sqlQuery = `
            SELECT DISTINCT
              COALESCE(display_name_unifast, name_unifast) as suggestion
            FROM "DataTable"
            WHERE (display_name_unifast ILIKE $1 OR name_unifast ILIKE $1)
              AND "deletedAt" IS NULL
            ORDER BY suggestion
            LIMIT $2
          `;
          break;
      }

      const results = await this.prisma.$queryRawUnsafe(
        sqlQuery,
        searchPattern,
        limit
      ) as any[];

      return results.map((r: any) => r.suggestion);
    } catch (error) {
      console.error('❌ 获取搜索建议失败:', error);
      return [];
    }
  }

  /**
   * 性能测试：比较排序性能
   */
  async testSortingPerformance(): Promise<{
    table: string;
    defaultSortMs: number;
    unicodeFastSortMs: number;
    improvementPercent: number;
  }> {
    try {
      // 测试 Project 表排序性能
      const defaultStart = Date.now();
      await this.prisma.$queryRaw`
        SELECT * FROM "Project"
        ORDER BY name COLLATE "default"
        LIMIT 100
      `;
      const defaultSortMs = Date.now() - defaultStart;

      const unicodeFastStart = Date.now();
      await this.prisma.$queryRaw`
        SELECT * FROM "Project"
        ORDER BY name_unifast
        LIMIT 100
      `;
      const unicodeFastSortMs = Date.now() - unicodeFastStart;

      const improvementPercent = defaultSortMs > 0
        ? ((defaultSortMs - unicodeFastSortMs) / defaultSortMs) * 100
        : 0;

      return {
        table: 'Project',
        defaultSortMs,
        unicodeFastSortMs,
        improvementPercent
      };
    } catch (error) {
      console.error('❌ 性能测试失败:', error);
      return {
        table: 'Project',
        defaultSortMs: 0,
        unicodeFastSortMs: 0,
        improvementPercent: 0
      };
    }
  }

  /**
   * 获取多语言统计信息
   */
  async getMultilingualStats(): Promise<{
    totalRecords: number;
    unicodeFastFields: number;
    supportedLanguages: string[];
    avgNameLength: number;
    longestName: string;
  }> {
    try {
      const [projectStats, appStats, tableStats] = await Promise.all([
        this.prisma.$queryRaw`
          SELECT
            COUNT(*) as total,
            COUNT(name_unifast) as unicode_fast_count,
            AVG(LENGTH(name)) as avg_length,
            MAX(LENGTH(name)) as max_length
          FROM "Project"
        ` as any[],

        this.prisma.$queryRaw`
          SELECT
            COUNT(*) as total,
            COUNT(name_unifast) as unicode_fast_count,
            AVG(LENGTH(name)) as avg_length
          FROM "Application"
        ` as any[],

        this.prisma.$queryRaw`
          SELECT
            COUNT(*) as total,
            COUNT(name_unifast) as unicode_fast_count,
            AVG(LENGTH(name)) as avg_length
          FROM "DataTable"
          WHERE "deletedAt" IS NULL
        ` as any[]
      ]);

      const totalRecords =
        parseInt(projectStats[0].total) +
        parseInt(appStats[0].total) +
        parseInt(tableStats[0].total);

      const unicodeFastFields =
        parseInt(projectStats[0].unicode_fast_count) +
        parseInt(appStats[0].unicode_fast_count) +
        parseInt(tableStats[0].unicode_fast_count);

      // 获取最长的名称
      const [longestNameResult] = await this.prisma.$queryRaw`
        SELECT name FROM "Project"
        WHERE LENGTH(name) = (SELECT MAX(LENGTH(name)) FROM "Project")
        LIMIT 1
      ` as any[];

      return {
        totalRecords,
        unicodeFastFields,
        supportedLanguages: ['en', 'zh', 'ja', 'ko', 'es', 'fr', 'de', 'ru'], // 假设支持的语言
        avgNameLength: parseFloat(projectStats[0].avg_length) || 0,
        longestName: longestNameResult?.name || ''
      };
    } catch (error) {
      console.error('❌ 获取多语言统计失败:', error);
      return {
        totalRecords: 0,
        unicodeFastFields: 0,
        supportedLanguages: [],
        avgNameLength: 0,
        longestName: ''
      };
    }
  }
}