/**
 * 数据验证Schema定义
 * 使用Zod进行类型安全的数据验证，确保API输入数据的完整性和正确性
 */

import { z } from "zod";

/**
 * 项目可见性枚举
 */
export const VisibilitySchema = z.enum(["PUBLIC", "PRIVATE"], {
	errorMap: (issue, ctx) => {
		return { message: "可见性必须是 PUBLIC 或 PRIVATE" };
	},
});

/**
 * 项目成员角色枚举
 */
export const MemberRoleSchema = z.enum(
	["OWNER", "ADMIN", "EDITOR", "VIEWER", "NO_ACCESS"],
	{
		errorMap: (issue, ctx) => {
			return {
				message: "角色必须是 OWNER, ADMIN, EDITOR, VIEWER 或 NO_ACCESS",
			};
		},
	},
);

/**
 * 创建项目数据验证Schema
 */
export const CreateProjectSchema = z.object({
	name: z
		.string({
			required_error: "项目名称不能为空",
			invalid_type_error: "项目名称必须是字符串",
		})
		.min(1, "项目名称不能为空")
		.max(100, "项目名称不能超过100个字符")
		.trim()
		.regex(
			/^[a-zA-Z0-9\u4e00-\u9fa5\s\-_]+$/,
			"项目名称只能包含字母、数字、中文、空格、连字符和下划线",
		),

	slug: z
		.string({
			required_error: "项目标识符不能为空",
			invalid_type_error: "项目标识符必须是字符串",
		})
		.min(1, "项目标识符不能为空")
		.max(50, "项目标识符不能超过50个字符")
		.trim()
		.regex(/^[a-z0-9\-_]+$/, "项目标识符只能包含小写字母、数字、连字符和下划线")
		.transform((val) => val.toLowerCase()),

	description: z
		.string()
		.max(500, "项目描述不能超过500个字符")
		.trim()
		.optional()
		.transform((val) => (val === "" ? undefined : val)),

	visibility: VisibilitySchema,
});

/**
 * 更新项目数据验证Schema
 */
export const UpdateProjectSchema = z.object({
	name: z
		.string()
		.min(1, "项目名称不能为空")
		.max(100, "项目名称不能超过100个字符")
		.trim()
		.regex(
			/^[a-zA-Z0-9\u4e00-\u9fa5\s\-_]+$/,
			"项目名称只能包含字母、数字、中文、空格、连字符和下划线",
		)
		.optional(),

	description: z
		.string()
		.max(500, "项目描述不能超过500个字符")
		.trim()
		.optional()
		.transform((val) => (val === "" ? undefined : val)),

	visibility: VisibilitySchema.optional(),
});

/**
 * 项目查询参数验证Schema
 */
export const ProjectQuerySchema = z.object({
	page: z
		.string()
		.transform((val, ctx) => {
			const num = Number.parseInt(val, 10);
			if (Number.isNaN(num) || num < 1) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "页码必须是大于0的数字",
				});
				return z.NEVER;
			}
			return num;
		})
		.default("1"),

	limit: z
		.string()
		.transform((val, ctx) => {
			const num = Number.parseInt(val, 10);
			if (Number.isNaN(num) || num < 1 || num > 100) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "每页数量必须是1-100之间的数字",
				});
				return z.NEVER;
			}
			return num;
		})
		.default("10"),

	search: z.string().max(100, "搜索关键词不能超过100个字符").trim().optional(),

	visibility: z.enum(["PUBLIC", "PRIVATE"]).optional(),

	sort: z.enum(["name", "createdAt", "updatedAt"]).default("updatedAt"),

	order: z.enum(["asc", "desc"]).default("desc"),
});

/**
 * 添加项目成员验证Schema
 */
export const AddProjectMemberSchema = z.object({
	userId: z
		.string({
			required_error: "用户ID不能为空",
			invalid_type_error: "用户ID必须是字符串",
		})
		.min(1, "用户ID不能为空"),

	role: MemberRoleSchema.default("VIEWER"),
});

/**
 * 更新项目成员角色验证Schema
 */
export const UpdateProjectMemberSchema = z.object({
	role: MemberRoleSchema,
});

/**
 * 用户注册验证Schema
 */
export const RegisterUserSchema = z.object({
	email: z
		.string({
			required_error: "邮箱地址不能为空",
		})
		.email("请输入有效的邮箱地址")
		.toLowerCase(),

	password: z
		.string({
			required_error: "密码不能为空",
		})
		.min(8, "密码长度至少8位")
		.max(128, "密码长度不能超过128位")
		.regex(
			/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
			"密码必须包含至少一个大写字母、一个小写字母和一个数字",
		),

	name: z
		.string({
			required_error: "姓名不能为空",
		})
		.min(2, "姓名长度至少2位")
		.max(50, "姓名长度不能超过50位")
		.trim(),
});

/**
 * 用户登录验证Schema
 */
export const LoginUserSchema = z.object({
	email: z
		.string({
			required_error: "邮箱地址不能为空",
		})
		.email("请输入有效的邮箱地址")
		.toLowerCase(),

	password: z
		.string({
			required_error: "密码不能为空",
		})
		.min(1, "密码不能为空"),
});

/**
 * 类型导出
 */
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
export type ProjectQueryInput = z.infer<typeof ProjectQuerySchema>;
export type AddProjectMemberInput = z.infer<typeof AddProjectMemberSchema>;
export type UpdateProjectMemberInput = z.infer<
	typeof UpdateProjectMemberSchema
>;
export type RegisterUserInput = z.infer<typeof RegisterUserSchema>;
export type LoginUserInput = z.infer<typeof LoginUserSchema>;
