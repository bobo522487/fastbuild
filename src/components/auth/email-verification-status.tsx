"use client";

import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Mail, AlertCircle, CheckCircle } from "lucide-react";
import { useState } from "react";
import { signIn } from "next-auth/react";

interface EmailVerificationStatusProps {
  onVerified?: () => void;
}

export function EmailVerificationStatus({ onVerified }: EmailVerificationStatusProps) {
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (status === "loading") {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="text-center">加载中...</div>
        </CardContent>
      </Card>
    );
  }

  if (!session || !session.user) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>请先登录以验证邮箱</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const isEmailVerified = !!session.user.emailVerified;

  const handleSendVerificationEmail = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const result = await signIn("email", {
        email: session.user.email!,
        redirect: false,
      });

      if (result?.error) {
        setMessage("发送验证邮件失败，请稍后重试");
      } else {
        setMessage("验证邮件已发送，请查收");
      }
    } catch (error) {
      setMessage("发送验证邮件时发生错误");
      console.error("Send verification email error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className={`mx-auto mb-2 w-12 h-12 rounded-full flex items-center justify-center ${
          isEmailVerified ? "bg-green-100" : "bg-yellow-100"
        }`}>
          {isEmailVerified ? (
            <CheckCircle className="w-6 h-6 text-green-600" />
          ) : (
            <Mail className="w-6 h-6 text-yellow-600" />
          )}
        </div>
        <CardTitle className="text-xl">
          {isEmailVerified ? "邮箱已验证" : "验证您的邮箱"}
        </CardTitle>
        <CardDescription>
          {isEmailVerified
            ? `您的邮箱 ${session.user.email} 已经通过验证`
            : `请验证您的邮箱地址：${session.user.email}`
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEmailVerified ? (
          <div className="text-center space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                邮箱验证成功！您现在可以完全使用所有功能。
              </AlertDescription>
            </Alert>
            <Button onClick={onVerified} className="w-full">
              继续
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                验证邮箱可以确保账户安全，并允许您接收重要通知。
              </AlertDescription>
            </Alert>

            {message && (
              <Alert>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleSendVerificationEmail}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? "发送中..." : "发送验证邮件"}
            </Button>

            <div className="text-center text-sm text-gray-500">
              <p>发送后请检查您的邮箱（包括垃圾邮件文件夹）</p>
              <p>点击邮件中的链接即可完成验证</p>
            </div>

            {onVerified && (
              <Button variant="outline" onClick={onVerified} className="w-full">
                稍后验证
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}