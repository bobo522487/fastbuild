"use client";

import React, { useState, useRef, useEffect } from "react";
import { cn } from "~/lib/utils";

interface LazyImageProps
	extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> {
	src: string;
	alt: string;
	placeholder?: string;
	className?: string;
	onLoad?: () => void;
	onError?: () => void;
	threshold?: number;
	rootMargin?: string;
}

export function LazyImage({
	src,
	alt,
	placeholder = "/images/placeholder.png",
	className,
	onLoad,
	onError,
	threshold = 0.1,
	rootMargin = "50px",
	...props
}: LazyImageProps) {
	const [isLoaded, setIsLoaded] = useState(false);
	const [isInView, setIsInView] = useState(false);
	const [hasError, setHasError] = useState(false);
	const imgRef = useRef<HTMLImageElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						setIsInView(true);
						observer.unobserve(entry.target);
					}
				}
			},
			{
				threshold,
				rootMargin,
			},
		);

		observer.observe(container);

		return () => {
			observer.unobserve(container);
		};
	}, [threshold, rootMargin]);

	const handleLoad = () => {
		setIsLoaded(true);
		onLoad?.();
	};

	const handleError = () => {
		setHasError(true);
		onError?.();
	};

	const resolvedAlt = alt?.trim() ? alt : "图片";

	return (
		<div
			ref={containerRef}
			className={cn("relative overflow-hidden", className)}
		>
			{/* 低质量占位符 */}
			{!isLoaded && !hasError && (
				<div className="absolute inset-0 flex animate-pulse items-center justify-center bg-gray-200">
					<div className="text-gray-400 text-sm">加载中...</div>
				</div>
			)}

			{/* 错误状态 */}
			{hasError && (
				<div className="absolute inset-0 flex items-center justify-center bg-gray-100">
					<div className="text-center text-gray-500 text-sm">
						<div className="mb-2 text-2xl">🖼️</div>
						<div>图片加载失败</div>
					</div>
				</div>
			)}

			{/* 实际图片 */}
			{isInView && !hasError && (
				<img
					ref={imgRef}
					src={src}
					alt={resolvedAlt}
					onLoad={handleLoad}
					onError={handleError}
					className={cn(
						"transition-opacity duration-300",
						isLoaded ? "opacity-100" : "opacity-0",
						className,
					)}
					{...props}
				/>
			)}
		</div>
	);
}

// 响应式图片组件
interface ResponsiveImageProps {
	src: string;
	alt: string;
	sizes?: string;
	className?: string;
	aspectRatio?: number;
	priority?: boolean;
}

export function ResponsiveImage({
	src,
	alt,
	sizes = "(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw",
	className,
	aspectRatio,
	priority = false,
}: ResponsiveImageProps) {
	const [currentSrc, setCurrentSrc] = useState<string>("");
	const [isLoaded, setIsLoaded] = useState(false);

	// 生成不同尺寸的图片URL
	const generateSrcSet = (baseSrc: string) => {
		const widths = [320, 640, 768, 1024, 1280, 1536];
		return widths.map((width) => `${baseSrc}?w=${width} ${width}w`).join(", ");
	};

	const imgSrc = priority ? src : currentSrc;

	return (
		<div className={cn("relative", className)}>
			{aspectRatio && (
				<div
					style={{ paddingBottom: `${(1 / aspectRatio) * 100}%` }}
					className="relative"
				>
					<div className="absolute inset-0">
						{priority ? (
							<img
								src={src}
								srcSet={generateSrcSet(src)}
								sizes={sizes}
								alt={alt}
								onLoad={() => setIsLoaded(true)}
								className={cn(
									"h-full w-full object-cover transition-opacity duration-300",
									isLoaded ? "opacity-100" : "opacity-0",
								)}
							/>
						) : (
							<LazyImage
								src={src}
								alt={alt}
								className="h-full w-full object-cover"
								onLoad={() => setIsLoaded(true)}
							/>
						)}
					</div>
				</div>
			)}

			{!aspectRatio && (
				<picture>
					{priority ? (
						<img
							src={src}
							srcSet={generateSrcSet(src)}
							sizes={sizes}
							alt={alt}
							onLoad={() => setIsLoaded(true)}
							className={cn(
								"h-auto w-full transition-opacity duration-300",
								isLoaded ? "opacity-100" : "opacity-0",
								className,
							)}
						/>
					) : (
						<LazyImage
							src={src}
							alt={alt}
							className={cn("h-auto w-full", className)}
							onLoad={() => setIsLoaded(true)}
						/>
					)}
				</picture>
			)}
		</div>
	);
}

// 图片预加载Hook
export function useImagePreloader(urls: string[]) {
	const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
	const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
	const [isLoading, setIsLoading] = useState(false);

	const preloadImages = React.useCallback(async (imageUrls: string[]) => {
		setIsLoading(true);

		const promises = imageUrls.map((url) => {
			return new Promise<{ url: string; status: "loaded" | "failed" }>(
				(resolve) => {
					const img = new Image();

					img.onload = () => resolve({ url, status: "loaded" });
					img.onerror = () => resolve({ url, status: "failed" });

					img.src = url;
				},
			);
		});

		try {
			const results = await Promise.all(promises);

			const loaded = new Set<string>();
			const failed = new Set<string>();

			for (const { url, status } of results) {
				if (status === "loaded") {
					loaded.add(url);
				} else {
					failed.add(url);
				}
			}

			setLoadedImages(loaded);
			setFailedImages(failed);
		} finally {
			setIsLoading(false);
		}
	}, []);

	return {
		loadedImages,
		failedImages,
		isLoading,
		preloadImages,
	};
}
