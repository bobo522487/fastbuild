'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FormProvider } from '@/components/forms/FormProvider';
import { SimpleFormSubmitHandler } from '@/components/forms/SimpleFormSubmitHandler';
import { exampleForms } from '@/examples/forms';
import { Card, CardContent } from '@workspace/ui/components/card';
import { Button } from '@workspace/ui/components/button';
import { useFormMetadata } from '@/components/forms/FormProvider';
import Link from 'next/link';

export default function FormDemoPage() {
  const params = useParams();
  const router = useRouter();
  const formId = params.formId as string;
  const { currentMetadata, loadMetadata } = useFormMetadata();

  React.useEffect(() => {
    const form = exampleForms.find(f => f.id === formId);
    if (form) {
      loadMetadata(form.metadata);
    } else {
      router.push('/demo');
    }
  }, [formId, loadMetadata, router]);

  const handleFormSubmit = React.useCallback((data: Record<string, any>) => {
    console.log('✅ Form submitted successfully:', data);
  }, []);

  const handleFormError = React.useCallback((error: string) => {
    console.error('❌ Form submission error:', error);
  }, []);

  if (!currentMetadata) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="text-6xl mb-4">⏳</div>
              <h3 className="text-lg font-semibold mb-2">加载中...</h3>
              <p className="text-muted-foreground">
                正在加载表单配置
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <FormProvider>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/demo">
            <Button variant="outline" size="sm">
              ← 返回表单列表
            </Button>
          </Link>
        </div>

        <div className="max-w-2xl mx-auto">
          <SimpleFormSubmitHandler
            metadata={currentMetadata}
            onSuccess={handleFormSubmit}
            onError={handleFormError}
          />
        </div>
      </div>
    </FormProvider>
  );
}