import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/**
 * 生成随机slug
 * @param name 基础名称
 * @returns 唯一的slug字符串
 */
export function generateSlug(name: string): string {
	const baseSlug = name
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\s\-_]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");

	// 如果基础slug为空，使用随机字符串
	if (!baseSlug) {
		return Math.random().toString(36).substring(2, 15);
	}

	// 添加随机后缀确保唯一性
	const randomSuffix = Math.random().toString(36).substring(2, 8);
	return `${baseSlug}-${randomSuffix}`;
}
