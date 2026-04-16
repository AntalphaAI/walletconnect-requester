/**
 * 性能优化模块 - Model Router v4
 * 
 * 功能：LRU 缓存、路由结果缓存、预热机制
 */

/**
 * LRU 缓存实现
 */
class LRUCache {
  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
    this.cache = new Map();
    this.hits = 0;
    this.misses = 0;
  }

  get(key) {
    if (this.cache.has(key)) {
      // 移动到末尾（最近使用）
      const value = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, value);
      this.hits++;
      return value;
    }
    this.misses++;
    return null;
  }

  set(key, value, ttlMs = 3600000) {
    // 如果已存在，先删除
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    
    // 如果超过容量，删除最旧的
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    const entry = {
      value,
      expires: Date.now() + ttlMs
    };
    
    this.cache.set(key, entry);
  }

  has(key) {
    if (!this.cache.has(key)) return false;
    const entry = this.cache.get(key);
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  getStats() {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? (this.hits / total * 100).toFixed(1) + '%' : '0%'
    };
  }

  keys() {
    return Array.from(this.cache.keys());
  }
}

/**
 * 路由结果缓存
 */
class RouteCache {
  constructor(options = {}) {
    this.cache = new LRUCache(options.maxSize || 1000);
    this.defaultTTL = options.defaultTTL || 3600000;  // 1小时
    this.enabled = options.enabled !== false;
  }

  /**
   * 生成缓存 key
   */
  generateKey(text, profile = 'auto') {
    // 简单哈希：前100字符 + profile
    const normalized = text.toLowerCase().trim().slice(0, 100);
    return `${profile}:${normalized}`;
  }

  /**
   * 获取缓存结果
   */
  get(text, profile) {
    if (!this.enabled) return null;
    
    const key = this.generateKey(text, profile);
    const entry = this.cache.get(key);
    
    // LRUCache.get 返回 { value: { ...result, cachedAt }, expires }
    if (entry && entry.value) {
      return {
        ...entry.value,
        cacheHit: true
      };
    }
    
    return null;
  }

  /**
   * 设置缓存结果
   */
  set(text, profile, result, ttlMs) {
    if (!this.enabled) return;
    
    const key = this.generateKey(text, profile);
    const ttl = ttlMs || this.defaultTTL;
    
    // 直接存储结果，让 LRU 缓存处理过期
    this.cache.set(key, {
      ...result,
      cachedAt: Date.now()
    }, ttl);
  }

  /**
   * 使缓存失效
   */
  invalidate(text, profile) {
    const key = this.generateKey(text, profile);
    return this.cache.delete(key);
  }

  /**
   * 清空缓存
   */
  clear() {
    this.cache.clear();
  }

  /**
   * 获取统计
   */
  getStats() {
    return this.cache.getStats();
  }
}

/**
 * 预热管理器
 */
class WarmupManager {
  constructor(routeCache) {
    this.routeCache = routeCache;
    this.warmupPatterns = [];
  }

  /**
   * 添加预热模式
   */
  addPattern(pattern, profile = 'auto', expectedTier = null) {
    this.warmupPatterns.push({ pattern, profile, expectedTier });
  }

  /**
   * 执行预热
   */
  async warmup(routeFunction) {
    const results = [];
    
    for (const { pattern, profile } of this.warmupPatterns) {
      try {
        const result = routeFunction({ text: pattern, profile });
        this.routeCache.set(pattern, profile, result);
        results.push({ pattern, success: true, tier: result.features?.tier });
      } catch (e) {
        results.push({ pattern, success: false, error: e.message });
      }
    }
    
    return results;
  }

  /**
   * 获取预热状态
   */
  getStatus() {
    return {
      patterns: this.warmupPatterns.length,
      patternsList: this.warmupPatterns.map(p => p.pattern)
    };
  }
}

/**
 * 默认预热模式
 */
const DEFAULT_WARMUP_PATTERNS = [
  { pattern: '你好', profile: 'auto', expectedTier: 'SIMPLE' },
  { pattern: '什么是比特币', profile: 'auto', expectedTier: 'MEDIUM' },
  { pattern: '帮我写一个 Python 函数', profile: 'coding', expectedTier: 'MEDIUM' },
  { pattern: '分析一下微服务架构', profile: 'premium', expectedTier: 'COMPLEX' },
  { pattern: '证明为什么快速排序平均复杂度是 O(n log n)', profile: 'auto', expectedTier: 'REASONING' }
];

/**
 * 性能监控
 */
class PerformanceMonitor {
  constructor() {
    this.measurements = [];
    this.maxMeasurements = 1000;
  }

  record(name, durationMs) {
    this.measurements.push({ name, durationMs, timestamp: Date.now() });
    
    // 限制大小
    if (this.measurements.length > this.maxMeasurements) {
      this.measurements = this.measurements.slice(-this.maxMeasurements);
    }
  }

  getStats(name = null) {
    const filtered = name 
      ? this.measurements.filter(m => m.name === name)
      : this.measurements;
    
    if (filtered.length === 0) return null;
    
    const durations = filtered.map(m => m.durationMs);
    const sum = durations.reduce((a, b) => a + b, 0);
    const avg = sum / durations.length;
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    
    // P95
    const sorted = [...durations].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p95 = sorted[p95Index] || sorted[sorted.length - 1];
    
    return {
      count: filtered.length,
      avg: Math.round(avg),
      min: Math.round(min),
      max: Math.round(max),
      p95: Math.round(p95)
    };
  }

  reset() {
    this.measurements = [];
  }
}

// 全局性能监控器
const globalMonitor = new PerformanceMonitor();

module.exports = {
  LRUCache,
  RouteCache,
  WarmupManager,
  PerformanceMonitor,
  DEFAULT_WARMUP_PATTERNS,
  globalMonitor
};