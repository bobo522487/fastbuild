import { format } from 'pg-format';

/**
 * 简化的查询构建器 - Linus风格的简化实现
 *
 * 核心理念：
 * 1. 相信 PostgreSQL 的内置验证
 * 2. 只做基础防注入保护
 * 3. 让数据库做它擅长的工作
 */

export interface Filter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'is_null' | 'is_not_null';
  value?: any;
}

export interface Sort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface QueryOptions {
  filters?: Filter[];
  sorts?: Sort[];
  limit?: number;
  offset?: number;
}

/**
 * 简单查询构建器 - 替代原来复杂的三层验证系统
 */
export class SimpleQueryBuilder {
  /**
   * 基础标识符验证 - 防止明显的 SQL 注入
   * 其余的交给 PostgreSQL 验证
   */
  static validateIdentifier(name: string): void {
    if (!name || typeof name !== 'string') {
      throw new Error('标识符不能为空');
    }

    // 只允许字母、数字、下划线，长度限制
    if (!/^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/.test(name)) {
      throw new Error(`无效的标识符: ${name}`);
    }

    // 检查明显的 SQL 关键字
    const sqlKeywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER'];
    if (sqlKeywords.includes(name.toUpperCase())) {
      throw new Error(`标识符不能是 SQL 关键字: ${name}`);
    }
  }

  /**
   * 安全转义标识符
   */
  static escapeIdentifier(name: string): string {
    this.validateIdentifier(name);
    return format('%I', name);
  }

  /**
   * 构建完整的表名
   */
  static buildTableName(projectId: string, tableName: string): string {
    this.validateIdentifier(projectId);
    this.validateIdentifier(tableName);

    const fullTableName = `project_${projectId}_${tableName}`;
    return this.escapeIdentifier(fullTableName);
  }

  /**
   * 构建视图名
   */
  static buildViewName(projectId: string, tableName: string, viewName: string): string {
    this.validateIdentifier(projectId);
    this.validateIdentifier(tableName);
    this.validateIdentifier(viewName);

    const fullViewName = `view_project_${projectId}_${tableName}_${viewName}`;
    return this.escapeIdentifier(fullViewName);
  }

  /**
   * 构建 SELECT 查询
   */
  static buildSelectQuery(
    tableName: string,
    projectId: string,
    options: QueryOptions = {}
  ): { sql: string; params: any[] } {
    const safeTableName = this.buildTableName(projectId, tableName);
    const params: any[] = [];
    let paramIndex = 1;

    // 构建 WHERE 子句
    const whereConditions: string[] = [];
    if (options.filters) {
      for (const filter of options.filters) {
        this.validateIdentifier(filter.field);
        const escapedField = this.escapeIdentifier(filter.field);

        switch (filter.operator) {
          case 'eq':
            whereConditions.push(`${escapedField} = $${paramIndex++}`);
            params.push(filter.value);
            break;
          case 'ne':
            whereConditions.push(`${escapedField} != $${paramIndex++}`);
            params.push(filter.value);
            break;
          case 'gt':
            whereConditions.push(`${escapedField} > $${paramIndex++}`);
            params.push(filter.value);
            break;
          case 'gte':
            whereConditions.push(`${escapedField} >= $${paramIndex++}`);
            params.push(filter.value);
            break;
          case 'lt':
            whereConditions.push(`${escapedField} < $${paramIndex++}`);
            params.push(filter.value);
            break;
          case 'lte':
            whereConditions.push(`${escapedField} <= $${paramIndex++}`);
            params.push(filter.value);
            break;
          case 'like':
            whereConditions.push(`${escapedField} LIKE $${paramIndex++}`);
            params.push(filter.value);
            break;
          case 'in':
            if (Array.isArray(filter.value) && filter.value.length > 0) {
              const placeholders = filter.value.map(() => `$${paramIndex++}`).join(', ');
              whereConditions.push(`${escapedField} IN (${placeholders})`);
              params.push(...filter.value);
            }
            break;
          case 'is_null':
            whereConditions.push(`${escapedField} IS NULL`);
            break;
          case 'is_not_null':
            whereConditions.push(`${escapedField} IS NOT NULL`);
            break;
        }
      }
    }

    // 自动添加 deleted_at IS NULL 过滤（软删除）
    whereConditions.push(`deleted_at IS NULL`);

    // 构建 ORDER BY 子句
    const orderConditions: string[] = [];
    if (options.sorts) {
      for (const sort of options.sorts) {
        this.validateIdentifier(sort.field);
        const escapedField = this.escapeIdentifier(sort.field);
        orderConditions.push(`${escapedField} ${sort.direction.toUpperCase()}`);
      }
    }

    // 组装完整查询
    const sql = [
      `SELECT * FROM ${safeTableName}`,
      whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '',
      orderConditions.length > 0 ? `ORDER BY ${orderConditions.join(', ')}` : '',
      options.limit ? `LIMIT $${paramIndex++}` : '',
      options.offset ? `OFFSET $${paramIndex++}` : ''
    ]
      .filter(Boolean)
      .join('\n');

    if (options.limit) params.push(options.limit);
    if (options.offset) params.push(options.offset);

    return { sql, params };
  }

  /**
   * 构建 INSERT 查询
   */
  static buildInsertQuery(
    tableName: string,
    projectId: string,
    data: Record<string, any>
  ): { sql: string; params: any[] } {
    const safeTableName = this.buildTableName(projectId, tableName);
    const fields = Object.keys(data);
    const params: any[] = [];

    // 验证字段名
    for (const field of fields) {
      this.validateIdentifier(field);
    }

    const escapedFields = fields.map(field => this.escapeIdentifier(field));
    const placeholders = fields.map((_, index) => `$${index + 1}`);

    const sql = `
      INSERT INTO ${safeTableName} (${escapedFields.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;

    params.push(...Object.values(data));

    return { sql, params };
  }

  /**
   * 构建 UPDATE 查询
   */
  static buildUpdateQuery(
    tableName: string,
    projectId: string,
    data: Record<string, any>,
    id: string
  ): { sql: string; params: any[] } {
    const safeTableName = this.buildTableName(projectId, tableName);
    const fields = Object.keys(data);
    const params: any[] = [];
    let paramIndex = 1;

    // 验证字段名
    for (const field of fields) {
      this.validateIdentifier(field);
    }

    const setConditions = fields.map(field => {
      const escapedField = this.escapeIdentifier(field);
      return `${escapedField} = $${paramIndex++}`;
    });

    const sql = `
      UPDATE ${safeTableName}
      SET ${setConditions.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    params.push(...Object.values(data), id);

    return { sql, params };
  }

  /**
   * 构建 DELETE 查询（软删除）
   */
  static buildDeleteQuery(
    tableName: string,
    projectId: string,
    id: string
  ): { sql: string; params: any[] } {
    const safeTableName = this.buildTableName(projectId, tableName);

    const sql = `
      UPDATE ${safeTableName}
      SET deleted_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    return { sql, params: [id] };
  }

  /**
   * 构建 CREATE TABLE 查询
   */
  static buildCreateTableQuery(
    tableName: string,
    projectId: string,
    columns: Array<{
      name: string;
      type: 'STRING' | 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'TIMESTAMP' | 'JSON';
      nullable?: boolean;
      defaultValue?: any;
      unique?: boolean;
    }>
  ): { sql: string; params: any[] } {
    const safeTableName = this.buildTableName(projectId, tableName);

    const typeMap = {
      STRING: 'VARCHAR(255)',
      TEXT: 'TEXT',
      NUMBER: 'DECIMAL(20,8)',
      BOOLEAN: 'BOOLEAN',
      DATE: 'DATE',
      TIMESTAMP: 'TIMESTAMP',
      JSON: 'JSONB'
    };

    const columnDefinitions = columns.map(col => {
      this.validateIdentifier(col.name);
      const escapedName = this.escapeIdentifier(col.name);
      const columnType = typeMap[col.type] || 'VARCHAR(255)';
      const nullable = col.nullable === false ? ' NOT NULL' : '';
      const defaultValue = col.defaultValue !== undefined ? ` DEFAULT ${this.formatDefaultValue(col.defaultValue)}` : '';
      const unique = col.unique ? ' UNIQUE' : '';

      return `  ${escapedName} ${columnType}${nullable}${defaultValue}${unique}`;
    });

    const sql = `
      CREATE TABLE ${safeTableName} (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ${columnDefinitions.join(',\n')},
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        deleted_at TIMESTAMP
      )
    `;

    return { sql, params: [] };
  }

  /**
   * 格式化默认值
   */
  private static formatDefaultValue(value: any): string {
    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`;
    }
    if (typeof value === 'boolean') {
      return value ? 'TRUE' : 'FALSE';
    }
    if (value === null) {
      return 'NULL';
    }
    return String(value);
  }
}

/**
 * 简单视图构建器
 */
export class SimpleViewBuilder {
  /**
   * 创建默认视图
   */
  static buildDefaultViewQuery(projectId: string, tableName: string): { sql: string; params: any[] } {
    const safeTableName = SimpleQueryBuilder.buildTableName(projectId, tableName);
    const safeViewName = SimpleQueryBuilder.buildViewName(projectId, tableName, 'default');

    const sql = `
      CREATE OR REPLACE VIEW ${safeViewName} AS
      SELECT
        id,
        created_at,
        updated_at
      FROM ${safeTableName}
      WHERE deleted_at IS NULL
    `;

    return { sql, params: [] };
  }

  /**
   * 创建自定义视图（基于 SafeViewDefinition 的简化版本）
   */
  static buildCustomViewQuery(
    projectId: string,
    tableName: string,
    viewName: string,
    definition: {
      columns: Array<{ source: string; alias?: string }>;
      filters?: Filter[];
      sorts?: Sort[];
      limit?: number;
    }
  ): { sql: string; params: any[] } {
    const safeTableName = SimpleQueryBuilder.buildTableName(projectId, tableName);
    const safeViewName = SimpleQueryBuilder.buildViewName(projectId, tableName, viewName);
    const params: any[] = [];
    let paramIndex = 1;

    // 构建 SELECT 子句
    const selectColumns = definition.columns.map(col => {
      SimpleQueryBuilder.validateIdentifier(col.source);
      const escapedColumn = SimpleQueryBuilder.escapeIdentifier(col.source);
      return col.alias
        ? `${escapedColumn} AS ${SimpleQueryBuilder.escapeIdentifier(col.alias)}`
        : escapedColumn;
    });

    // 构建 WHERE 子句
    const whereConditions: string[] = ['deleted_at IS NULL'];
    if (definition.filters) {
      for (const filter of definition.filters) {
        SimpleQueryBuilder.validateIdentifier(filter.field);
        const escapedField = SimpleQueryBuilder.escapeIdentifier(filter.field);

        switch (filter.operator) {
          case 'eq':
            whereConditions.push(`${escapedField} = $${paramIndex++}`);
            params.push(filter.value);
            break;
          case 'gt':
            whereConditions.push(`${escapedField} > $${paramIndex++}`);
            params.push(filter.value);
            break;
          // 其他运算符类似处理...
        }
      }
    }

    // 构建 ORDER BY 子句
    const orderConditions: string[] = [];
    if (definition.sorts) {
      for (const sort of definition.sorts) {
        SimpleQueryBuilder.validateIdentifier(sort.field);
        const escapedField = SimpleQueryBuilder.escapeIdentifier(sort.field);
        orderConditions.push(`${escapedField} ${sort.direction.toUpperCase()}`);
      }
    }

    const sql = [
      `CREATE OR REPLACE VIEW ${safeViewName} AS`,
      `SELECT ${selectColumns.join(', ')}`,
      `FROM ${safeTableName}`,
      `WHERE ${whereConditions.join(' AND ')}`,
      orderConditions.length > 0 ? `ORDER BY ${orderConditions.join(', ')}` : '',
      definition.limit ? `LIMIT ${definition.limit}` : ''
    ]
      .filter(Boolean)
      .join('\n');

    return { sql, params };
  }

  /**
   * 创建物化视图
   */
  static buildMaterializedViewQuery(
    projectId: string,
    tableName: string,
    viewName: string,
    definition: {
      columns: Array<{ source: string; alias?: string; aggregate?: string }>;
      groups?: string[];
      filters?: Filter[];
    }
  ): { sql: string; params: any[] } {
    const safeTableName = SimpleQueryBuilder.buildTableName(projectId, tableName);
    const safeViewName = SimpleQueryBuilder.buildViewName(projectId, tableName, viewName);
    const params: any[] = [];

    // 构建 SELECT 子句（支持聚合函数）
    const selectColumns = definition.columns.map(col => {
      SimpleQueryBuilder.validateIdentifier(col.source);
      const escapedColumn = SimpleQueryBuilder.escapeIdentifier(col.source);

      if (col.aggregate) {
        const escapedAlias = col.alias
          ? ` AS ${SimpleQueryBuilder.escapeIdentifier(col.alias)}`
          : '';
        return `${col.aggregate}(${escapedColumn})${escapedAlias}`;
      }

      return col.alias
        ? `${escapedColumn} AS ${SimpleQueryBuilder.escapeIdentifier(col.alias)}`
        : escapedColumn;
    });

    // 构建 WHERE 子句
    const whereConditions: string[] = ['deleted_at IS NULL'];
    if (definition.filters) {
      // 简化的过滤处理
    }

    // 构建 GROUP BY 子句
    const groupByClause = definition.groups && definition.groups.length > 0
      ? `GROUP BY ${definition.groups.map(col => SimpleQueryBuilder.escapeIdentifier(col)).join(', ')}`
      : '';

    const sql = [
      `CREATE MATERIALIZED VIEW ${safeViewName} AS`,
      `SELECT ${selectColumns.join(', ')}`,
      `FROM ${safeTableName}`,
      `WHERE ${whereConditions.join(' AND ')}`,
      groupByClause
    ]
      .filter(Boolean)
      .join('\n');

    return { sql, params };
  }
}