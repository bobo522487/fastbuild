-- FastBuild 短ID生成系统
-- 实现设计文档中的 generateShortId(prefix) 函数
-- 格式: {prefix}_{nanoid} 例如: proj_a1b2c3d4, user_def456rst

-- 创建ID生成函数
CREATE OR REPLACE FUNCTION generate_short_id(prefix TEXT)
RETURNS TEXT AS $$
DECLARE
    -- 定义字符集：小写字母 + 数字
    charset TEXT := '0123456789abcdefghijklmnopqrstuvwxyz';
    result TEXT;
    nanoid_part TEXT;
    i INTEGER;
    random_index INTEGER;
BEGIN
    -- 验证前缀
    IF prefix IS NULL OR prefix = '' THEN
        RAISE EXCEPTION 'Prefix cannot be null or empty';
    END IF;

    -- 生成8位随机字符串
    nanoid_part := '';
    FOR i IN 1..8 LOOP
        random_index := floor(random() * length(charset)) + 1;
        nanoid_part := nanoid_part || substr(charset, random_index, 1);
    END LOOP;

    -- 组合前缀和随机部分
    result := prefix || '_' || nanoid_part;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 为不同实体创建便捷函数
CREATE OR REPLACE FUNCTION generate_user_id() RETURNS TEXT AS $$
BEGIN
    RETURN generate_short_id('user');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_project_id() RETURNS TEXT AS $$
BEGIN
    RETURN generate_short_id('proj');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_app_id() RETURNS TEXT AS $$
BEGIN
    RETURN generate_short_id('app');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_table_id() RETURNS TEXT AS $$
BEGIN
    RETURN generate_short_id('tbl');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_view_id() RETURNS TEXT AS $$
BEGIN
    RETURN generate_short_id('view');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_column_id() RETURNS TEXT AS $$
BEGIN
    RETURN generate_short_id('col');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_member_id() RETURNS TEXT AS $$
BEGIN
    RETURN generate_short_id('mem');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_page_id() RETURNS TEXT AS $$
BEGIN
    RETURN generate_short_id('page');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_deployment_id() RETURNS TEXT AS $$
BEGIN
    RETURN generate_short_id('dep');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_audit_log_id() RETURNS TEXT AS $$
BEGIN
    RETURN generate_short_id('log');
END;
$$ LANGUAGE plpgsql;

-- 测试函数
SELECT generate_short_id('proj') AS project_id_example;
SELECT generate_short_id('user') AS user_id_example;
SELECT generate_short_id('app') AS app_id_example;

-- 验证ID格式函数
CREATE OR REPLACE FUNCTION validate_short_id_format(id TEXT, expected_prefix TEXT DEFAULT NULL) RETURNS BOOLEAN AS $$
BEGIN
    IF expected_prefix IS NOT NULL THEN
        RETURN id ~ '^' || expected_prefix || '_[a-z0-9]{8}$';
    ELSE
        RETURN id ~ '^[a-z]{3,4}_[a-z0-9]{8}$';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 添加注释
COMMENT ON FUNCTION generate_short_id(TEXT) IS '生成FastBuild短ID: {prefix}_{8位随机字符串}';
COMMENT ON FUNCTION generate_user_id() IS '生成用户ID: user_xxxxxxxx';
COMMENT ON FUNCTION generate_project_id() IS '生成项目ID: proj_xxxxxxxx';
COMMENT ON FUNCTION generate_app_id() IS '生成应用ID: app_xxxxxxxx';
COMMENT ON FUNCTION validate_short_id_format(TEXT, TEXT) IS '验证短ID格式是否符合规范';