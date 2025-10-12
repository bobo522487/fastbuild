/**
 * FastBuild ID Generator - Application Layer
 *
 * 统一ID生成服务，替代PostgreSQL数据库函数
 * 使用nanoid库与自定义字符集实现短ID格式
 *
 * ID格式: {prefix}_{nanoid} 例如: proj_a1b2c3d4, user_def456rst
 * 符合data-schema.md架构设计要求
 */

import { nanoid } from 'nanoid';

/**
 * FastBuild统一ID生成器
 * 使用标准nanoid库生成随机字符串
 */
export class FastBuildIdGenerator {
	/**
	 * 生成标准短ID
	 * @param prefix - ID前缀（如 'user', 'proj', 'app'）
	 * @param length - 随机部分长度（默认8位）
	 * @returns 格式: {prefix}_{nanoid}
	 */
	static generateShortId(prefix: string, length: number = 8): string {
		if (!prefix || prefix.trim() === '') {
			throw new Error('ID prefix cannot be null or empty');
		}

		// 使用标准nanoid生成随机字符串
		const nanoIdPart = nanoid(length);

		// 组合前缀和随机部分
		return `${prefix}_${nanoIdPart}`;
	}

	/**
	 * 用户ID生成器
	 * @returns 格式: user_xxxxxxxx
	 */
	static generateUserId(): string {
		return this.generateShortId('user');
	}

	/**
	 * 项目ID生成器
	 * @returns 格式: proj_xxxxxxxx
	 */
	static generateProjectId(): string {
		return this.generateShortId('proj');
	}

	/**
	 * 应用ID生成器
	 * @returns 格式: app_xxxxxxxx
	 */
	static generateAppId(): string {
		return this.generateShortId('app');
	}

	/**
	 * 数据表ID生成器
	 * @returns 格式: tbl_xxxxxxxx
	 */
	static generateTableId(): string {
		return this.generateShortId('tbl');
	}

	/**
	 * 视图ID生成器
	 * @returns 格式: view_xxxxxxxx
	 */
	static generateViewId(): string {
		return this.generateShortId('view');
	}

	/**
	 * 列ID生成器
	 * @returns 格式: col_xxxxxxxx
	 */
	static generateColumnId(): string {
		return this.generateShortId('col');
	}

	/**
	 * 成员ID生成器
	 * @returns 格式: mem_xxxxxxxx
	 */
	static generateMemberId(): string {
		return this.generateShortId('mem');
	}

	/**
	 * 页面ID生成器
	 * @returns 格式: page_xxxxxxxx
	 */
	static generatePageId(): string {
		return this.generateShortId('page');
	}

	/**
	 * 部署ID生成器
	 * @returns 格式: dep_xxxxxxxx
	 */
	static generateDeploymentId(): string {
		return this.generateShortId('dep');
	}

	/**
	 * 审计日志ID生成器
	 * @returns 格式: log_xxxxxxxx
	 */
	static generateAuditLogId(): string {
		return this.generateShortId('log');
	}

	/**
	 * 验证ID格式
	 * @param id - 要验证的ID
	 * @param expectedPrefix - 期望的前缀（可选）
	 * @returns 是否符合格式要求
	 */
	static validateShortIdFormat(id: string, expectedPrefix?: string): boolean {
		if (!id || typeof id !== 'string') {
			return false;
		}

		if (expectedPrefix) {
			// 验证特定前缀格式
			// nanoid默认字符集: -0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz
			const regex = new RegExp(`^${expectedPrefix}_[\\w-]{8}$`);
			return regex.test(id);
		} else {
			// 验证通用短ID格式（3-4位前缀 + 8位随机字符）
			// nanoid默认字符集: -0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz
			return /^[a-z]{3,4}_[\w-]{8}$/.test(id);
		}
	}

	/**
	 * 从ID中提取前缀
	 * @param id - 完整ID
	 * @returns 前缀部分
	 */
	static extractPrefix(id: string): string | null {
		if (!this.validateShortIdFormat(id)) {
			return null;
		}
		const parts = id.split('_');
		return parts[0] || null;
	}

	/**
	 * 从ID中提取随机部分
	 * @param id - 完整ID
	 * @returns 随机字符串部分
	 */
	static extractRandomPart(id: string): string | null {
		if (!this.validateShortIdFormat(id)) {
			return null;
		}
		const parts = id.split('_');
		return parts[1] || null;
	}

	/**
	 * 批量生成ID
	 * @param prefix - 前缀
	 * @param count - 生成数量
	 * @returns ID数组
	 */
	static generateBatch(prefix: string, count: number): string[] {
		if (count <= 0 || count > 1000) {
			throw new Error('Count must be between 1 and 1000');
		}

		const ids: string[] = [];
		for (let i = 0; i < count; i++) {
			ids.push(this.generateShortId(prefix));
		}
		return ids;
	}
}

/**
 * 默认导出 - 便捷访问接口
 */
export default FastBuildIdGenerator;

/**
 * 类型定义
 */
export type ValidPrefix = 'user' | 'proj' | 'app' | 'tbl' | 'view' | 'col' | 'mem' | 'page' | 'dep' | 'log';

/**
 * ID生成器映射表
 */
export const ID_GENERATORS: Record<ValidPrefix, () => string> = {
	user: () => FastBuildIdGenerator.generateUserId(),
	proj: () => FastBuildIdGenerator.generateProjectId(),
	app: () => FastBuildIdGenerator.generateAppId(),
	tbl: () => FastBuildIdGenerator.generateTableId(),
	view: () => FastBuildIdGenerator.generateViewId(),
	col: () => FastBuildIdGenerator.generateColumnId(),
	mem: () => FastBuildIdGenerator.generateMemberId(),
	page: () => FastBuildIdGenerator.generatePageId(),
	dep: () => FastBuildIdGenerator.generateDeploymentId(),
	log: () => FastBuildIdGenerator.generateAuditLogId(),
};

/**
 * 快捷函数：根据实体类型生成ID
 */
export function generateIdForEntity(entityType: ValidPrefix): string {
	const generator = ID_GENERATORS[entityType];
	if (!generator) {
		throw new Error(`Unknown entity type: ${entityType}`);
	}
	return generator();
}