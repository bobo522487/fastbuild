"use client";

import React, { useMemo, useCallback, useRef } from "react";
import { cn } from "~/lib/utils";

interface VirtualListProps<T> {
	items: T[];
	itemHeight: number;
	containerHeight: number;
	renderItem: (item: T, index: number) => React.ReactNode;
	className?: string;
	overscan?: number;
	onScroll?: (scrollTop: number) => void;
	estimatedItemHeight?: (index: number) => number;
}

export function VirtualList<T>({
	items,
	itemHeight,
	containerHeight,
	renderItem,
	className,
	overscan = 5,
	onScroll,
	estimatedItemHeight,
}: VirtualListProps<T>) {
	const [scrollTop, setScrollTop] = React.useState(0);
	const containerRef = useRef<HTMLDivElement>(null);
	const scrollElementRef = useRef<HTMLDivElement>(null);

	// 计算可见范围
	const visibleRange = useMemo(() => {
		const startIndex = Math.max(
			0,
			Math.floor(scrollTop / itemHeight) - overscan,
		);
		const endIndex = Math.min(
			items.length - 1,
			startIndex + Math.ceil(containerHeight / itemHeight) + overscan * 2,
		);

		return { startIndex, endIndex };
	}, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

	// 计算项目位置
	const getItemStyle = useCallback(
		(index: number) => {
			const height = estimatedItemHeight
				? estimatedItemHeight(index)
				: itemHeight;
			const top = estimatedItemHeight
				? Array.from({ length: index }, (_, i) =>
						estimatedItemHeight(i),
					).reduce((sum, h) => sum + h, 0)
				: index * itemHeight;

			return {
				position: "absolute" as const,
				top: `${top}px`,
				left: 0,
				right: 0,
				height: `${height}px`,
			};
		},
		[itemHeight, estimatedItemHeight],
	);

	// 计算总高度
	const totalHeight = useMemo(() => {
		if (estimatedItemHeight) {
			return Array.from({ length: items.length }, (_, i) =>
				estimatedItemHeight(i),
			).reduce((sum, height) => sum + height, 0);
		}
		return items.length * itemHeight;
	}, [items.length, itemHeight, estimatedItemHeight]);

	// 处理滚动事件
	const handleScroll = useCallback(
		(e: React.UIEvent<HTMLDivElement>) => {
			const newScrollTop = e.currentTarget.scrollTop;
			setScrollTop(newScrollTop);
			onScroll?.(newScrollTop);
		},
		[onScroll],
	);

	// 渲染可见项目
	const visibleItems = useMemo(() => {
		const result = [];
		for (let i = visibleRange.startIndex; i <= visibleRange.endIndex; i++) {
			if (i >= 0 && i < items.length) {
				const item = items[i];
				if (item !== undefined) {
					result.push(
						<div key={i} style={getItemStyle(i)}>
							{renderItem(item, i)}
						</div>,
					);
				}
			}
		}
		return result;
	}, [visibleRange, items, renderItem, getItemStyle]);

	return (
		<div
			ref={containerRef}
			className={cn("relative overflow-auto", className)}
			style={{ height: containerHeight }}
			onScroll={handleScroll}
		>
			<div
				ref={scrollElementRef}
				className="relative"
				style={{ height: totalHeight }}
			>
				{visibleItems}
			</div>
		</div>
	);
}

// 动态高度的虚拟列表
interface DynamicVirtualListProps<T> {
	items: T[];
	estimatedItemHeight: number;
	containerHeight: number;
	renderItem: (item: T, index: number) => React.ReactNode;
	className?: string;
	overscan?: number;
	onScroll?: (scrollTop: number) => void;
}

export function DynamicVirtualList<T>({
	items,
	estimatedItemHeight,
	containerHeight,
	renderItem,
	className,
	overscan = 5,
	onScroll,
}: DynamicVirtualListProps<T>) {
	const [scrollTop, setScrollTop] = React.useState(0);
	const [itemHeights, setItemHeights] = React.useState<number[]>(() =>
		items.map(() => estimatedItemHeight),
	);

	// 更新项目高度
	const updateItemHeight = useCallback((index: number, height: number) => {
		setItemHeights((prev) => {
			if (prev[index] !== height) {
				const newHeights = [...prev];
				newHeights[index] = height;
				return newHeights;
			}
			return prev;
		});
	}, []);

	// 计算项目位置和可见范围
	const { visibleRange, itemPositions, totalHeight } = useMemo(() => {
		const positions: number[] = [0];
		for (let i = 1; i < items.length; i++) {
			const prevPosition = positions[i - 1];
			const prevHeight = itemHeights[i - 1];
			if (prevPosition !== undefined && prevHeight !== undefined) {
				positions.push(prevPosition + prevHeight);
			}
		}

		const lastPosition = positions[positions.length - 1];
		const lastHeight = itemHeights[itemHeights.length - 1];
		const totalHeight =
			lastPosition !== undefined && lastHeight !== undefined
				? lastPosition + lastHeight
				: 0;

		let startIndex = 0;
		let endIndex = items.length - 1;

		// 找到第一个可见项目
		for (let i = 0; i < positions.length; i++) {
			const position = positions[i];
			const height = itemHeights[i];
			if (
				position !== undefined &&
				height !== undefined &&
				position + height > scrollTop
			) {
				startIndex = Math.max(0, i - overscan);
				break;
			}
		}

		// 找到最后一个可见项目
		for (let i = startIndex; i < items.length; i++) {
			const position = positions[i];
			if (position !== undefined && position > scrollTop + containerHeight) {
				endIndex = Math.min(items.length - 1, i + overscan);
				break;
			}
		}

		return {
			visibleRange: { startIndex, endIndex },
			itemPositions: positions,
			totalHeight,
		};
	}, [items.length, itemHeights, scrollTop, containerHeight, overscan]);

	// 处理滚动事件
	const handleScroll = useCallback(
		(e: React.UIEvent<HTMLDivElement>) => {
			const newScrollTop = e.currentTarget.scrollTop;
			setScrollTop(newScrollTop);
			onScroll?.(newScrollTop);
		},
		[onScroll],
	);

	// 渲染可见项目
	const visibleItems = useMemo(() => {
		const result = [];
		for (let i = visibleRange.startIndex; i <= visibleRange.endIndex; i++) {
			if (i >= 0 && i < items.length) {
				const item = items[i];
				if (item !== undefined) {
					const top = itemPositions[i];
					const height = itemHeights[i];
					if (top !== undefined && height !== undefined) {
						result.push(
							<DynamicListItem
								key={i}
								index={i}
								top={top}
								height={height}
								onUpdateHeight={updateItemHeight}
							>
								{renderItem(item, i)}
							</DynamicListItem>,
						);
					}
				}
			}
		}
		return result;
	}, [
		visibleRange,
		items,
		renderItem,
		itemPositions,
		itemHeights,
		updateItemHeight,
	]);

	return (
		<div
			className={cn("relative overflow-auto", className)}
			style={{ height: containerHeight }}
			onScroll={handleScroll}
		>
			<div className="relative" style={{ height: totalHeight }}>
				{visibleItems}
			</div>
		</div>
	);
}

// 动态高度列表项组件
interface DynamicListItemProps {
	index: number;
	top: number;
	height: number;
	onUpdateHeight: (index: number, height: number) => void;
	children: React.ReactNode;
}

const DynamicListItem = React.forwardRef<HTMLDivElement, DynamicListItemProps>(
	({ index, top, height, onUpdateHeight, children }, ref) => {
		const [itemHeight, setItemHeight] = React.useState(height);
		const innerRef = useRef<HTMLDivElement>(null);

		// 使用ResizeObserver监听高度变化
		React.useEffect(() => {
			if (!innerRef.current) return;

			const resizeObserver = new ResizeObserver((entries) => {
				for (const entry of entries) {
					const newHeight =
						entry.borderBoxSize[0]?.blockSize || entry.contentRect.height;
					if (newHeight !== itemHeight) {
						setItemHeight(newHeight);
						onUpdateHeight(index, newHeight);
					}
				}
			});

			resizeObserver.observe(innerRef.current);

			return () => {
				resizeObserver.disconnect();
			};
		}, [index, itemHeight, onUpdateHeight]);

		return (
			<div
				ref={ref}
				style={{
					position: "absolute",
					top: `${top}px`,
					left: 0,
					right: 0,
					height: `${itemHeight}px`,
				}}
			>
				<div ref={innerRef} className="h-full">
					{children}
				</div>
			</div>
		);
	},
);

DynamicListItem.displayName = "DynamicListItem";
