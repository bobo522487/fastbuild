'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FormField, FormMetadata } from '@workspace/types';

/**
 * 虚拟化长列表组件
 * 优化大量字段的渲染性能
 */
interface VirtualizedFieldListProps {
  metadata: FormMetadata;
  renderItem: (field: FormField, index: number) => React.ReactNode;
  itemHeight?: number;
  containerHeight?: number;
  overscan?: number;
  className?: string;
}

interface VirtualItem {
  index: number;
  start: number;
  end: number;
  key: string;
  field: FormField;
}

/**
 * 高性能虚拟化列表组件
 * 用于渲染大量表单字段，显著提升性能
 */
export const VirtualizedFieldList: React.FC<VirtualizedFieldListProps> = ({
  metadata,
  renderItem,
  itemHeight = 80, // 默认字段高度
  containerHeight = 600, // 默认容器高度
  overscan = 3, // 预渲染的额外项目数
  className = '',
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafId = useRef<number | null>(null);

  // 计算总高度
  const totalHeight = useMemo(() => {
    return metadata.fields.length * itemHeight;
  }, [metadata.fields.length, itemHeight]);

  // 计算可见项目
  const visibleItems = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      metadata.fields.length - 1,
      startIndex + Math.ceil(containerHeight / itemHeight)
    );

    const items: VirtualItem[] = [];

    // 添加预渲染项目
    const overscanStart = Math.max(0, startIndex - overscan);
    const overscanEnd = Math.min(
      metadata.fields.length - 1,
      endIndex + overscan
    );

    for (let i = overscanStart; i <= overscanEnd; i++) {
      const field = metadata.fields[i];
      if (field) {
        items.push({
          index: i,
          start: i * itemHeight,
          end: (i + 1) * itemHeight,
          key: field.id || `field-${i}`,
          field,
        });
      }
    }

    return items;
  }, [scrollTop, itemHeight, containerHeight, metadata.fields, overscan]);

  // 优化滚动事件处理
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
    }

    rafId.current = requestAnimationFrame(() => {
      setScrollTop(event.currentTarget.scrollTop);
    });
  }, []);

  // 清理动画帧
  useEffect(() => {
    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  // 自动滚动到错误字段
  const scrollToField = useCallback((fieldId: string) => {
    const fieldIndex = metadata.fields.findIndex(field => field.id === fieldId);
    if (fieldIndex !== -1 && containerRef.current) {
      const scrollTop = fieldIndex * itemHeight;
      containerRef.current.scrollTo({
        top: scrollTop,
        behavior: 'smooth',
      });
    }
  }, [metadata.fields, itemHeight]);

  // 滚动到第一个错误字段
  const scrollToFirstError = useCallback(() => {
    // 这里可以与表单验证系统集成
    // 暂时提供一个通用的实现
    const firstErrorField = metadata.fields.find(field =>
      document.querySelector(`[data-field-id="${field.id}"].error`)
    );

    if (firstErrorField) {
      scrollToField(firstErrorField.id);
    }
  }, [metadata.fields, scrollToField]);

  // 键盘导航支持
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!containerRef.current) return;

      const currentIndex = Math.floor(scrollTop / itemHeight);
      let newIndex = currentIndex;

      switch (event.key) {
        case 'ArrowDown':
          newIndex = Math.min(currentIndex + 1, metadata.fields.length - 1);
          break;
        case 'ArrowUp':
          newIndex = Math.max(currentIndex - 1, 0);
          break;
        case 'PageDown':
          newIndex = Math.min(currentIndex + Math.floor(containerHeight / itemHeight), metadata.fields.length - 1);
          break;
        case 'PageUp':
          newIndex = Math.max(currentIndex - Math.floor(containerHeight / itemHeight), 0);
          break;
        case 'Home':
          newIndex = 0;
          break;
        case 'End':
          newIndex = metadata.fields.length - 1;
          break;
        default:
          return;
      }

      if (newIndex !== currentIndex) {
        event.preventDefault();
        containerRef.current.scrollTo({
          top: newIndex * itemHeight,
          behavior: 'smooth',
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [scrollTop, itemHeight, containerHeight, metadata.fields.length]);

  // 性能优化：使用React.memo渲染项目
  const MemoizedItem = React.memo(({ item, index }: { item: VirtualItem; index: number }) => {
    return (
      <div
        key={item.key}
        style={{
          position: 'absolute',
          top: item.start,
          width: '100%',
          height: itemHeight,
        }}
        data-field-id={item.field.id}
        data-index={index}
      >
        {renderItem(item.field, index)}
      </div>
    );
  }, (prevProps, nextProps) => {
    // 自定义比较函数，只有字段数据变化时才重新渲染
    return prevProps.item.field === nextProps.item.field;
  });

  return (
    <div className={`virtualized-field-list ${className}`}>
      {/* 虚拟化容器 */}
      <div
        ref={containerRef}
        className="virtualized-container overflow-auto border border-gray-200 rounded"
        style={{ height: containerHeight }}
        onScroll={handleScroll}
      >
        {/* 占位空间 */}
        <div
          className="virtualized-spacer"
          style={{ height: totalHeight }}
        >
          {/* 可见项目 */}
          {visibleItems.map((item, index) => (
            <MemoizedItem
              key={item.key}
              item={item}
              index={visibleItems.indexOf(item)}
            />
          ))}
        </div>
      </div>

      {/* 滚动指示器 */}
      <div className="scroll-indicator flex items-center justify-between mt-2 text-sm text-gray-500">
        <span>
          显示 {visibleItems.length} / {metadata.fields.length} 个字段
        </span>
        <span>
          位置 {Math.floor(scrollTop / itemHeight) + 1} - {Math.floor((scrollTop + containerHeight) / itemHeight)}
        </span>
      </div>

      {/* 快速导航 */}
      <div className="quick-nav mt-2 flex gap-2">
        <button
          onClick={() => containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
          className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
        >
          首页
        </button>
        <button
          onClick={scrollToFirstError}
          className="px-3 py-1 text-sm bg-red-200 hover:bg-red-300 rounded"
        >
          错误
        </button>
        <button
          onClick={() => containerRef.current?.scrollTo({ top: totalHeight, behavior: 'smooth' })}
          className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
        >
          末页
        </button>
      </div>

      {/* 键盘快捷键提示 */}
      <div className="keyboard-hints mt-2 text-xs text-gray-500">
        <div>导航: ↑↓ PageUp/PageDown Home/End</div>
      </div>
    </div>
  );
};

/**
 * 带有分组功能的虚拟化列表
 */
interface GroupedVirtualizedFieldListProps extends VirtualizedFieldListProps {
  groupBy?: (field: FormField) => string;
  groupHeaderHeight?: number;
}

export const GroupedVirtualizedFieldList: React.FC<GroupedVirtualizedFieldListProps> = ({
  metadata,
  groupBy,
  groupHeaderHeight = 40,
  ...props
}) => {
  // 分组逻辑
  const groups = useMemo(() => {
    if (!groupBy) {
      return [{
        name: '所有字段',
        fields: metadata.fields,
        startIndex: 0,
        endIndex: metadata.fields.length - 1,
      }];
    }

    const fieldGroups = new Map<string, FormField[]>();

    metadata.fields.forEach(field => {
      const groupName = groupBy(field);
      if (!fieldGroups.has(groupName)) {
        fieldGroups.set(groupName, []);
      }
      fieldGroups.get(groupName)!.push(field);
    });

    let startIndex = 0;
    return Array.from(fieldGroups.entries()).map(([name, fields]) => {
      const group = {
        name,
        fields,
        startIndex,
        endIndex: startIndex + fields.length - 1,
      };
      startIndex += fields.length;
      return group;
    });
  }, [metadata.fields, groupBy]);

  return (
    <div className="grouped-virtualized-list">
      {groups.map((group, groupIndex) => (
        <div key={group.name} className="mb-4">
          {/* 分组标题 */}
          <div
            className="group-header bg-gray-100 px-4 py-2 font-medium text-gray-700 border-b"
            style={{ height: groupHeaderHeight }}
          >
            {group.name} ({group.fields.length})
          </div>

          {/* 分组内的虚拟化列表 */}
          <VirtualizedFieldList
            metadata={{ ...metadata, fields: group.fields }}
            {...props}
          />
        </div>
      ))}
    </div>
  );
};

export default VirtualizedFieldList;