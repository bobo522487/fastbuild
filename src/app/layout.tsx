import "~/styles/globals.css";

import type { Metadata } from "next";
import { Geist } from "next/font/google";

import { QueryClientProviderWrapper } from "~/components/providers/query-client-provider";

export const metadata: Metadata = {
	title: "FastBuild",
	description: "FastBuild 低代码开发平台 - 构建现代Web应用的可视化开发工具",
	icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
	subsets: ["latin"],
	variable: "--font-geist-sans",
});

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en" className={`${geist.variable}`}>
			<body>
				<QueryClientProviderWrapper>{children}</QueryClientProviderWrapper>
			</body>
		</html>
	);
}
