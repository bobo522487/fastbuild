import { SimpleQueryBuilder, SimpleViewBuilder } from "~/lib/query-builder";
import { prisma } from "~/server/db";

/**
 * 事务性表服务 - 元数据驱动的表管理
 *
 * 核心理念：元数据是唯一真实来源，实际表从元数据生成
 * 通过事务确保一致性，不需要复杂的一致性检查系统
 */

export interface CreateTableRequest {
	projectId: string;
	name: string;
	displayName?: string;
	description?: string;
	columns: Array<{
		name: string;
		displayName?: string;
		type:
			| "STRING"
			| "TEXT"
			| "NUMBER"
			| "BOOLEAN"
			| "DATE"
			| "TIMESTAMP"
			| "JSON";
		nullable?: boolean;
		defaultValue?: any;
		unique?: boolean;
		order?: number;
		options?: any;
	}>;
	options?: any;
}

export interface UpdateTableRequest {
	name?: string;
	displayName?: string;
	description?: string;
	options?: any;
}

export interface AddColumnRequest {
	name: string;
	displayName?: string;
	type:
		| "STRING"
		| "TEXT"
		| "NUMBER"
		| "BOOLEAN"
		| "DATE"
		| "TIMESTAMP"
		| "JSON";
	nullable?: boolean;
	defaultValue?: any;
	unique?: boolean;
	order?: number;
	options?: any;
}

/**
 * 表服务 - 处理元数据和实际表的事务性操作
 *
 * 根据 Linus "好品味" 原则：
 * 1. 所有数据库操作通过统一接口（Prisma）
 * 2. 消除特殊情况：不需要单独的 PostgreSQL 客户端
 * 3. 简化架构：一个连接池，一个事务系统
 */
export class TableService {

	/**
	 * 创建表 - 事务性操作，确保元数据和实际表完全一致
	 */
	static async createTable(userId: string, request: CreateTableRequest) {
		return await prisma.$transaction(async (tx) => {
			// 1. 验证项目权限
			await this.validateProjectPermission(userId, request.projectId, "write");

			// 2. 检查表名是否已存在（在项目中唯一）
			const existingTable = await tx.dataTable.findFirst({
				where: {
					projectId: request.projectId,
					name: request.name,
					deletedAt: null,
				},
			});

			if (existingTable) {
				throw new Error(`表名 ${request.name} 已存在`);
			}

			// 3. 创建元数据
			const table = await tx.dataTable.create({
				data: {
					projectId: request.projectId,
					name: request.name,
					displayName: request.displayName || request.name,
					description: request.description,
					options: request.options || {},
					createdBy: userId,
					updatedAt: new Date(),
				},
			});

			// 4. 创建列元数据
			const columns = await Promise.all(
				request.columns.map((column, index) =>
					tx.dataColumn.create({
						data: {
							tableId: table.id,
							name: column.name,
							displayName: column.displayName || column.name,
							type: column.type,
							nullable: column.nullable ?? true,
							defaultValue: column.defaultValue,
							unique: column.unique ?? false,
							order: column.order ?? index,
							options: column.options || {},
						},
					}),
				),
			);

			// 5. 生成并执行实际表创建 SQL
			const { sql: createTableSQL } = SimpleQueryBuilder.buildCreateTableQuery(
				request.name,
				request.projectId,
				request.columns,
			);

			try {
				// 6. 创建实际表 - 使用 Prisma 统一接口
				await tx.$executeRawUnsafe(createTableSQL);

				// 7. 创建默认视图
				const { sql: createViewSQL } = SimpleViewBuilder.buildDefaultViewQuery(
					request.projectId,
					request.name,
				);
				await tx.$executeRawUnsafe(createViewSQL);

				// 8. 创建常用索引
				await this.createBasicIndexes(
					tx,
					request.projectId,
					request.name,
					request.columns,
				);
			} catch (error) {
				// 如果实际表创建失败，整个事务会回滚，元数据也会被删除
				throw new Error(`创建实际表失败: ${error instanceof Error ? error.message : String(error)}`);
			}

			return {
				success: true,
				table: {
					id: table.id,
					name: table.name,
					displayName: table.displayName,
					description: table.description,
					columns: columns.map((col) => ({
						id: col.id,
						name: col.name,
						displayName: col.displayName,
						type: col.type,
						nullable: col.nullable,
						defaultValue: col.defaultValue,
						unique: col.unique,
						order: col.order,
					})),
				},
			};
		});
	}

	/**
	 * 更新表元数据（不涉及结构变更）
	 */
	static async updateTable(
		userId: string,
		tableId: string,
		request: UpdateTableRequest,
	) {
		return await prisma.$transaction(async (tx) => {
			// 1. 验证表存在性和权限
			const table = await this.validateTableAccess(userId, tableId, "write");

			// 2. 更新元数据
			const updatedTable = await tx.dataTable.update({
				where: { id: tableId },
				data: {
					...(request.name && { name: request.name }),
					...(request.displayName && { displayName: request.displayName }),
					...(request.description !== undefined && {
						description: request.description,
					}),
					...(request.options && { options: request.options }),
					updatedAt: new Date(),
				},
			});

			return {
				success: true,
				table: updatedTable,
			};
		});
	}

	/**
	 * 删除表（软删除）
	 */
	static async deleteTable(userId: string, tableId: string) {
		return await prisma.$transaction(async (tx) => {
			// 1. 验证表存在性和权限
			const table = await this.validateTableAccess(userId, tableId, "delete");

			// 2. 软删除元数据
			await tx.dataTable.update({
				where: { id: tableId },
				data: {
					deletedAt: new Date(),
					updatedAt: new Date(),
				},
			});

			// 3. 软删除实际表（添加 deleted_at 标记）- 使用 Prisma 统一接口
			const tableName = SimpleQueryBuilder.buildTableName(
				table.projectId,
				table.name,
			);
			await tx.$executeRawUnsafe(`
        UPDATE ${tableName}
        SET deleted_at = NOW()
        WHERE deleted_at IS NULL
      `);

			return {
				success: true,
				message: "表已删除",
			};
		});
	}

	/**
	 * 添加列
	 */
	static async addColumn(
		userId: string,
		tableId: string,
		request: AddColumnRequest,
	) {
		return await prisma.$transaction(async (tx) => {
			// 1. 验证表存在性和权限
			const table = await this.validateTableAccess(userId, tableId, "write");

			// 2. 检查列名是否已存在
			const existingColumn = await tx.dataColumn.findFirst({
				where: {
					tableId,
					name: request.name,
				},
			});

			if (existingColumn) {
				throw new Error(`列名 ${request.name} 已存在`);
			}

			// 3. 获取最大 order 值
			const maxOrder = await tx.dataColumn.findFirst({
				where: { tableId },
				orderBy: { order: "desc" },
			});

			// 4. 创建列元数据
			const column = await tx.dataColumn.create({
				data: {
					tableId,
					name: request.name,
					displayName: request.displayName || request.name,
					type: request.type,
					nullable: request.nullable ?? true,
					defaultValue: request.defaultValue,
					unique: request.unique ?? false,
					order: request.order ?? (maxOrder?.order ?? 0) + 1,
					options: request.options || {},
				},
			});

			// 5. 添加实际表列
			const safeTableName = SimpleQueryBuilder.buildTableName(
				table.projectId,
				table.name,
			);
			const safeColumnName = SimpleQueryBuilder.escapeIdentifier(request.name);
			const typeMap = {
				STRING: "VARCHAR(255)",
				TEXT: "TEXT",
				NUMBER: "DECIMAL(20,8)",
				BOOLEAN: "BOOLEAN",
				DATE: "DATE",
				TIMESTAMP: "TIMESTAMP",
				JSON: "JSONB",
			};

			const columnType = typeMap[request.type] || "VARCHAR(255)";
			const nullable = request.nullable === false ? " NOT NULL" : "";
			const defaultValue =
				request.defaultValue !== undefined
					? ` DEFAULT ${SimpleQueryBuilder["formatDefaultValue"](request.defaultValue)}`
					: "";

			const alterSQL = `
        ALTER TABLE ${safeTableName}
        ADD COLUMN ${safeColumnName} ${columnType}${nullable}${defaultValue}
      `;

			try {
				// 使用 Prisma 统一接口执行 DDL
				await tx.$executeRawUnsafe(alterSQL);
			} catch (error) {
				throw new Error(`添加列失败: ${error instanceof Error ? error.message : String(error)}`);
			}

			return {
				success: true,
				column: {
					id: column.id,
					name: column.name,
					displayName: column.displayName,
					type: column.type,
					nullable: column.nullable,
					defaultValue: column.defaultValue,
					unique: column.unique,
					order: column.order,
				},
			};
		});
	}

	/**
	 * 删除列
	 */
	static async deleteColumn(userId: string, tableId: string, columnId: string) {
		return await prisma.$transaction(async (tx) => {
			// 1. 验证表存在性和权限
			const table = await this.validateTableAccess(userId, tableId, "write");

			// 2. 获取列信息
			const column = await tx.dataColumn.findFirst({
				where: { id: columnId, tableId },
			});

			if (!column) {
				throw new Error("列不存在");
			}

			// 3. 删除列元数据
			await tx.dataColumn.delete({
				where: { id: columnId },
			});

			// 4. 删除实际表列（PostgreSQL 不支持直接删除列，需要重建表）
			// 为简化起见，这里先标记列为已删除，实际删除可以在后续的维护任务中进行
			const safeTableName = SimpleQueryBuilder.buildTableName(
				table.projectId,
				table.name,
			);
			const safeColumnName = SimpleQueryBuilder.escapeIdentifier(column.name);

			const renameSQL = `
        ALTER TABLE ${safeTableName}
        RENAME COLUMN ${safeColumnName} TO ${SimpleQueryBuilder.escapeIdentifier(`deleted_${column.name}_${Date.now()}`)}
      `;

			try {
				// 使用 Prisma 统一接口执行 DDL
				await tx.$executeRawUnsafe(renameSQL);
			} catch (error) {
				throw new Error(`删除列失败: ${error instanceof Error ? error.message : String(error)}`);
			}

			return {
				success: true,
				message: "列已删除",
			};
		});
	}

	/**
	 * 获取表信息
	 */
	static async getTable(userId: string, tableId: string) {
		const table = await this.validateTableAccess(userId, tableId, "read");

		const columns = await prisma.dataColumn.findMany({
			where: { tableId },
			orderBy: { order: "asc" },
		});

		return {
			id: table.id,
			name: table.name,
			displayName: table.displayName,
			description: table.description,
			options: table.options,
			columns: columns.map((col) => ({
				id: col.id,
				name: col.name,
				displayName: col.displayName,
				type: col.type,
				nullable: col.nullable,
				defaultValue: col.defaultValue,
				unique: col.unique,
				order: col.order,
				options: col.options,
			})),
			createdAt: table.createdAt,
			updatedAt: table.updatedAt,
		};
	}

	/**
	 * 获取项目的所有表
	 */
	static async getProjectTables(userId: string, projectId: string) {
		await this.validateProjectPermission(userId, projectId, "read");

		const tables = await prisma.dataTable.findMany({
			where: {
				projectId,
				deletedAt: null,
			},
			orderBy: { createdAt: "desc" },
		});

		// 获取列数量统计（简化方案，避免复杂关系查询）
		const tablesWithCounts = await Promise.all(
			tables.map(async (table) => {
				const columnsCount = await prisma.dataColumn.count({
					where: { tableId: table.id },
				});

				return {
					id: table.id,
					name: table.name,
					displayName: table.displayName,
					description: table.description,
					columnsCount,
					viewsCount: 0, // 暂时设为0，后续可添加视图统计
					createdAt: table.createdAt,
					updatedAt: table.updatedAt,
				};
			}),
		);

		return tablesWithCounts;
	}

	/**
	 * 验证项目权限
	 */
	private static async validateProjectPermission(
		userId: string,
		projectId: string,
		action: "read" | "write" | "delete",
	) {
		const member = await prisma.projectMember.findFirst({
			where: {
				userId,
				projectId,
			},
		});

		if (!member) {
			throw new Error("无项目权限");
		}

		const rolePermissions = {
			OWNER: ["read", "write", "delete"],
			ADMIN: ["read", "write", "delete"],
			EDITOR: ["read", "write"],
			VIEWER: ["read"],
		};

		if (!rolePermissions[member.role].includes(action)) {
			throw new Error(`权限不足，需要 ${action} 权限`);
		}

		return member;
	}

	/**
	 * 验证表访问权限
	 */
	private static async validateTableAccess(
		userId: string,
		tableId: string,
		action: "read" | "write" | "delete",
	) {
		const table = await prisma.dataTable.findFirst({
			where: {
				id: tableId,
				deletedAt: null,
			},
		});

		if (!table) {
			throw new Error("表不存在");
		}

		await this.validateProjectPermission(userId, table.projectId, action);

		return table;
	}

	/**
	 * 创建基础索引 - 使用 Prisma 统一接口
	 */
	private static async createBasicIndexes(
		tx: any, // Prisma 事务对象
		projectId: string,
		tableName: string,
		columns: CreateTableRequest["columns"],
	) {
		const safeTableName = SimpleQueryBuilder.buildTableName(
			projectId,
			tableName,
		);

		// 常用字段的索引
		const indexFields = ["email", "status", "created_at"];

		for (const column of columns) {
			if (indexFields.includes(column.name.toLowerCase())) {
				const indexName = `idx_${projectId}_${tableName}_${column.name}`;
				const safeIndexName = SimpleQueryBuilder.escapeIdentifier(indexName);
				const safeColumnName = SimpleQueryBuilder.escapeIdentifier(column.name);

				try {
					// 使用 Prisma 统一接口创建索引
					await tx.$executeRawUnsafe(`
            CREATE INDEX ${safeIndexName} ON ${safeTableName} (${safeColumnName})
          `);
				} catch (error) {
					console.warn(`创建索引失败 ${indexName}:`, error instanceof Error ? error.message : String(error));
				}
			}

			// 唯一字段的唯一索引
			if (column.unique) {
				const indexName = `idx_unique_${projectId}_${tableName}_${column.name}`;
				const safeIndexName = SimpleQueryBuilder.escapeIdentifier(indexName);
				const safeColumnName = SimpleQueryBuilder.escapeIdentifier(column.name);

				try {
					// 使用 Prisma 统一接口创建唯一索引
					await tx.$executeRawUnsafe(`
            CREATE UNIQUE INDEX ${safeIndexName} ON ${safeTableName} (${safeColumnName})
          `);
				} catch (error) {
					console.warn(`创建唯一索引失败 ${indexName}:`, error instanceof Error ? error.message : String(error));
				}
			}
		}
	}
}
