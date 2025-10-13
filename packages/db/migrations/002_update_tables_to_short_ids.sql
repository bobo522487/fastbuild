-- FastBuild 表结构更新迁移脚本
-- 创建时间：2024-01-01
-- 版本：1.0.0
-- 描述：将现有表的主键更新为短ID格式

-- ========================================
-- 1. 认证系统表更新
-- ========================================

-- 更新 User 表
DO $$
BEGIN
  -- 检查表是否存在
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user') THEN
    -- 备份现有数据（如果需要）
    -- CREATE TABLE user_backup AS SELECT * FROM "User";

    -- 删除现有主键约束（如果存在）
    ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_pkey";

    -- 添加新的主键列（如果不存在）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'user' AND column_name = 'id') THEN
      ALTER TABLE "User" ADD COLUMN id TEXT;
    END IF;

    -- 为现有记录生成短ID
    UPDATE "User"
    SET id = generate_short_id('user')
    WHERE id IS NULL;

    -- 设置主键
    ALTER TABLE "User" ALTER COLUMN id SET NOT NULL;
    ALTER TABLE "User" ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);

    -- 设置默认值
    ALTER TABLE "User" ALTER COLUMN id SET DEFAULT generate_short_id('user');

    RAISE NOTICE 'User table updated successfully';
  END IF;
END $$;

-- 更新 Account 表
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'account') THEN
    ALTER TABLE "Account" DROP CONSTRAINT IF EXISTS "Account_pkey";

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'account' AND column_name = 'id') THEN
      ALTER TABLE "Account" ADD COLUMN id TEXT;
    END IF;

    UPDATE "Account"
    SET id = generate_short_id('acct')
    WHERE id IS NULL;

    ALTER TABLE "Account" ALTER COLUMN id SET NOT NULL;
    ALTER TABLE "Account" ADD CONSTRAINT "Account_pkey" PRIMARY KEY (id);
    ALTER TABLE "Account" ALTER COLUMN id SET DEFAULT generate_short_id('acct');

    RAISE NOTICE 'Account table updated successfully';
  END IF;
END $$;

-- 更新 Session 表
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'session') THEN
    ALTER TABLE "Session" DROP CONSTRAINT IF EXISTS "Session_pkey";

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'session' AND column_name = 'id') THEN
      ALTER TABLE "Session" ADD COLUMN id TEXT;
    END IF;

    UPDATE "Session"
    SET id = generate_short_id('sess')
    WHERE id IS NULL;

    ALTER TABLE "Session" ALTER COLUMN id SET NOT NULL;
    ALTER TABLE "Session" ADD CONSTRAINT "Session_pkey" PRIMARY KEY (id);
    ALTER TABLE "Session" ALTER COLUMN id SET DEFAULT generate_short_id('sess');

    RAISE NOTICE 'Session table updated successfully';
  END IF;
END $$;

-- 更新 Verification 表
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'verification') THEN
    ALTER TABLE "Verification" DROP CONSTRAINT IF EXISTS "Verification_pkey";

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'verification' AND column_name = 'id') THEN
      ALTER TABLE "Verification" ADD COLUMN id TEXT;
    END IF;

    UPDATE "Verification"
    SET id = generate_short_id('veri')
    WHERE id IS NULL;

    ALTER TABLE "Verification" ALTER COLUMN id SET NOT NULL;
    ALTER TABLE "Verification" ADD CONSTRAINT "Verification_pkey" PRIMARY KEY (id);
    ALTER TABLE "Verification" ALTER COLUMN id SET DEFAULT generate_short_id('veri');

    RAISE NOTICE 'Verification table updated successfully';
  END IF;
END $$;

-- ========================================
-- 2. 项目系统表更新
-- ========================================

-- 更新 Project 表
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project') THEN
    ALTER TABLE "Project" DROP CONSTRAINT IF EXISTS "Project_pkey";

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'project' AND column_name = 'id') THEN
      ALTER TABLE "Project" ADD COLUMN id TEXT;
    END IF;

    UPDATE "Project"
    SET id = generate_short_id('proj')
    WHERE id IS NULL;

    ALTER TABLE "Project" ALTER COLUMN id SET NOT NULL;
    ALTER TABLE "Project" ADD CONSTRAINT "Project_pkey" PRIMARY KEY (id);
    ALTER TABLE "Project" ALTER COLUMN id SET DEFAULT generate_short_id('proj');

    RAISE NOTICE 'Project table updated successfully';
  END IF;
END $$;

-- 更新 ProjectMember 表
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projectmember') THEN
    ALTER TABLE "ProjectMember" DROP CONSTRAINT IF EXISTS "ProjectMember_pkey";

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'projectmember' AND column_name = 'id') THEN
      ALTER TABLE "ProjectMember" ADD COLUMN id TEXT;
    END IF;

    UPDATE "ProjectMember"
    SET id = generate_short_id('mem')
    WHERE id IS NULL;

    ALTER TABLE "ProjectMember" ALTER COLUMN id SET NOT NULL;
    ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_pkey" PRIMARY KEY (id);
    ALTER TABLE "ProjectMember" ALTER COLUMN id SET DEFAULT generate_short_id('mem');

    RAISE NOTICE 'ProjectMember table updated successfully';
  END IF;
END $$;

-- ========================================
-- 3. 应用系统表更新
-- ========================================

-- 更新 Application 表
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'application') THEN
    ALTER TABLE "Application" DROP CONSTRAINT IF EXISTS "Application_pkey";

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'application' AND column_name = 'id') THEN
      ALTER TABLE "Application" ADD COLUMN id TEXT;
    END IF;

    UPDATE "Application"
    SET id = generate_short_id('app')
    WHERE id IS NULL;

    ALTER TABLE "Application" ALTER COLUMN id SET NOT NULL;
    ALTER TABLE "Application" ADD CONSTRAINT "Application_pkey" PRIMARY KEY (id);
    ALTER TABLE "Application" ALTER COLUMN id SET DEFAULT generate_short_id('app');

    RAISE NOTICE 'Application table updated successfully';
  END IF;
END $$;

-- 更新 AppPage 表
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'apppage') THEN
    ALTER TABLE "AppPage" DROP CONSTRAINT IF EXISTS "AppPage_pkey";

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'apppage' AND column_name = 'id') THEN
      ALTER TABLE "AppPage" ADD COLUMN id TEXT;
    END IF;

    UPDATE "AppPage"
    SET id = generate_short_id('page')
    WHERE id IS NULL;

    ALTER TABLE "AppPage" ALTER COLUMN id SET NOT NULL;
    ALTER TABLE "AppPage" ADD CONSTRAINT "AppPage_pkey" PRIMARY KEY (id);
    ALTER TABLE "AppPage" ALTER COLUMN id SET DEFAULT generate_short_id('page');

    RAISE NOTICE 'AppPage table updated successfully';
  END IF;
END $$;

-- ========================================
-- 4. 动态表系统表更新
-- ========================================

-- 更新 DataTable 表
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'datatable') THEN
    ALTER TABLE "DataTable" DROP CONSTRAINT IF EXISTS "DataTable_pkey";

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'datatable' AND column_name = 'id') THEN
      ALTER TABLE "DataTable" ADD COLUMN id TEXT;
    END IF;

    UPDATE "DataTable"
    SET id = generate_short_id('tbl')
    WHERE id IS NULL;

    ALTER TABLE "DataTable" ALTER COLUMN id SET NOT NULL;
    ALTER TABLE "DataTable" ADD CONSTRAINT "DataTable_pkey" PRIMARY KEY (id);
    ALTER TABLE "DataTable" ALTER COLUMN id SET DEFAULT generate_short_id('tbl');

    RAISE NOTICE 'DataTable table updated successfully';
  END IF;
END $$;

-- 更新 DataColumn 表
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'datacolumn') THEN
    ALTER TABLE "DataColumn" DROP CONSTRAINT IF EXISTS "DataColumn_pkey";

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'datacolumn' AND column_name = 'id') THEN
      ALTER TABLE "DataColumn" ADD COLUMN id TEXT;
    END IF;

    UPDATE "DataColumn"
    SET id = generate_short_id('col')
    WHERE id IS NULL;

    ALTER TABLE "DataColumn" ALTER COLUMN id SET NOT NULL;
    ALTER TABLE "DataColumn" ADD CONSTRAINT "DataColumn_pkey" PRIMARY KEY (id);
    ALTER TABLE "DataColumn" ALTER COLUMN id SET DEFAULT generate_short_id('col');

    RAISE NOTICE 'DataColumn table updated successfully';
  END IF;
END $$;

-- 更新 TableView 表
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tableview') THEN
    ALTER TABLE "TableView" DROP CONSTRAINT IF EXISTS "TableView_pkey";

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'tableview' AND column_name = 'id') THEN
      ALTER TABLE "TableView" ADD COLUMN id TEXT;
    END IF;

    UPDATE "TableView"
    SET id = generate_short_id('view')
    WHERE id IS NULL;

    ALTER TABLE "TableView" ALTER COLUMN id SET NOT NULL;
    ALTER TABLE "TableView" ADD CONSTRAINT "TableView_pkey" PRIMARY KEY (id);
    ALTER TABLE "TableView" ALTER COLUMN id SET DEFAULT generate_short_id('view');

    RAISE NOTICE 'TableView table updated successfully';
  END IF;
END $$;

-- ========================================
-- 5. 审计和发布系统表更新
-- ========================================

-- 更新 AuditLog 表
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'auditlog') THEN
    ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_pkey";

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'auditlog' AND column_name = 'id') THEN
      ALTER TABLE "AuditLog" ADD COLUMN id TEXT;
    END IF;

    UPDATE "AuditLog"
    SET id = generate_short_id('log')
    WHERE id IS NULL;

    ALTER TABLE "AuditLog" ALTER COLUMN id SET NOT NULL;
    ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);
    ALTER TABLE "AuditLog" ALTER COLUMN id SET DEFAULT generate_short_id('log');

    RAISE NOTICE 'AuditLog table updated successfully';
  END IF;
END $$;

-- 更新 DataModelDeployment 表
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'datamodeldeployment') THEN
    ALTER TABLE "DataModelDeployment" DROP CONSTRAINT IF EXISTS "DataModelDeployment_pkey";

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'datamodeldeployment' AND column_name = 'id') THEN
      ALTER TABLE "DataModelDeployment" ADD COLUMN id TEXT;
    END IF;

    UPDATE "DataModelDeployment"
    SET id = generate_short_id('dep')
    WHERE id IS NULL;

    ALTER TABLE "DataModelDeployment" ALTER COLUMN id SET NOT NULL;
    ALTER TABLE "DataModelDeployment" ADD CONSTRAINT "DataModelDeployment_pkey" PRIMARY KEY (id);
    ALTER TABLE "DataModelDeployment" ALTER COLUMN id SET DEFAULT generate_short_id('dep');

    RAISE NOTICE 'DataModelDeployment table updated successfully';
  END IF;
END $$;

-- 更新 AppDeployment 表
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'appdeployment') THEN
    ALTER TABLE "AppDeployment" DROP CONSTRAINT IF EXISTS "AppDeployment_pkey";

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'appdeployment' AND column_name = 'id') THEN
      ALTER TABLE "AppDeployment" ADD COLUMN id TEXT;
    END IF;

    UPDATE "AppDeployment"
    SET id = generate_short_id('dep')
    WHERE id IS NULL;

    ALTER TABLE "AppDeployment" ALTER COLUMN id SET NOT NULL;
    ALTER TABLE "AppDeployment" ADD CONSTRAINT "AppDeployment_pkey" PRIMARY KEY (id);
    ALTER TABLE "AppDeployment" ALTER COLUMN id SET DEFAULT generate_short_id('dep');

    RAISE NOTICE 'AppDeployment table updated successfully';
  END IF;
END $$;

-- ========================================
-- 6. 创建前缀索引（性能优化）
-- ========================================

-- 为经常按前缀查询的表创建前缀索引
DO $$
BEGIN
  -- User 表前缀索引
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user') THEN
    CREATE INDEX IF NOT EXISTS idx_user_prefix ON "User" (extract_id_prefix(id));
    RAISE NOTICE 'User prefix index created';
  END IF;

  -- Project 表前缀索引
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project') THEN
    CREATE INDEX IF NOT EXISTS idx_project_prefix ON "Project" (extract_id_prefix(id));
    RAISE NOTICE 'Project prefix index created';
  END IF;

  -- Application 表前缀索引
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'application') THEN
    CREATE INDEX IF NOT EXISTS idx_application_prefix ON "Application" (extract_id_prefix(id));
    RAISE NOTICE 'Application prefix index created';
  END IF;
END $$;

-- ========================================
-- 7. 迁移验证和报告
-- ========================================

-- 验证所有表都有短ID主键
DO $$
DECLARE
  table_name TEXT;
  id_column_exists BOOLEAN;
  has_primary_key BOOLEAN;
  migration_report TEXT := '';
BEGIN
  FOR table_name IN VALUES
    ('user'), ('account'), ('session'), ('verification'),
    ('project'), ('projectmember'), ('application'), ('apppage'),
    ('datatable'), ('datacolumn'), ('tableview'),
    ('auditlog'), ('datamodeldeployment'), ('appdeployment')
  LOOP
    -- 检查ID列是否存在
    SELECT EXISTS(
      SELECT 1 FROM information_schema.columns
      WHERE table_name = lower(table_name) AND column_name = 'id'
    ) INTO id_column_exists;

    -- 检查是否有主键
    SELECT EXISTS(
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_name = lower(table_name) AND constraint_type = 'PRIMARY KEY'
    ) INTO has_primary_key;

    IF id_column_exists AND has_primary_key THEN
      migration_report := migration_report || '✓ ' || table_name || ' updated successfully\n';
    ELSE
      migration_report := migration_report || '✗ ' || table_name || ' update failed\n';
    END IF;
  END LOOP;

  RAISE NOTICE 'ShortID Migration Report:\n%', migration_report;
END $$;

-- ========================================
-- 8. 清理函数（可选）
-- ========================================

/*
-- 删除测试函数（生产环境运行）
DROP FUNCTION IF EXISTS test_short_id_generation();

-- 清理备份表（确认迁移成功后运行）
-- DROP TABLE IF EXISTS user_backup;
-- DROP TABLE IF EXISTS account_backup;
-- ... 其他备份表
*/

-- ========================================
-- 9. 回滚脚本（备用）
-- ========================================

/*
-- 如果需要回滚，可以执行以下操作：

-- 1. 恢复原有主键（如果有备份）
-- ALTER TABLE "User" DROP CONSTRAINT "User_pkey";
-- ALTER TABLE "User" DROP COLUMN id;
-- 从备份表恢复数据...

-- 2. 删除短ID相关函数
-- DROP FUNCTION IF EXISTS generate_short_id(TEXT);
-- DROP FUNCTION IF EXISTS validate_short_id(TEXT, TEXT);
-- DROP FUNCTION IF EXISTS extract_id_prefix(TEXT);
-- DROP FUNCTION IF EXISTS extract_id_random(TEXT);

-- 3. 删除前缀索引
-- DROP INDEX IF EXISTS idx_user_prefix;
-- DROP INDEX IF EXISTS idx_project_prefix;
-- ... 其他索引
*/

COMMENT ON SCRIPT IS 'FastBuild 短ID系统表结构迁移 - 将所有表主键更新为短ID格式';