import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { db } from "~/server/db";

const forgotPasswordSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = forgotPasswordSchema.parse(body);

    // 查找用户
    const user = await db.user.findUnique({
      where: { email },
    });

    // 无论用户是否存在都返回成功，避免邮箱枚举攻击
    if (!user) {
      return NextResponse.json(
        { message: "如果该邮箱已注册，您将收到密码重置链接" },
        { status: 200 }
      );
    }

    // 检查是否是使用密码认证的用户
    if (!user.password) {
      return NextResponse.json(
        { message: "该账户使用社交登录，无需重置密码" },
        { status: 400 }
      );
    }

    // 生成重置令牌
    const resetToken = randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1小时后过期

    // 存储重置令牌 - 使用VerificationToken表
    await db.verificationToken.deleteMany({
      where: { identifier: email },
    });

    await db.verificationToken.create({
      data: {
        identifier: email,
        token: resetToken,
        expires: resetTokenExpiry,
      },
    });

    // 在实际应用中，这里应该发送邮件
    // 为了演示，我们返回重置链接（生产环境不应该返回）
    const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}&email=${email}`;

    console.log(`Password reset link for ${email}: ${resetUrl}`);

    // TODO: 实际发送邮件逻辑
    // await sendPasswordResetEmail(email, resetUrl);

    return NextResponse.json(
      {
        message: "密码重置链接已发送到您的邮箱",
        // 仅在开发环境返回链接用于测试
        ...(process.env.NODE_ENV === 'development' && { resetUrl })
      },
      { status: 200 }
    );

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Password reset request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}