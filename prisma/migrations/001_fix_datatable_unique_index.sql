-- 修复 DataTable 唯一约束问题
-- PostgreSQL 中 NULL 值在唯一约束中被视为不同值，导致重复问题
-- 删除旧的唯一约束并添加 partial unique index

-- 删除旧的唯一约束（如果存在）
DROP INDEX IF EXISTS "DataTable_projectId_name_deletedAt_key";

-- 创建 partial unique index，只为未删除的记录强制唯一性
CREATE UNIQUE INDEX "DataTable_active_unique_name"
ON "DataTable" (projectId, name)
WHERE deletedAt IS NULL;

-- 添加复合索引用于查询活跃表
CREATE INDEX "DataTable_active_lookup"
ON "DataTable" (projectId, name)
WHERE deletedAt IS NULL;