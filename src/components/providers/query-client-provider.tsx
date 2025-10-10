"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

let clientQueryClientSingleton: QueryClient | undefined = undefined;

const getQueryClient = () => {
	if (typeof window === "undefined") {
		// Server: always make a new query client
		return new QueryClient({
			defaultOptions: {
				queries: {
					staleTime: 60 * 1000, // 1 minute
				},
			},
		});
	}
	// Browser: use singleton pattern to keep the same query client
	clientQueryClientSingleton ??= new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 60 * 1000, // 1 minute
			},
		},
	});

	return clientQueryClientSingleton;
};

interface QueryClientProviderProps {
	children: React.ReactNode;
}

export function QueryClientProviderWrapper({
	children,
}: QueryClientProviderProps) {
	const queryClient = getQueryClient();

	return (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}
