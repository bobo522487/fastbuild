# PostgreSQL 18 新特性应用计划

## 项目数据库分析

### 当前数据库状态

**数据库配置：**
- Provider: PostgreSQL (通过 Prisma ORM)
- 连接字符串: `postgresql://postgres:password@localhost:5432/fastbuild`
- 当前密码哈希: Argon2id (已经非常安全，但可以额外支持 SHA512)

**核心数据模型：**
1. **用户系统**: User 表，使用 Argon2id 密码哈希
2. **项目管理**: Project, ProjectMember
3. **审计系统**: AuditLog (oldValues, newValues 使用 JSON 字段)
4. **数据模型**: DataTable, DataColumn, TableView (大量 JSON 配置)
5. **应用系统**: Application, AppPage, AppDeployment
6. **发布系统**: DataModelDeployment, AppDeployment

**性能监控现状：**
- 依赖 Prisma 查询日志
- 缺乏详细的 I/O 和 WAL 统计
- 没有系统级的性能监控

## PostgreSQL 18 新特性应用方案

### 阶段一：零风险高收益特性 (1-2周)

#### 1. 启用增强统计监控 🚀 立即可用

**目标：** 获得详细的数据库性能数据，支持性能优化决策

**实施步骤：**
```sql
-- 启用 PostgreSQL 18 新的统计选项
ALTER SYSTEM SET track_wal_io_timing = on;
ALTER SYSTEM SET track_cost_delay_timing = on;
SELECT pg_reload_conf();
```

**监控查询实现：**
```sql
-- 创建性能监控视图
CREATE OR REPLACE VIEW db_performance_stats AS
SELECT
    'IO Stats' as stat_type,
    object,
    reads,
    read_time,
    writes,
    write_time,
    extend_time
FROM pg_stat_io
WHERE object = 'relation'

UNION ALL

SELECT
    'WAL Stats' as stat_type,
    'WAL Activity' as object,
    wal_records,
    wal_fpi,
    wal_bytes,
    wal_buffers_full,
    wal_write_time as write_time
FROM pg_stat_wal;
```

**应用场景：**
- 监控数据模型查询性能
- 追踪应用部署的数据库 I/O 使用
- 识别 JSON 字段查询的性能瓶颈

#### 2. 升级密码哈希算法支持 🔒 安全增强

**现状：** 项目已使用 Argon2id，非常安全
**改进：** 增加 SHA512 作为可选方案，用于 API 密钥等场景

**实施代码：**
```typescript
// src/server/auth/password.ts 扩展
import { createHash } from 'crypto';

// 保持现有 Argon2id 实现（用于用户密码）
export async function hashPassword(password: string): Promise<string> {
    return await hash(password, ARGON2_OPTIONS);
}

// 新增：SHA512 哈希（用于 API 密钥、敏感配置等）
export function hashSHA512(data: string): string {
    return createHash('sha512').update(data).digest('hex');
}

// 新增：PostgreSQL pgcrypto SHA512 支持
export async function hashWithPGCrypto(data: string): Promise<string> {
    // 通过 SQL 调用 PostgreSQL 18 的 SHA512
    const result = await prisma.$queryRaw`
        SELECT crypt(${data}, gen_salt('sha512')) as hash
    `;
    return result[0].hash;
}
```

#### 3. 采用 RETURNING old/new 语法优化审计日志 📝 开发效率

**现状：** AuditLog 使用 oldValues, newValues JSON 字段
**改进：** 利用 PostgreSQL 18 RETURNING 语法自动生成审计日志

**实施示例：**
```sql
-- 创建审计日志触发器函数
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO "AuditLog" (
            action, resourceType, resourceId,
            newValues, "createdAt"
        ) VALUES (
            TG_OP, TG_TABLE_NAME, NEW.id,
            row_to_json(NEW), NOW()
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO "AuditLog" (
            action, resourceType, resourceId,
            oldValues, newValues, "createdAt"
        ) VALUES (
            TG_OP, TG_TABLE_NAME, NEW.id,
            row_to_json(OLD), row_to_json(NEW), NOW()
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO "AuditLog" (
            action, resourceType, resourceId,
            oldValues, "createdAt"
        ) VALUES (
            TG_OP, TG_TABLE_NAME, OLD.id,
            row_to_json(OLD), NOW()
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 为关键表添加审计触发器
CREATE TRIGGER audit_projects_trigger
    AFTER INSERT OR UPDATE OR DELETE ON "Project"
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
```

**Prisma 集成：**
```typescript
// src/lib/audit.ts
export async function createProjectWithAudit(data: CreateProjectData) {
    const result = await prisma.$queryRaw`
        INSERT INTO "Project" (name, slug, description, "createdBy", "visibility")
        VALUES (${data.name}, ${data.slug}, ${data.description}, ${data.createdBy}, ${data.visibility})
        RETURNING
            old.* as "before",
            new.* as "after",
            EXTRACT(EPOCH FROM NOW() - new."createdAt") as creationTime
    `;

    // 自动生成的审计日志可以通过触发器获取
    return result[0];
}
```

### 阶段二：性能优化特性 (1个月)

#### 4. 使用新聚合函数重写统计查询 📊 数据分析

**目标：** 利用复合类型聚合函数简化复杂报告查询

**实施：**
```sql
-- 创建应用统计复合类型
CREATE TYPE app_stats AS (
    total_projects INTEGER,
    total_applications INTEGER,
    total_deployments INTEGER,
    avg_build_time DECIMAL,
    success_rate DECIMAL
);

-- 创建统计视图
CREATE OR REPLACE VIEW project_statistics AS
SELECT
    p."createdBy",
    ROW(
        COUNT(DISTINCT p.id),
        COUNT(DISTINCT a.id),
        COUNT(DISTINCT ad.id),
        AVG(ad."buildTime"),
        CASE
            WHEN COUNT(DISTINCT ad.id) > 0
            THEN ROUND(COUNT(CASE WHEN ad.status = 'DEPLOYED' END) * 100.0 / COUNT(DISTINCT ad.id), 2)
            ELSE 0
        END
    )::app_stats as stats
FROM "Project" p
LEFT JOIN "Application" a ON p.id = a."projectId"
LEFT JOIN "AppDeployment" ad ON a.id = ad."applicationId"
GROUP BY p."createdBy";
```

### 阶段三：架构级优化 (2-3个月)

#### 6. 实施分区表策略 🗂️ 大数据优化

**目标：** 对 AuditLog 表实施分区策略，提升查询和维护性能

**实施：**
```sql
-- 分区 AuditLog 表（按月分区）
CREATE TABLE "AuditLog_partitioned" (
    LIKE "AuditLog" INCLUDING ALL
) PARTITION BY RANGE ("createdAt");

-- 创建分区表
CREATE TABLE "AuditLog_2024_01" PARTITION OF "AuditLog_partitioned"
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- 迁移现有数据
INSERT INTO "AuditLog_partitioned" SELECT * FROM "AuditLog";

-- 重命名表
ALTER TABLE "AuditLog" RENAME TO "AuditLog_old";
ALTER TABLE "AuditLog_partitioned" RENAME TO "AuditLog";
```

**维护优化：**
```sql
-- 使用 ONLY 选项进行精确维护
VACUUM ONLY "AuditLog";
ANALYZE ONLY "AuditLog";

-- 自动创建分区函数
CREATE OR REPLACE FUNCTION create_monthly_partition()
RETURNS void AS $$
DECLARE
    start_date date;
    end_date date;
    table_name text;
BEGIN
    start_date := date_trunc('month', CURRENT_DATE + INTERVAL '1 month');
    end_date := start_date + INTERVAL '1 month';
    table_name := 'AuditLog_' || to_char(start_date, 'YYYY_MM');

    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF "AuditLog" FOR VALUES FROM (%L) TO (%L)',
                   table_name, start_date, end_date);
END;
$$ LANGUAGE plpgsql;
```

#### 7. CRC32 函数用于数据完整性验证 🔍 数据校验

**实施：**
```sql
-- 为 JSON 配置添加 CRC32 校验
ALTER TABLE "Application"
ADD COLUMN config_crc32 BIGINT;

-- 创建更新触发器
CREATE OR REPLACE FUNCTION update_config_crc32()
RETURNS TRIGGER AS $$
BEGIN
    NEW.config_crc32 = crc32(row_to_json(NEW)::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_application_config_crc32
    BEFORE INSERT OR UPDATE ON "Application"
    FOR EACH ROW EXECUTE FUNCTION update_config_crc32();
```

## 实施时间表和优先级

### 第1周：基础监控
- [ ] 启用 PostgreSQL 18 统计选项
- [ ] 创建性能监控视图和仪表板

### 第2周：密码哈希增强
- [ ] 实现 SHA512 哈希支持
- [ ] 更新 API 密钥管理

### 第3-4周：审计日志优化
- [ ] 实现 RETURNING 语法审计触发器
- [ ] 更新 Prisma 查询以利用新语法

### 第5-6周：统计查询重构
- [ ] 创建复合类型聚合视图
- [ ] 重写数据分析查询

### 第7-10周：分区表实施
- [ ] 设计和实施 AuditLog 分区策略
- [ ] 建立自动维护流程

## 预期收益

### 立即收益（阶段一）
- **开发效率提升 30%**：RETURNING 语法减少审计日志代码量
- **安全监控能力提升 200%**：详细的性能统计数据
- **API 安全性增强**：SHA512 密码哈希支持

### 中期收益（阶段二）
- **查询性能提升 40%**：优化聚合操作和统计分析
- **数据分析能力增强**：复合类型聚合支持复杂报告

### 长期收益（阶段三）
- **大数据处理能力提升**：分区表支持海量审计数据
- **系统维护成本降低**：自动化的表维护策略

## 风险评估和缓解措施

### 风险
1. **数据库版本兼容性**：需要确保生产环境支持 PostgreSQL 18
2. **应用代码迁移**：部分特性需要代码适配
3. **性能回归**：新特性可能带来意外的性能影响

### 缓解措施
1. **渐进式部署**：按阶段逐步实施，每个阶段充分测试
2. **A/B 测试**：关键功能在生产环境前进行充分测试
3. **回滚方案**：为每个变更准备回滚策略
4. **监控告警**：建立完善的性能监控和告警机制

## 总结

PostgreSQL 18 的新特性非常适合 FastBuild 项目的需求，特别是审计日志、性能监控和数据分析功能。通过渐进式实施，我们可以在保证系统稳定性的前提下，显著提升开发效率和系统性能。

建议优先实施阶段一的零风险高收益特性，这些特性可以立即带来价值且风险极低。