/**
 * 测试路由 - 简单的响应验证
 */

import { NextResponse } from "next/server";

export async function GET() {
	return NextResponse.json({
		success: true,
		message: "sys 路由测试成功",
		timestamp: new Date().toISOString(),
	});
}
