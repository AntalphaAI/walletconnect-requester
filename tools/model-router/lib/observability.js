/**
 * 可观测性模块 - Model Router v4
 * 
 * 功能：路由日志、指标收集、性能追踪
 */

const fs = require('fs');
const path = require('path');

/**
 * 默认配置
 */
const DEFAULT_OBSERVABILITY_CONFIG = {
  enabled: true,
  logLevel: 'info',  // debug, info, warn, error
  logToFile: false,  // 默认关闭文件日志
  logDir: null,      // 延迟初始化
  maxLogFiles: 7,    // 保留最近7天日志
  metricsEnabled: true,
  slowRouteThresholdMs: 50  // 超过50ms认为是慢路由
};

/**
 * 路由日志条目
 */
class RouteLogEntry {
  constructor(data) {
    this.timestamp = new Date().toISOString();
    this.input = data.input?.slice(0, 200);  // 截断输入
    this.profile = data.profile || 'auto';
    this.tier = data.tier;
    this.model = data.model;
    this.confidence = data.confidence;
    this.latencyMs = data.latencyMs;
    this.signals = data.signals;
    this.cacheHit = data.cacheHit || false;
    this.fallbackTriggered = data.fallbackTriggered || false;
  }
}

/**
 * 指标收集器
 */
class MetricsCollector {
  constructor() {
    this.reset();
  }

  reset() {
    this.totalRoutes = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.fallbackTriggers = 0;
    this.errors = 0;
    this.tierDistribution = { SIMPLE: 0, MEDIUM: 0, COMPLEX: 0, REASONING: 0 };
    this.profileDistribution = {};
    this.modelDistribution = {};
    this.latencyHistogram = {  // 延迟分布（毫秒）
      '0-10': 0,
      '10-50': 0,
      '50-100': 0,
      '100+': 0
    };
    this.startTime = Date.now();
  }

  recordRoute(result, latencyMs) {
    this.totalRoutes++;
    
    // Tier 分布
    if (result.features?.tier) {
      this.tierDistribution[result.features.tier]++;
    }
    
    // Profile 分布
    const profile = result.profile || 'auto';
    this.profileDistribution[profile] = (this.profileDistribution[profile] || 0) + 1;
    
    // 模型分布
    const model = result.model_sequence?.[0];
    if (model) {
      const modelKey = typeof model === 'string' ? model : model.alias;
      this.modelDistribution[modelKey] = (this.modelDistribution[modelKey] || 0) + 1;
    }
    
    // 延迟分布
    if (latencyMs < 10) this.latencyHistogram['0-10']++;
    else if (latencyMs < 50) this.latencyHistogram['10-50']++;
    else if (latencyMs < 100) this.latencyHistogram['50-100']++;
    else this.latencyHistogram['100+']++;
    
    // Fallback 触发
    if (result.signals?.includes('fallback-triggered')) {
      this.fallbackTriggers++;
    }
    
    // 缓存命中
    if (result.cacheHit) {
      this.cacheHits++;
    } else {
      this.cacheMisses++;
    }
  }

  recordError() {
    this.errors++;
  }

  getStats() {
    const uptime = Date.now() - this.startTime;
    const cacheHitRate = this.totalRoutes > 0 
      ? (this.cacheHits / this.totalRoutes * 100).toFixed(1)
      : 0;
    
    return {
      uptime,
      totalRoutes: this.totalRoutes,
      cacheHitRate: `${cacheHitRate}%`,
      fallbackRate: this.totalRoutes > 0 
        ? `${(this.fallbackTriggers / this.totalRoutes * 100).toFixed(1)}%`
        : '0%',
      errorRate: this.totalRoutes > 0
        ? `${(this.errors / this.totalRoutes * 100).toFixed(1)}%`
        : '0%',
      tierDistribution: this.tierDistribution,
      profileDistribution: this.profileDistribution,
      modelDistribution: this.modelDistribution,
      latencyHistogram: this.latencyHistogram,
      avgLatency: this.calculateAvgLatency()
    };
  }

  calculateAvgLatency() {
    const total = Object.values(this.latencyHistogram).reduce((a, b) => a + b, 0);
    if (total === 0) return 0;
    
    const weightedSum = 
      this.latencyHistogram['0-10'] * 5 +
      this.latencyHistogram['10-50'] * 30 +
      this.latencyHistogram['50-100'] * 75 +
      this.latencyHistogram['100+'] * 150;
    
    return Math.round(weightedSum / total);
  }
}

// 全局指标收集器
const globalMetrics = new MetricsCollector();

/**
 * 日志写入器
 */
class LogWriter {
  constructor(config = DEFAULT_OBSERVABILITY_CONFIG) {
    this.config = config;
    this.buffer = [];
    this.flushInterval = null;
    
    if (config.logToFile && config.logDir) {
      this.ensureLogDir();
      this.startFlushInterval();
    }
  }

  ensureLogDir() {
    if (!this.config.logDir) return;
    if (!fs.existsSync(this.config.logDir)) {
      fs.mkdirSync(this.config.logDir, { recursive: true });
    }
  }

  getLogFilePath() {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.config.logDir, `router-${date}.log`);
  }

  log(entry) {
    if (!this.config.enabled) return;
    
    const logLine = JSON.stringify(entry);
    
    // 控制台输出
    if (this.config.logLevel === 'debug') {
      console.error(`[router-log] ${logLine}`);
    }
    
    // 文件缓冲
    if (this.config.logToFile) {
      this.buffer.push(logLine);
      if (this.buffer.length >= 100) {
        this.flush();
      }
    }
  }

  flush() {
    if (this.buffer.length === 0) return;
    
    try {
      const logFile = this.getLogFilePath();
      const content = this.buffer.join('\n') + '\n';
      fs.appendFileSync(logFile, content);
      this.buffer = [];
    } catch (e) {
      console.error('[router-log] 写入失败:', e.message);
    }
  }

  startFlushInterval() {
    this.flushInterval = setInterval(() => this.flush(), 5000);  // 5秒刷新
  }

  stop() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flush();
    }
  }
}

// 全局日志写入器
let globalLogWriter = null;

function getLogWriter(config) {
  if (!globalLogWriter) {
    globalLogWriter = new LogWriter(config);
  }
  return globalLogWriter;
}

/**
 * 记录路由事件
 * 
 * @param {object} data - 路由数据
 * @param {object} config - 配置
 */
function logRoute(data, config = DEFAULT_OBSERVABILITY_CONFIG) {
  if (!config.enabled) return;
  
  const entry = new RouteLogEntry(data);
  const writer = getLogWriter(config);
  writer.log(entry);
  
  // 记录指标
  globalMetrics.recordRoute(data, data.latencyMs);
  
  // 慢路由警告
  if (data.latencyMs > config.slowRouteThresholdMs) {
    console.warn(`[router-slow] ${data.latencyMs}ms > ${config.slowRouteThresholdMs}ms threshold`);
  }
}

/**
 * 记录错误
 */
function logError(error, config = DEFAULT_OBSERVABILITY_CONFIG) {
  if (!config.enabled) return;
  
  globalMetrics.recordError();
  
  const writer = getLogWriter(config);
  writer.log({
    timestamp: new Date().toISOString(),
    level: 'error',
    error: error.message,
    stack: error.stack
  });
}

/**
 * 获取指标统计
 */
function getMetrics() {
  return globalMetrics.getStats();
}

/**
 * 重置指标
 */
function resetMetrics() {
  globalMetrics.reset();
}

/**
 * 创建性能追踪器
 */
function createTimer() {
  const start = process.hrtime.bigint();
  return {
    elapsedMs: () => {
      const end = process.hrtime.bigint();
      return Number(end - start) / 1_000_000;  // 转换为毫秒
    }
  };
}

module.exports = {
  DEFAULT_OBSERVABILITY_CONFIG,
  RouteLogEntry,
  MetricsCollector,
  LogWriter,
  logRoute,
  logError,
  getMetrics,
  resetMetrics,
  createTimer
};