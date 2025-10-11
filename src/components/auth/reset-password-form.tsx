"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
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
import { Loader2, Key, AlertTriangle, CheckCircle } from "lucide-react";

const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(6, "密码至少需要6个字符")
    .max(100, "密码不能超过100个字符"),
  confirmPassword: z.string().min(1, "请确认密码"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "两次输入的密码不一致",
  path: ["confirmPassword"],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

interface ResetPasswordFormProps {
  onSuccess?: () => void;
  onLoginClick?: () => void;
}

export function ResetPasswordForm({ onSuccess, onLoginClick }: ResetPasswordFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [email, setEmail] = useState<string>("");
  const [token, setToken] = useState<string>("");
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const emailParam = searchParams.get("email");
    const tokenParam = searchParams.get("token");

    if (!emailParam || !tokenParam) {
      setError("重置链接无效或已过期");
      setIsValid(false);
      return;
    }

    setEmail(emailParam);
    setToken(tokenParam);
    setIsValid(true);
  }, [searchParams]);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(data: ResetPasswordFormValues) {
    if (!email || !token) {
      setError("重置链接无效");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          token,
          password: data.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "密码重置失败");
      }

      toast.success("密码重置成功！");
      onSuccess?.();

      // 延迟跳转到登录页面
      setTimeout(() => {
        onLoginClick?.();
      }, 2000);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "密码重置失败，请稍后重试";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  if (isValid === null) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center">验证重置链接...</div>
        </CardContent>
      </Card>
    );
  }

  if (isValid === false) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <CardTitle className="text-xl">重置链接无效</CardTitle>
          <CardDescription>
            {error || "重置链接无效或已过期"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              请重新申请密码重置链接，或联系技术支持。
            </AlertDescription>
          </Alert>
          <Button onClick={onLoginClick} className="w-full">
            返回登录
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
          <Key className="w-6 h-6 text-blue-600" />
        </div>
        <CardTitle className="text-xl">重置密码</CardTitle>
        <CardDescription>
          为账户 <strong>{email}</strong> 设置新密码
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>新密码</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="请输入新密码"
                      type="password"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>确认新密码</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="请再次输入新密码"
                      type="password"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  重置中...
                </>
              ) : (
                "重置密码"
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
            返回登录
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}