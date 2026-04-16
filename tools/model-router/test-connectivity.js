#!/usr/bin/env node

/**
 * 模型连通性测试脚本
 * 
 * 测试路由器识别的所有模型是否可以正常连接并响应
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

// OpenClaw 配置路径
const openclawConfigPath = path.join(os.homedir(), '.openclaw', 'openclaw.json');

/**
 * 从 OpenClaw 配置中提取模型信息
 */
function loadModelsFromConfig() {
  const config = JSON.parse(fs.readFileSync(openclawConfigPath, 'utf-8'));
  const providers = config.models?.providers || {};
  const models = [];
  
  for (const [providerName, providerConfig] of Object.entries(providers)) {
    const providerModels = providerConfig.models || [];
    for (const model of providerModels) {
      models.push({
        id: `${providerName}/${model.id}`,
        provider: providerName,
        modelId: model.id,
        baseUrl: providerConfig.baseUrl,
        apiFormat: providerConfig.api || 'openai-completions'
      });
    }
  }
  
  return { models, config };
}

/**
 * 从 keyring 获取 API Key（模拟 OpenClaw 的行为）
 * OpenClaw 使用 keytar 存储密钥，这里需要手动配置
 */
function getApiKey(provider, config) {
  // 尝试从环境变量获取
  const envKeyMap = {
    'zai': ['ZAI_API_KEY', 'GLM_API_KEY', 'ZHIPU_API_KEY'],
    'moonshot': ['MOONSHOT_API_KEY', 'KIMI_API_KEY'],
    'google': ['GEMINI_API_KEY', 'GOOGLE_API_KEY']
  };
  
  const envKeys = envKeyMap[provider] || [];
  for (const key of envKeys) {
    if (process.env[key]) {
      return process.env[key];
    }
  }
  
  // 返回 null，需要手动输入
  return null;
}

/**
 * 发起 API 请求测试连通性
 */
async function testModelConnection(model, apiKey) {
  return new Promise((resolve) => {
    const testMessage = 'Say "OK" if you can hear me.';
    const url = new URL(model.baseUrl);
    
    // 构建 OpenAI 兼容格式的请求体
    const requestBody = JSON.stringify({
      model: model.modelId,
      messages: [{ role: 'user', content: testMessage }],
      max_tokens: 10
    });
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname.endsWith('/') ? `${url.pathname}chat/completions` : `${url.pathname}/chat/completions`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(requestBody)
      }
    };
    
    const startTime = Date.now();
    const timeout = setTimeout(() => {
      resolve({
        model: model.id,
        success: false,
        error: 'Timeout after 30 seconds',
        responseTime: 30000
      });
    }, 30000);
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        clearTimeout(timeout);
        const responseTime = Date.now() - startTime;
        
        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.message?.content || 'No content';
            resolve({
              model: model.id,
              success: true,
              statusCode: res.statusCode,
              responseTime,
              response: content.substring(0, 50)
            });
          } catch (e) {
            resolve({
              model: model.id,
              success: true,
              statusCode: res.statusCode,
              responseTime,
              rawResponse: data.substring(0, 100)
            });
          }
        } else {
          resolve({
            model: model.id,
            success: false,
            statusCode: res.statusCode,
            responseTime,
            error: data.substring(0, 200)
          });
        }
      });
    });
    
    req.on('error', (e) => {
      clearTimeout(timeout);
      resolve({
        model: model.id,
        success: false,
        error: e.message,
        responseTime: Date.now() - startTime
      });
    });
    
    req.write(requestBody);
    req.end();
  });
}

/**
 * 主测试函数
 */
async function main() {
  console.log('=== OpenClaw 模型连通性测试 ===\n');
  
  const { models, config } = loadModelsFromConfig();
  
  console.log(`发现 ${models.length} 个模型配置：`);
  models.forEach(m => console.log(`  - ${m.id} (${m.baseUrl})`));
  console.log('');
  
  const results = [];
  
  for (const model of models) {
    console.log(`测试 ${model.id}...`);
    
    // 尝试获取 API Key
    const apiKey = getApiKey(model.provider, config);
    
    if (!apiKey) {
      console.log(`  ⚠️  未找到 API Key，请手动配置环境变量`);
      results.push({
        model: model.id,
        success: false,
        error: 'API Key not found in environment variables'
      });
      continue;
    }
    
    const result = await testModelConnection(model, apiKey);
    results.push(result);
    
    if (result.success) {
      console.log(`  ✅ 成功 (${result.responseTime}ms) - 响应: "${result.response || result.rawResponse}"`);
    } else {
      console.log(`  ❌ 失败 - ${result.error || `HTTP ${result.statusCode}`}`);
    }
  }
  
  console.log('\n=== 测试结果汇总 ===');
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`成功: ${successful.length}/${results.length}`);
  console.log(`失败: ${failed.length}/${results.length}`);
  
  if (failed.length > 0) {
    console.log('\n失败的模型：');
    failed.forEach(r => {
      console.log(`  - ${r.model}: ${r.error || `HTTP ${r.statusCode}`}`);
    });
  }
  
  // 返回退出码
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch(console.error);
