"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Loader2, Mail, CheckCircle } from "lucide-react";

const forgotPasswordSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

interface ForgotPasswordFormProps {
  onSuccess?: () => void;
  onLoginClick?: () => void;
}

export function ForgotPasswordForm({ onSuccess, onLoginClick }: ForgotPasswordFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [email, setEmail] = useState("");
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(data: ForgotPasswordFormValues) {
    setIsLoading(true);
    setEmail(data.email);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "发送重置链接失败");
      }

      setIsSent(true);
      toast.success("重置链接已发送到您的邮箱");

      // 开发环境下显示重置链接
      if (result.resetUrl) {
        setResetUrl(result.resetUrl);
      }

      onSuccess?.();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "发送重置链接失败，请稍后重试";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  if (isSent) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <CardTitle className="text-xl">重置链接已发送</CardTitle>
          <CardDescription>
            我们已向 <strong>{email}</strong> 发送了密码重置链接
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              请检查您的邮箱（包括垃圾邮件文件夹）并点击重置链接。链接将在1小时后过期。
            </AlertDescription>
          </Alert>

          {resetUrl && (
            <Alert>
              <AlertDescription className="space-y-2">
                <div className="font-medium">开发环境 - 测试链接:</div>
                <a
                  href={resetUrl}
                  className="text-blue-600 hover:underline break-all text-sm"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {resetUrl}
                </a>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsSent(false);
                setResetUrl(null);
                form.reset();
              }}
              className="w-full"
            >
              重新发送
            </Button>

            <Button
              variant="ghost"
              onClick={onLoginClick}
              className="w-full text-sm"
            >
              返回登录
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
          <Mail className="w-6 h-6 text-blue-600" />
        </div>
        <CardTitle className="text-xl">忘记密码</CardTitle>
        <CardDescription>
          输入您的邮箱地址，我们将发送密码重置链接
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>邮箱地址</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="your@email.com"
                      type="email"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  发送中...
                </>
              ) : (
                "发送重置链接"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter>
        <div className="w-full text-center">
          <Button
            variant="link"
            onClick={onLoginClick}
            className="text-sm"
          >
            想起密码了？返回登录
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}