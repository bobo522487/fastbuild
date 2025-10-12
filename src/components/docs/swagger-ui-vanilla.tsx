"use client";

import { useEffect, useRef } from "react";

interface SwaggerUIVanillaProps {
	url?: string;
	title?: string;
}

export default function SwaggerUIVanilla({
	url = "/api/docs/openapi",
	title = "FastBuild API Documentation",
}: SwaggerUIVanillaProps) {
	const iframeRef = useRef<HTMLIFrameElement>(null);

	useEffect(() => {
		if (!iframeRef.current) return;

		// 获取认证 token
		const token =
			typeof window !== "undefined"
				? localStorage.getItem("auth-token") || ""
				: "";

		// 创建 Swagger UI HTML 内容
		const swaggerHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link rel="stylesheet" type="text/css" href="/swagger-ui.css" />
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .swagger-ui .topbar { display: none; }
        .swagger-ui .info { margin: 20px 0; }
        .swagger-ui .scheme-container {
            margin: 20px 0;
            padding: 10px;
            background: #f9fafb;
            border-radius: 6px;
        }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="/swagger-ui-bundle.js"></script>
    <script src="/swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function() {
            console.log('Initializing Swagger UI...');

            const ui = SwaggerUIBundle({
                url: '${url}',
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout",
                docExpansion: "list",
                defaultModelsExpandDepth: 2,
                defaultModelExpandDepth: 2,
                tryItOutEnabled: true,
                filter: true,
                supportedSubmitMethods: [
                    'get', 'post', 'put', 'delete', 'patch'
                ],
                requestInterceptor: function(request) {
                    // 自动添加认证头
                    if ('${token}') {
                        request.headers.Authorization = 'Bearer ${token}';
                    }
                    // 添加 API 版本头
                    request.headers['API-Version'] = 'v4.0';
                    console.log('Request:', request);
                    return request;
                },
                responseInterceptor: function(response) {
                    console.log('Response:', response);
                    return response;
                },
                onComplete: function() {
                    console.log('Swagger UI 加载完成');
                },
                onError: function(error) {
                    console.error('Swagger UI 错误:', error);
                    document.getElementById('swagger-ui').innerHTML = \`
                        <div style="
                            padding: 40px;
                            margin: 20px;
                            background: #fef2f2;
                            border: 1px solid #fecaca;
                            border-radius: 8px;
                            color: #dc2626;
                            text-align: center;
                        ">
                            <h3 style="margin: 0 0 10px 0; font-size: 18px;">文档加载失败</h3>
                            <p style="margin: 0 0 20px 0; color: #991b1b;">\${error.message || '未知错误'}</p>
                            <button onclick="window.location.reload()" style="
                                margin-top: 10px;
                                padding: 10px 20px;
                                background: #dc2626;
                                color: white;
                                border: none;
                                border-radius: 6px;
                                cursor: pointer;
                                font-size: 14px;
                            ">重试</button>
                        </div>
                    \`;
                }
            });
        };
    </script>
</body>
</html>`;

		// 设置 iframe 内容
		const iframe = iframeRef.current;
		const doc = iframe.contentDocument || iframe.contentWindow?.document;

		if (doc) {
			doc.open();
			doc.write(swaggerHTML);
			doc.close();
		}
	}, [url, title]);

	return (
		<div
			style={{
				minHeight: "100vh",
				backgroundColor: "#fafafa",
			}}
		>
			{/* 头部 */}
			<div
				style={{
					backgroundColor: "#fff",
					borderBottom: "1px solid #e5e7eb",
					padding: "16px 24px",
					boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
				}}
			>
				<h1
					style={{
						margin: 0,
						fontSize: "24px",
						fontWeight: "600",
						color: "#111827",
					}}
				>
					{title}
				</h1>
				<p
					style={{
						margin: "4px 0 0 0",
						fontSize: "14px",
						color: "#6b7280",
					}}
				>
					FastBuild 低代码开发平台 REST API v4.0 (OpenAPI 3.1)
				</p>
				<div
					style={{
						marginTop: "8px",
						display: "flex",
						gap: "8px",
						flexWrap: "wrap",
					}}
				>
					<div
						style={{
							padding: "6px 12px",
							backgroundColor: "#dcfce7",
							border: "1px solid #bbf7d0",
							borderRadius: "6px",
							fontSize: "12px",
							color: "#166534",
							display: "inline-block",
						}}
					>
						✓ OpenAPI 3.1 规范支持
					</div>
					<div
						style={{
							padding: "6px 12px",
							backgroundColor: "#dbeafe",
							border: "1px solid #bfdbfe",
							borderRadius: "6px",
							fontSize: "12px",
							color: "#1e40af",
							display: "inline-block",
						}}
					>
						四层架构: /sys/* → /meta/* → /data/* → /app/*
					</div>
					<div
						style={{
							padding: "6px 12px",
							backgroundColor: "#fef3c7",
							border: "1px solid #fde68a",
							borderRadius: "6px",
							fontSize: "12px",
							color: "#92400e",
							display: "inline-block",
						}}
					>
						动态表生成 + 智能视图系统
					</div>
				</div>
			</div>

			{/* Swagger UI iframe */}
			<iframe
				ref={iframeRef}
				style={{
					width: "100%",
					height: "calc(100vh - 180px)",
					border: "none",
					backgroundColor: "#fafafa",
				}}
				title="Swagger UI Documentation"
			/>
		</div>
	);
}
