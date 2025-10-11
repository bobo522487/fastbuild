"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Loader2, Mail, CheckCircle } from "lucide-react";

interface EmailVerificationFormProps {
  email?: string;
  onVerificationSuccess?: () => void;
}

export function EmailVerificationForm({ email: initialEmail, onVerificationSuccess }: EmailVerificationFormProps) {
  const [email, setEmail] = useState(initialEmail || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const handleSendVerificationLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await signIn("email", {
        email,
        redirect: false,
        callbackUrl: window.location.href,
      });

      if (result?.error) {
        setError("发送验证链接失败，请检查邮箱地址是否正确");
      } else {
        setIsSent(true);
        setSuccess("验证链接已发送到您的邮箱，请查收并点击链接完成验证");
      }
    } catch (error) {
      setError("发送验证链接时发生错误，请稍后重试");
      console.error("Email verification error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendLink = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await signIn("email", {
        email,
        redirect: false,
        callbackUrl: window.location.href,
      });

      if (result?.error) {
        setError("重新发送验证链接失败");
      } else {
        setSuccess("验证链接已重新发送");
      }
    } catch (error) {
      setError("重新发送验证链接时发生错误");
      console.error("Resend verification error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
          <Mail className="w-6 h-6 text-blue-600" />
        </div>
        <CardTitle className="text-2xl font-bold">邮箱验证</CardTitle>
        <CardDescription>
          输入您的邮箱地址，我们将发送验证链接
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isSent ? (
          <form onSubmit={handleSendVerificationLink} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="请输入邮箱地址"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !email}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  发送中...
                </>
              ) : (
                "发送验证链接"
              )}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-lg">验证链接已发送</h3>
                <p className="text-sm text-gray-600 mt-1">
                  我们已向 <strong>{email}</strong> 发送了验证链接
                </p>
              </div>
            </div>

            {success && (
              <Alert>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleResendLink}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    重新发送中...
                  </>
                ) : (
                  "重新发送验证链接"
                )}
              </Button>

              <Button
                variant="ghost"
                className="w-full text-sm"
                onClick={() => {
                  setIsSent(false);
                  setSuccess(null);
                  setError(null);
                }}
              >
                使用其他邮箱地址
              </Button>
            </div>

            <div className="text-center text-sm text-gray-500">
              <p>没有收到邮件？请检查垃圾邮件文件夹</p>
            </div>
          </div>
        )}

        <div className="text-center text-xs text-gray-400 border-t pt-4">
          <p>点击验证链接后，您将自动登录并跳转到仪表板</p>
        </div>
      </CardContent>
    </Card>
  );
}