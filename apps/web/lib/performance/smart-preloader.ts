/**
 * 智能预加载系统
 * 基于用户行为预测来优化资源加载性能
 */

export interface PreloadStrategy {
  priority: 'high' | 'medium' | 'low';
  condition?: () => boolean;
  timeout?: number;
}

export interface PreloadItem {
  id: string;
  type: 'script' | 'style' | 'image' | 'font' | 'component';
  url: string;
  strategy: PreloadStrategy;
  loaded: boolean;
  error?: string;
  loadTime?: number;
}

/**
 * 智能预加载管理器
 */
export class SmartPreloader {
  private preloadQueue: PreloadItem[] = [];
  private loadedItems = new Map<string, PreloadItem>();
  private loadingPromises = new Map<string, Promise<void>>();
  private observer: IntersectionObserver | null = null;
  private userBehaviorTracker: UserBehaviorTracker;

  constructor() {
    this.userBehaviorTracker = new UserBehaviorTracker();
    this.initializeObserver();
    this.startIdlePreloading();
  }

  /**
   * 添加预加载项
   */
  addItem(item: Omit<PreloadItem, 'loaded'>): void {
    const preloadItem: PreloadItem = {
      ...item,
      loaded: false,
    };

    this.preloadQueue.push(preloadItem);

    // 立即加载高优先级项
    if (item.strategy.priority === 'high') {
      this.loadItem(preloadItem);
    }
  }

  /**
   * 批量添加预加载项
   */
  addItems(items: Omit<PreloadItem, 'loaded'>[]): void {
    items.forEach(item => this.addItem(item));
  }

  /**
   * 加载单个项目
   */
  private async loadItem(item: PreloadItem): Promise<void> {
    if (this.loadedItems.has(item.id) || this.loadingPromises.has(item.id)) {
      return;
    }

    const loadPromise = this.performLoad(item);
    this.loadingPromises.set(item.id, loadPromise);

    try {
      await loadPromise;
    } catch (error) {
      console.error(`Preload failed for ${item.id}:`, error);
    } finally {
      this.loadingPromises.delete(item.id);
    }
  }

  /**
   * 执行实际的加载操作
   */
  private async performLoad(item: PreloadItem): Promise<void> {
    const startTime = performance.now();

    // 检查加载条件
    if (item.strategy.condition && !item.strategy.condition()) {
      return;
    }

    // 设置超时
    const timeoutPromise = item.strategy.timeout
      ? new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Preload timeout')), item.strategy.timeout);
        })
      : null;

    try {
      const loadPromise = this.loadByType(item);
      const result = timeoutPromise ? Promise.race([loadPromise, timeoutPromise]) : loadPromise;
      await result;

      item.loaded = true;
      item.loadTime = performance.now() - startTime;
      this.loadedItems.set(item.id, item);

      // 触发加载完成事件
      this.dispatchEvent('preload-complete', item);
    } catch (error) {
      item.error = error instanceof Error ? error.message : 'Unknown error';
      this.dispatchEvent('preload-error', item);
      throw error;
    }
  }

  /**
   * 根据类型加载资源
   */
  private async loadByType(item: PreloadItem): Promise<void> {
    switch (item.type) {
      case 'script':
        return this.loadScript(item);
      case 'style':
        return this.loadStyle(item);
      case 'image':
        return this.loadImage(item);
      case 'font':
        return this.loadFont(item);
      case 'component':
        return this.loadComponent(item);
      default:
        throw new Error(`Unsupported preload type: ${item.type}`);
    }
  }

  /**
   * 加载脚本
   */
  private async loadScript(item: PreloadItem): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${item.url}"]`)) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = item.url;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Script load failed: ${item.url}`));
      document.head.appendChild(script);
    });
  }

  /**
   * 加载样式
   */
  private async loadStyle(item: PreloadItem): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`link[href="${item.url}"]`)) {
        resolve();
        return;
      }

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = item.url;
      link.onload = () => resolve();
      link.onerror = () => reject(new Error(`Style load failed: ${item.url}`));
      document.head.appendChild(link);
    });
  }

  /**
   * 加载图片
   */
  private async loadImage(item: PreloadItem): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Image load failed: ${item.url}`));
      img.src = item.url;
    });
  }

  /**
   * 加载字体
   */
  private async loadFont(item: PreloadItem): Promise<void> {
    return new Promise((resolve, reject) => {
      const font = new FontFace(item.id, `url(${item.url})`);
      font.load()
        .then(() => {
          document.fonts.add(font);
          resolve();
        })
        .catch(reject);
    });
  }

  /**
   * 加载组件（动态导入）
   */
  private async loadComponent(item: PreloadItem): Promise<void> {
    // 这里假设URL是一个可以动态导入的模块路径
    // 实际实现可能需要根据项目架构调整
    try {
      await import(/* @vite-ignore */ item.url);
    } catch (error) {
      throw new Error(`Component load failed: ${item.url}`);
    }
  }

  /**
   * 初始化Intersection Observer
   */
  private initializeObserver(): void {
    if (typeof IntersectionObserver === 'undefined') {
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const preloadId = entry.target.getAttribute('data-preload-id');
            if (preloadId) {
              const item = this.preloadQueue.find(i => i.id === preloadId);
              if (item && item.strategy.priority === 'medium') {
                this.loadItem(item);
              }
            }
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.1,
      }
    );
  }

  /**
   * 开始空闲时预加载
   */
  private startIdlePreloading(): void {
    if (typeof requestIdleCallback === 'undefined') {
      // 降级处理
      setTimeout(() => this.preloadIdleItems(), 1000);
      return;
    }

    requestIdleCallback(() => this.preloadIdleItems());
  }

  /**
   * 预加载空闲时的项目
   */
  private async preloadIdleItems(): Promise<void> {
    const idleItems = this.preloadQueue.filter(
      item => !item.loaded && item.strategy.priority === 'low'
    );

    for (const item of idleItems) {
      if ('requestIdleCallback' in window) {
        await new Promise<void>((resolve) => {
          requestIdleCallback(() => {
            this.loadItem(item).finally(resolve);
          });
        });
      } else {
        await this.loadItem(item);
        // 添加延迟避免阻塞
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  /**
   * 基于用户行为预加载
   */
  preloadBasedOnBehavior(): void {
    const predictions = this.userBehaviorTracker.getPredictions();

    predictions.forEach(prediction => {
      const relevantItems = this.preloadQueue.filter(item =>
        prediction.items.includes(item.id)
      );

      relevantItems.forEach(item => {
        if (!item.loaded && prediction.confidence > 0.7) {
          this.loadItem(item);
        }
      });
    });
  }

  /**
   * 获取预加载统计信息
   */
  getStats() {
    return {
      total: this.preloadQueue.length,
      loaded: this.loadedItems.size,
      loading: this.loadingPromises.size,
      pending: this.preloadQueue.filter(item => !item.loaded).length,
      averageLoadTime: this.calculateAverageLoadTime(),
    };
  }

  /**
   * 计算平均加载时间
   */
  private calculateAverageLoadTime(): number {
    const loadTimes = Array.from(this.loadedItems.values())
      .map(item => item.loadTime)
      .filter((time): time is number => time !== undefined);

    if (loadTimes.length === 0) return 0;

    return loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length;
  }

  /**
   * 派发自定义事件
   */
  private dispatchEvent(type: string, item: PreloadItem): void {
    const event = new CustomEvent(type, {
      detail: item,
      bubbles: true,
      composed: true,
    });
    document.dispatchEvent(event);
  }

  /**
   * 清理资源
   */
  destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.loadedItems.clear();
    this.loadingPromises.clear();
    this.preloadQueue = [];
  }
}

/**
 * 用户行为追踪器
 */
class UserBehaviorTracker {
  private clickHistory: Array<{ element: string; timestamp: number }> = [];
  private scrollHistory: Array<{ position: number; timestamp: number }> = [];
  private navigationHistory: Array<{ path: string; timestamp: number }> = [];

  constructor() {
    this.setupEventListeners();
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 点击追踪
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const elementId = target.id || target.className || target.tagName;
      this.clickHistory.push({
        element: elementId,
        timestamp: Date.now(),
      });

      // 保持历史记录在合理范围内
      if (this.clickHistory.length > 50) {
        this.clickHistory = this.clickHistory.slice(-50);
      }
    });

    // 滚动追踪
    let scrollTimeout: number;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = window.setTimeout(() => {
        this.scrollHistory.push({
          position: window.scrollY,
          timestamp: Date.now(),
        });

        if (this.scrollHistory.length > 20) {
          this.scrollHistory = this.scrollHistory.slice(-20);
        }
      }, 100);
    });

    // 导航追踪
    this.navigationHistory.push({
      path: window.location.pathname,
      timestamp: Date.now(),
    });
  }

  /**
   * 获取行为预测
   */
  getPredictions(): Array<{ items: string[]; confidence: number }> {
    const predictions: Array<{ items: string[]; confidence: number }> = [];

    // 基于点击历史预测
    if (this.clickHistory.length > 5) {
      const frequentElements = this.getFrequentElements();
      predictions.push({
        items: frequentElements,
        confidence: 0.8,
      });
    }

    // 基于滚动模式预测
    if (this.scrollHistory.length > 3) {
      const scrollDirection = this.getScrollDirection();
      if (scrollDirection === 'down') {
        predictions.push({
          items: ['footer', 'more-content'],
          confidence: 0.6,
        });
      }
    }

    return predictions;
  }

  /**
   * 获取频繁点击的元素
   */
  private getFrequentElements(): string[] {
    const elementCounts = new Map<string, number>();

    this.clickHistory.forEach(click => {
      elementCounts.set(click.element, (elementCounts.get(click.element) || 0) + 1);
    });

    return Array.from(elementCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([element]) => element);
  }

  /**
   * 获取滚动方向
   */
  private getScrollDirection(): 'up' | 'down' | 'stable' {
    if (this.scrollHistory.length < 2) return 'stable';

    const recent = this.scrollHistory.slice(-2);
    const diff = recent[1].position - recent[0].position;

    if (diff > 50) return 'down';
    if (diff < -50) return 'up';
    return 'stable';
  }
}

// 全局预加载器实例
let globalPreloader: SmartPreloader | null = null;

/**
 * 获取全局预加载器实例
 */
export function getGlobalPreloader(): SmartPreloader {
  if (!globalPreloader) {
    globalPreloader = new SmartPreloader();
  }
  return globalPreloader;
}

/**
 * 重置全局预加载器
 */
export function resetGlobalPreloader(): void {
  if (globalPreloader) {
    globalPreloader.destroy();
  }
  globalPreloader = null;
}

/**
 * 预加载常用资源
 */
export function preloadCommonResources(): void {
  const preloader = getGlobalPreloader();

  // 预加载常用字体
  preloader.addItem({
    id: 'inter-font',
    type: 'font',
    url: '/fonts/inter.woff2',
    strategy: { priority: 'high' },
  });

  // 预加载关键CSS
  preloader.addItem({
    id: 'critical-css',
    type: 'style',
    url: '/styles/critical.css',
    strategy: { priority: 'high' },
  });

  // 预加载常用图标
  preloader.addItem({
    id: 'lucide-icons',
    type: 'script',
    url: '/scripts/lucide-icons.js',
    strategy: { priority: 'medium' },
  });
}