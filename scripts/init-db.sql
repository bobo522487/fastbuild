-- 创建数据库和用户配置
-- PostgreSQL 初始化脚本

-- 设置默认编码
ALTER USER postgres SET client_encoding TO 'utf8';
ALTER USER postgres SET default_transaction_isolation TO 'read committed';
ALTER USER postgres SET timezone TO 'UTC';

-- 创建扩展（如果需要）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";