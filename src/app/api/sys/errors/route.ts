import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auditLogger } from "~/server/api/middleware/audit";
import { auth } from "~/server/auth";

// 简单错误报告schema（用于单个错误）
const SimpleErrorSchema = z.object({
	message: z.string(),
	stack: z.string().optional(),
	componentStack: z.string().optional(),
	timestamp: z.string(),
	url: z.string(),
	userAgent: z.string(),
});

type ErrorReport = {
	id: string;
	message: string;
	timestamp: string;
	url: string;
	userId?: string;
	userAgent: string;
	stack?: string;
	componentStack?: string;
	createdAt: Date;
};

export async function POST(request: NextRequest) {
	const startTime = Date.now();
	const requestId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

	try {
		const body = await request.json();
		const session = await auth();

		// 验证请求体格式
		let errorData: ErrorReport | null = null;
		try {
			// 尝试验证简单错误报告格式
			const simpleError = SimpleErrorSchema.parse(body);
			errorData = {
				id: requestId,
				message: simpleError.message,
				timestamp: simpleError.timestamp,
				url: simpleError.url,
				userId: session?.user?.id,
				userAgent: simpleError.userAgent,
				stack: simpleError.stack,
				componentStack: simpleError.componentStack,
				createdAt: new Date(),
			};
		} catch (validationError) {
			console.error("Error report validation failed:", validationError);
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "VALIDATION_ERROR",
						message: "Invalid error report format",
					},
					meta: {
						timestamp: new Date().toISOString(),
						requestId,
					},
				},
				{ status: 400 },
			);
		}

		if (!errorData) {
			return NextResponse.json(
				{
					success: false,
					error: {
						code: "INVALID_ERROR_DATA",
						message: "Failed to parse error report",
					},
					meta: {
						timestamp: new Date().toISOString(),
						requestId,
					},
				},
				{ status: 400 },
			);
		}

		// 记录错误报告
		console.log(`[${requestId}] Received error report:`, {
			message: errorData.message,
			url: errorData.url,
			userId: errorData.userId,
			timestamp: errorData.timestamp,
		});

		// 记录到控制台（生产环境中应该使用日志系统）
		console.error("Client Error Report:", JSON.stringify(errorData, null, 2));

		// 记录审计日志
		await auditLogger.createAuditLog({
			action: "ERROR_REPORT",
			targetType: "error_report",
			targetId: requestId,
			message: `Received error report: ${errorData.message}`,
			metadata: {
				userAgent: errorData.userAgent,
				processingTime: Date.now() - startTime,
			},
		});

		return NextResponse.json(
			{
				success: true,
				data: {
					message: "Error report received",
					id: requestId,
				},
				meta: {
					timestamp: new Date().toISOString(),
					requestId,
				},
			},
			{ status: 200 },
		);
	} catch (error) {
		console.error(`[${requestId}] Error processing error report:`, error);

		return NextResponse.json(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to process error report",
				},
				meta: {
					timestamp: new Date().toISOString(),
					requestId,
				},
			},
			{ status: 500 },
		);
	}
}

// 获取错误统计信息（管理员功能）
export async function GET(request: NextRequest) {
	const requestId = `error-stats-${Date.now()}`;
	const session = await auth();

	// 只有管理员可以查看错误统计
	if (!session?.user) {
		return NextResponse.json(
			{
				success: false,
				error: {
					code: "UNAUTHORIZED",
					message: "Access denied",
				},
				meta: {
					timestamp: new Date().toISOString(),
					requestId,
				},
			},
			{ status: 401 },
		);
	}

	try {
		// 这里可以实现错误统计查询逻辑
		const stats = {
			totalErrors: 0,
			recentErrors: 0,
			topErrorCodes: [],
			lastUpdated: new Date().toISOString(),
		};

		return NextResponse.json(
			{
				success: true,
				data: stats,
				meta: {
					timestamp: new Date().toISOString(),
					requestId,
				},
			},
			{ status: 200 },
		);
	} catch (error) {
		console.error(`[${requestId}] Failed to fetch error stats:`, error);

		return NextResponse.json(
			{
				success: false,
				error: {
					code: "INTERNAL_ERROR",
					message: "Failed to fetch error statistics",
				},
				meta: {
					timestamp: new Date().toISOString(),
					requestId,
				},
			},
			{ status: 500 },
		);
	}
}
