import { NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword } from "~/server/auth/password";
import { db } from "~/server/db";

const resetPasswordSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  token: z.string().min(1, "重置令牌不能为空"),
  password: z.string().min(6, "密码至少需要6个字符"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, token, password } = resetPasswordSchema.parse(body);

    // 验证重置令牌
    const verificationToken = await db.verificationToken.findFirst({
      where: {
        identifier: email,
        token: token,
        expires: {
          gt: new Date(),
        },
      },
    });

    if (!verificationToken) {
      return NextResponse.json(
        { error: "重置令牌无效或已过期" },
        { status: 400 }
      );
    }

    // 查找用户
    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "用户不存在" },
        { status: 404 }
      );
    }

    // 更新密码
    const hashedPassword = await hashPassword(password);
    await db.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
      },
    });

    // 删除重置令牌
    await db.verificationToken.delete({
      where: { id: verificationToken.id },
    });

    return NextResponse.json(
      { message: "密码重置成功，请使用新密码登录" },
      { status: 200 }
    );

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Password reset error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}