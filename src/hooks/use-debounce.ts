"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// 基础防抖Hook
export function useDebounce<T>(value: T, delay: number): T {
	const [debouncedValue, setDebouncedValue] = useState<T>(value);

	useEffect(() => {
		const handler = setTimeout(() => {
			setDebouncedValue(value);
		}, delay);

		return () => {
			clearTimeout(handler);
		};
	}, [value, delay]);

	return debouncedValue;
}

// 防抖回调Hook
export function useDebouncedCallback<T extends (...args: any[]) => any>(
	callback: T,
	delay: number,
	deps: React.DependencyList = [],
): T {
	const callbackRef = useRef(callback);
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);

	// 更新回调函数的引用
	useEffect(() => {
		callbackRef.current = callback;
	}, [callback]);

	// 清理函数
	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, []);

	const debouncedCallback = useCallback(
		(...args: Parameters<T>) => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}

			timeoutRef.current = setTimeout(() => {
				callbackRef.current(...args);
			}, delay);
		},
		[delay, ...deps],
	) as T;

	return debouncedCallback;
}

// 防抖状态Hook
export function useDebouncedState<T>(
	initialValue: T,
	delay: number,
): [T, T, (value: T) => void] {
	const [immediateValue, setImmediateValue] = useState<T>(initialValue);
	const debouncedValue = useDebounce(immediateValue, delay);

	return [immediateValue, debouncedValue, setImmediateValue];
}

// 防抖异步操作Hook
export function useDebouncedAsync<T, Args extends any[]>(
	asyncFn: (...args: Args) => Promise<T>,
	delay: number,
	options: {
		onSuccess?: (data: T) => void;
		onError?: (error: Error) => void;
		onCancel?: () => void;
	} = {},
) {
	const [loading, setLoading] = useState(false);
	const [data, setData] = useState<T | null>(null);
	const [error, setError] = useState<Error | null>(null);
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);
	const cancelRef = useRef<(() => void) | null>(null);

	const execute = useCallback(
		(...args: Args) => {
			// 取消之前的操作
			if (cancelRef.current) {
				cancelRef.current();
				cancelRef.current = null;
			}

			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}

			setLoading(true);
			setError(null);

			timeoutRef.current = setTimeout(async () => {
				try {
					let cancelled = false;
					cancelRef.current = () => {
						cancelled = true;
					};

					const result = await asyncFn(...args);

					if (!cancelled) {
						setData(result);
						setLoading(false);
						options.onSuccess?.(result);
					}
				} catch (err) {
					if (!cancelRef.current) {
						const error =
							err instanceof Error ? err : new Error("Unknown error");
						setError(error);
						setLoading(false);
						options.onError?.(error);
					}
				} finally {
					cancelRef.current = null;
				}
			}, delay);
		},
		[asyncFn, delay, options],
	);

	const cancel = useCallback(() => {
		if (cancelRef.current) {
			cancelRef.current();
			cancelRef.current = null;
			options.onCancel?.();
		}

		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}

		setLoading(false);
	}, [options.onCancel]);

	// 清理函数
	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
			if (cancelRef.current) {
				cancelRef.current();
			}
		};
	}, []);

	return {
		execute,
		cancel,
		loading,
		data,
		error,
	};
}

// 防抖搜索Hook
export function useDebouncedSearch<T>(
	searchFn: (query: string) => Promise<T[]>,
	delay = 300,
) {
	const [query, setQuery] = useState("");
	const [immediateQuery, setImmediateQuery] = useState("");
	const [results, setResults] = useState<T[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	// 防抖查询
	const debouncedQuery = useDebounce(immediateQuery, delay);

	// 执行搜索
	useEffect(() => {
		if (debouncedQuery.trim() === "") {
			setResults([]);
			setError(null);
			setLoading(false);
			return;
		}

		let cancelled = false;

		const performSearch = async () => {
			setLoading(true);
			setError(null);

			try {
				const searchResults = await searchFn(debouncedQuery);

				if (!cancelled) {
					setResults(searchResults);
					setLoading(false);
				}
			} catch (err) {
				if (!cancelled) {
					const error = err instanceof Error ? err : new Error("Search failed");
					setError(error);
					setLoading(false);
					setResults([]);
				}
			}
		};

		performSearch();

		return () => {
			cancelled = true;
		};
	}, [debouncedQuery, searchFn]);

	const handleQueryChange = useCallback((newQuery: string) => {
		setImmediateQuery(newQuery);
		setQuery(newQuery);
	}, []);

	const clearResults = useCallback(() => {
		setImmediateQuery("");
		setQuery("");
		setResults([]);
		setError(null);
		setLoading(false);
	}, []);

	return {
		query,
		immediateQuery,
		results,
		loading,
		error,
		handleQueryChange,
		clearResults,
	};
}

// 防抖表单Hook
export function useDebouncedForm<T extends Record<string, any>>(
	initialValues: T,
	delay = 500,
	options: {
		validate?: (values: T) => Record<string, string> | null;
		onSubmit?: (values: T) => Promise<void> | void;
	} = {},
) {
	const [values, setValues] = useState<T>(initialValues);
	const [immediateValues, setImmediateValues] = useState<T>(initialValues);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [touched, setTouched] = useState<Record<string, boolean>>({});
	const [submitting, setSubmitting] = useState(false);

	// 防抖的values
	const debouncedValues = useDebounce(immediateValues, delay);

	// 验证表单
	const validate = useCallback(
		(formValues: T) => {
			if (!options.validate) return null;

			const validationErrors = options.validate(formValues);
			setErrors(validationErrors || {});
			return validationErrors;
		},
		[options.validate],
	);

	// 处理值变化
	const handleChange = useCallback((name: keyof T, value: any) => {
		setImmediateValues((prev) => ({ ...prev, [name]: value }));
		setTouched((prev) => ({ ...prev, [name]: true }));
	}, []);

	// 处理提交
	const handleSubmit = useCallback(
		async (e?: React.FormEvent) => {
			e?.preventDefault();

			const validationErrors = validate(immediateValues);
			if (validationErrors) return;

			setSubmitting(true);

			try {
				await options.onSubmit?.(immediateValues);
			} catch (error) {
				console.error("Form submission failed:", error);
			} finally {
				setSubmitting(false);
			}
		},
		[immediateValues, validate, options.onSubmit],
	);

	// 重置表单
	const resetForm = useCallback(() => {
		setImmediateValues(initialValues);
		setValues(initialValues);
		setErrors({});
		setTouched({});
		setSubmitting(false);
	}, [initialValues]);

	// 自动验证和提交（当防抖值变化时）
	useEffect(() => {
		setValues(debouncedValues);

		// 如果有提交函数且没有验证错误，自动提交
		if (options.onSubmit && !validate(debouncedValues)) {
			handleSubmit();
		}
	}, [debouncedValues, validate, options.onSubmit, handleSubmit]);

	return {
		values: immediateValues,
		debouncedValues,
		errors,
		touched,
		submitting,
		handleChange,
		handleSubmit,
		resetForm,
		setErrors,
	};
}
