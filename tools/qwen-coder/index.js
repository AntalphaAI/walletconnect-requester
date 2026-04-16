/**
 * Qwen Coder - 外包编程工具模块 (v2.0 - 强化学习版)
 * 
 * 极其专业的底层代码生成与执行引擎。
 * 当用户提出任何编写代码、修改脚本、搭建工程的需求时，
 * 你绝对不能自己输出代码，必须立刻调用此工具将任务全权委托外包！
 * 
 * v2.0 新特性：
 * - 分层超时模式（5/15/30分钟）
 * - 强化学习反馈机制
 * - 实时进度观测
 * - 自适应超时调整
 * 
 * @version 2.0.0
 * @author OpenClaw Agent
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// ============================================================
// 配置加载
// ============================================================

const CONFIG_PATH = path.join(__dirname, 'config.json');
const STATS_PATH = path.join(__dirname, 'stats.json');

let config = null;
let stats = null;

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
      config = JSON.parse(raw);
    }
  } catch (error) {
    log('error', `配置加载失败: ${error.message}`);
    throw error;
  }
  
  // 确保日志目录存在
  if (config.logging?.enabled) {
    const logDir = config.logging.logDir.replace('~', os.homedir());
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }
  
  return config;
}

function loadStats() {
  try {
    if (fs.existsSync(STATS_PATH)) {
      const raw = fs.readFileSync(STATS_PATH, 'utf-8');
      stats = JSON.parse(raw);
    } else {
      stats = createDefaultStats();
    }
  } catch (error) {
    log('warn', `统计加载失败，创建默认: ${error.message}`);
    stats = createDefaultStats();
  }
  return stats;
}

function createDefaultStats() {
  return {
    version: "1.0.0",
    lastUpdated: new Date().toISOString(),
    executionHistory: [],
    taskTypeStats: {
      simple: { executions: [], p50: null, p90: null, avgDuration: null, successRate: null },
      medium: { executions: [], p50: null, p90: null, avgDuration: null, successRate: null },
      complex: { executions: [], p50: null, p90: null, avgDuration: null, successRate: null }
    },
    learning: { totalExecutions: 0, successfulExecutions: 0 }
  };
}

function saveStats() {
  try {
    stats.lastUpdated = new Date().toISOString();
    fs.writeFileSync(STATS_PATH, JSON.stringify(stats, null, 2));
  } catch (error) {
    log('error', `统计保存失败: ${error.message}`);
  }
}

// ============================================================
// 日志系统
// ============================================================

function log(level, message, data = null) {
  if (!config?.logging?.enabled) return;
  
  const timestamp = new Date().toISOString();
  const logEntry = { timestamp, level, message, data };
  const logLine = JSON.stringify(logEntry) + '\n';
  
  const logFile = path.join(
    config.logging.logDir.replace('~', os.homedir()),
    `qwen-coder-${new Date().toISOString().split('T')[0]}.log`
  );
  
  try {
    fs.appendFileSync(logFile, logLine);
  } catch (e) {}
  
  if (config?.execution?.debug) {
    console.error(`[QWEN-CODER][${level.toUpperCase()}] ${message}`, data || '');
  }
}

// ============================================================
// 任务类型识别
// ============================================================

function classifyTask(taskDescription) {
  const lower = taskDescription.toLowerCase();
  
  // 简单任务关键词
  const simpleKeywords = ['创建文件', '修改', '小改', '单行', '简单', 'quick', 'fix typo'];
  if (simpleKeywords.some(k => lower.includes(k))) return 'simple';
  
  // 复杂任务关键词
  const complexKeywords = ['搭建项目', '重构', '多模块', '系统', '架构', 'framework', 'scaffold'];
  if (complexKeywords.some(k => lower.includes(k))) return 'complex';
  
  // 默认中等
  return 'medium';
}

// ============================================================
// 强化学习：自适应超时计算
// ============================================================

function calculateAdaptiveTimeout(taskType, model) {
  if (!config.reinforcementLearning?.enabled) {
    return config.timeoutTiers?.[taskType]?.duration || 900000;
  }
  
  const typeStats = stats.taskTypeStats?.[taskType];
  if (!typeStats || !typeStats.executions || typeStats.executions.length < config.reinforcementLearning.minSamplesForStats) {
    // 数据不足，使用默认
    return config.timeoutTiers?.[taskType]?.duration || 900000;
  }
  
  // 基于 P90 计算，留有余量
  const baseTimeout = typeStats.p90 || typeStats.avgDuration;
  const safetyMargin = 1.5; // 50% 余量
  
  let adaptiveTimeout = Math.ceil(baseTimeout * safetyMargin);
  
  // 限制在合理范围内
  const minTimeout = config.timeoutTiers.quick.duration;
  const maxTimeout = config.timeoutTiers.deep.duration * 2;
  
  adaptiveTimeout = Math.max(minTimeout, Math.min(adaptiveTimeout, maxTimeout));
  
  log('info', `自适应超时计算`, { taskType, baseTimeout, adaptiveTimeout, samples: typeStats.executions.length });
  
  return adaptiveTimeout;
}

function updateStatistics(taskType, model, duration, success) {
  if (!stats.taskTypeStats[taskType]) {
    stats.taskTypeStats[taskType] = { executions: [] };
  }
  
  const typeStats = stats.taskTypeStats[taskType];
  
  // 记录执行
  typeStats.executions.push({
    timestamp: new Date().toISOString(),
    model,
    duration,
    success
  });
  
  // 只保留最近 100 条记录
  if (typeStats.executions.length > 100) {
    typeStats.executions = typeStats.executions.slice(-100);
  }
  
  // 重新计算统计指标
  const durations = typeStats.executions.map(e => e.duration).sort((a, b) => a - b);
  const successes = typeStats.executions.filter(e => e.success).length;
  
  typeStats.avgDuration = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
  typeStats.p50 = durations[Math.floor(durations.length * 0.5)];
  typeStats.p90 = durations[Math.floor(durations.length * 0.9)];
  typeStats.successRate = successes / typeStats.executions.length;
  
  // 全局统计
  stats.learning.totalExecutions++;
  if (success) stats.learning.successfulExecutions++;
  
  saveStats();
  
  log('info', `统计更新完成`, { taskType, avgDuration: typeStats.avgDuration, p90: typeStats.p90, successRate: typeStats.successRate });
}

// ============================================================
// 进度观测器
// ============================================================

class ProgressObserver {
  constructor(options = {}) {
    this.checkInterval = options.checkInterval || 60000;
    this.initialDelay = options.initialDelay || 30000;
    this.maxChecksWithoutOutput = options.maxChecksWithoutOutput || 5;
    this.onProgress = options.onProgress || null;
    
    this.checkCount = 0;
    this.lastOutputLength = 0;
    this.noProgressCount = 0;
    this.timer = null;
  }
  
  start(process, onStuck = null) {
    setTimeout(() => {
      this.timer = setInterval(() => {
        this.check(process, onStuck);
      }, this.checkInterval);
    }, this.initialDelay);
  }
  
  check(process, onStuck) {
    this.checkCount++;
    
    // 这里简化处理，实际应该从进程获取输出长度
    // 由于 spawn 的 stdout 是流式，我们需要在外部跟踪
    
    if (this.onProgress) {
      this.onProgress({
        checkCount: this.checkCount,
        elapsedTime: this.checkCount * this.checkInterval,
        message: `执行中... (${this.checkCount}次检查)`
      });
    }
    
    log('info', `进度检查`, { checkCount: this.checkCount });
  }
  
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

// ============================================================
// 核心执行函数 (v2.0 - 含进度观测)
// ============================================================

function executeQwen(taskDescription, options = {}) {
  return new Promise((resolve) => {
    if (!config) loadConfig();
    if (!stats) loadStats();
    
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const taskType = options.taskType || classifyTask(taskDescription);
    
    log('info', `开始执行任务 [${taskType}]`, { taskId, taskLength: taskDescription.length });
    
    // 参数验证
    if (typeof taskDescription !== 'string' || taskDescription.length === 0) {
      return resolve({ success: false, error: '无效的任务描述', taskId });
    }
    
    // 智能超时计算
    const adaptiveTimeout = calculateAdaptiveTimeout(taskType, options.model);
    const timeout = options.timeout || adaptiveTimeout;
    
    const execOptions = {
      model: options.model || config.defaultModel,
      timeout,
      yolo: options.yolo !== false,
      outputFormat: options.outputFormat || 'text',
      workdir: options.workdir || process.cwd(),
      tier: options.tier || config.execution?.defaultTier || 'standard'
    };
    
    log('info', `执行选项`, { taskId, taskType, timeout, tier: execOptions.tier });
    
    // 构建命令
    const args = [taskDescription, '-y', '-m', execOptions.model, '-o', execOptions.outputFormat];
    
    // 执行
    let stdout = '';
    let stderr = '';
    let timeoutId = null;
    let processExited = false;
    const startTime = Date.now();
    
    // 进度观测器
    const observer = new ProgressObserver(config.progressObservation);
    
    try {
      const qwenProcess = spawn('qwen', args, {
        cwd: execOptions.workdir,
        env: process.env,
        shell: false,
        detached: false
      });
      
      // 启动进度观测
      observer.start(qwenProcess, () => {
        log('warn', `任务可能卡住`, { taskId, checkCount: observer.checkCount });
      });
      
      // 超时处理
      timeoutId = setTimeout(() => {
        if (!processExited) {
          log('warn', `任务超时`, { taskId, timeout });
          observer.stop();
          try {
            qwenProcess.kill('SIGTERM');
            setTimeout(() => !processExited && qwenProcess.kill('SIGKILL'), 5000);
          } catch (e) {}
        }
      }, timeout);
      
      // 捕获输出
      qwenProcess.stdout.on('data', (data) => { stdout += data.toString(); });
      qwenProcess.stderr.on('data', (data) => { stderr += data.toString(); });
      
      // 进程结束
      qwenProcess.on('close', (code) => {
        processExited = true;
        observer.stop();
        if (timeoutId) clearTimeout(timeoutId);
        
        const duration = Date.now() - startTime;
        const success = code === 0;
        
        // 更新统计
        updateStatistics(taskType, execOptions.model, duration, success);
        
        const result = {
          success,
          exitCode: code,
          taskId,
          taskType,
          model: execOptions.model,
          output: stdout,
          error: stderr || null,
          duration,
          tier: execOptions.tier
        };
        
        log(success ? 'info' : 'error', `任务${success ? '完成' : '失败'}`, { taskId, duration, exitCode: code });
        
        resolve(result);
      });
      
      qwenProcess.on('error', (error) => {
        processExited = true;
        observer.stop();
        if (timeoutId) clearTimeout(timeoutId);
        
        log('error', `进程错误: ${error.message}`, { taskId });
        
        resolve({
          success: false,
          error: `进程启动失败: ${error.message}`,
          taskId,
          taskType,
          output: null
        });
      });
      
    } catch (error) {
      observer.stop();
      log('error', `执行异常: ${error.message}`, { taskId });
      
      resolve({
        success: false,
        error: `执行异常: ${error.message}`,
        taskId,
        taskType,
        output: null
      });
    }
  });
}

// ============================================================
// 带重试的执行
// ============================================================

async function executeWithRetry(taskDescription, options = {}) {
  const maxRetries = options.maxRetries || config.execution?.maxRetries || 3;
  const retryDelay = options.retryDelay || config.execution?.retryDelay || 1000;
  
  let lastResult = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    log('info', `执行尝试 ${attempt}/${maxRetries}`);
    
    const result = await executeQwen(taskDescription, options);
    lastResult = result;
    
    if (result.success) return result;
    
    // 可重试错误
    const retryableErrors = ['timeout', 'ETIMEDOUT', 'ECONNRESET', 'rate limit'];
    const shouldRetry = retryableErrors.some(e => result.error?.includes(e));
    
    if (!shouldRetry) {
      log('warn', `不可重试错误，停止`, { error: result.error });
      return result;
    }
    
    if (attempt < maxRetries) {
      await new Promise(r => setTimeout(r, retryDelay * attempt));
    }
  }
  
  return lastResult;
}

// ============================================================
// 智能推荐接口
// ============================================================

function getSmartRecommendation(taskDescription) {
  const taskType = classifyTask(taskDescription);
  const recommendedTimeout = calculateAdaptiveTimeout(taskType);
  const tier = Object.entries(config.timeoutTiers).find(([_, t]) => t.duration >= recommendedTimeout)?.[0] || 'standard';
  
  const typeStats = stats.taskTypeStats?.[taskType];
  
  return {
    taskType,
    recommendedTier: tier,
    recommendedTimeout,
    historicalAvg: typeStats?.avgDuration,
    historicalP90: typeStats?.p90,
    confidence: typeStats?.executions?.length >= 10 ? 'high' : typeStats?.executions?.length >= 5 ? 'medium' : 'low',
    sampleSize: typeStats?.executions?.length || 0
  };
}

// ============================================================
// 导出接口
// ============================================================

module.exports = {
  execute: executeQwen,
  executeWithRetry,
  classifyTask,
  getSmartRecommendation,
  getStats: () => stats,
  getConfig: () => config,
  loadConfig,
  loadStats
};