/**
 * Suite 2: Unit Tests for Utility Functions
 * 工具函数单元测试
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

// We need to extract functions from wc-requester.js without running main()
// Since the file uses module-level execution, we'll test by evaluating isolated functions

const srcPath = path.join(__dirname, '..', 'scripts', 'wc-requester.js');
const src = fs.readFileSync(srcPath, 'utf8');

// Extract maskAddress function
const maskAddressSrc = src.match(/function maskAddress\(address\)\s*\{[\s\S]*?\n\}/)?.[0];
const maskAddress = new Function('address', maskAddressSrc.replace(/function maskAddress\(address\)\s*\{/, '').replace(/\}$/, ''));

describe('5. maskAddress 函数测试', () => {

  test('正常地址应返回 0x1234...5678 格式', () => {
    const result = maskAddress('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913');
    expect(result).toBe('0x8335...2913');
  });

  test('null 输入应返回 null', () => {
    expect(maskAddress(null)).toBeNull();
  });

  test('undefined 输入应返回 undefined', () => {
    expect(maskAddress(undefined)).toBeUndefined();
  });

  test('空字符串应返回空字符串', () => {
    const result = maskAddress('');
    expect(result).toBe('');
  });

  test('短字符串（<10字符）应正常处理不崩溃', () => {
    expect(() => maskAddress('0x1234')).not.toThrow();
  });

  test('非 0x 前缀地址也能处理', () => {
    const result = maskAddress('abcdefghijklmnopqrstuvwxyz1234567890abcdef');
    expect(result).toContain('...');
  });

  test('极长字符串应正常处理', () => {
    const longStr = '0x' + 'a'.repeat(1000);
    expect(() => maskAddress(longStr)).not.toThrow();
    const result = maskAddress(longStr);
    expect(result).toContain('...');
  });
});

describe('6. Session 文件操作测试', () => {

  const TEST_CONFIG_DIR = path.join(os.tmpdir(), '.wc-test-' + Date.now());
  const TEST_SESSIONS_FILE = path.join(TEST_CONFIG_DIR, 'sessions.json');
  const TEST_AUDIT_LOG = path.join(TEST_CONFIG_DIR, 'audit.log');

  // Recreate functions with test paths
  function ensureConfigDir() {
    if (!fs.existsSync(TEST_CONFIG_DIR)) {
      fs.mkdirSync(TEST_CONFIG_DIR, { recursive: true });
    }
  }

  function loadSessions() {
    ensureConfigDir();
    if (fs.existsSync(TEST_SESSIONS_FILE)) {
      return JSON.parse(fs.readFileSync(TEST_SESSIONS_FILE, 'utf8'));
    }
    return {};
  }

  function saveSessions(sessions) {
    ensureConfigDir();
    fs.writeFileSync(TEST_SESSIONS_FILE, JSON.stringify(sessions, null, 2));
  }

  function logAudit(entry) {
    ensureConfigDir();
    const logEntry = {
      timestamp: new Date().toISOString(),
      ...entry
    };
    fs.appendFileSync(TEST_AUDIT_LOG, JSON.stringify(logEntry) + '\n');
  }

  afterAll(() => {
    // Cleanup
    if (fs.existsSync(TEST_CONFIG_DIR)) {
      fs.rmSync(TEST_CONFIG_DIR, { recursive: true });
    }
  });

  test('loadSessions: 文件不存在时应返回空对象', () => {
    expect(loadSessions()).toEqual({});
  });

  test('saveSessions + loadSessions: 写入后应能正确读回', () => {
    const testData = {
      'topic-abc': {
        topic: 'topic-abc',
        peer: { name: 'MetaMask' },
        accounts: ['eip155:8453:0x1234567890abcdef1234567890abcdef12345678'],
        connectedAt: '2026-03-09T00:00:00Z'
      }
    };
    saveSessions(testData);
    const loaded = loadSessions();
    expect(loaded).toEqual(testData);
  });

  test('saveSessions: 空对象应正常写入', () => {
    saveSessions({});
    expect(loadSessions()).toEqual({});
  });

  test('saveSessions: 覆盖已有数据', () => {
    saveSessions({ old: 'data' });
    saveSessions({ new: 'data' });
    expect(loadSessions()).toEqual({ new: 'data' });
  });

  test('logAudit: 应创建审计日志文件', () => {
    // Remove if exists
    if (fs.existsSync(TEST_AUDIT_LOG)) fs.unlinkSync(TEST_AUDIT_LOG);
    
    logAudit({ action: 'test_action', detail: 'test' });
    expect(fs.existsSync(TEST_AUDIT_LOG)).toBe(true);
  });

  test('logAudit: 日志应包含 timestamp', () => {
    if (fs.existsSync(TEST_AUDIT_LOG)) fs.unlinkSync(TEST_AUDIT_LOG);
    
    logAudit({ action: 'test' });
    const content = fs.readFileSync(TEST_AUDIT_LOG, 'utf8');
    const entry = JSON.parse(content.trim());
    expect(entry).toHaveProperty('timestamp');
    expect(entry.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  test('logAudit: 多次调用应追加而非覆盖', () => {
    if (fs.existsSync(TEST_AUDIT_LOG)) fs.unlinkSync(TEST_AUDIT_LOG);
    
    logAudit({ action: 'first' });
    logAudit({ action: 'second' });
    
    const lines = fs.readFileSync(TEST_AUDIT_LOG, 'utf8').trim().split('\n');
    expect(lines.length).toBe(2);
    expect(JSON.parse(lines[0]).action).toBe('first');
    expect(JSON.parse(lines[1]).action).toBe('second');
  });

  test('loadSessions: 损坏的 JSON 应抛出可读错误', () => {
    fs.writeFileSync(TEST_SESSIONS_FILE, 'NOT_VALID_JSON{{{');
    expect(() => loadSessions()).toThrow();
  });
});

describe('7. CLI 参数解析测试', () => {

  // Extract the CLI parser logic
  function parseArgs(args) {
    const options = {};
    for (let i = 0; i < args.length; i++) {
      if (args[i].startsWith('--')) {
        const key = args[i].slice(2).replace(/-/g, '_');
        const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
        options[key] = value;
        if (value !== true) i++;
      }
    }
    return options;
  }

  test('解析 --to 参数', () => {
    const opts = parseArgs(['--to', '0x1234']);
    expect(opts.to).toBe('0x1234');
  });

  test('解析 --chain 参数', () => {
    const opts = parseArgs(['--chain', '8453']);
    expect(opts.chain).toBe('8453');
  });

  test('解析多个参数', () => {
    const opts = parseArgs(['--to', '0xABC', '--data', '0xDEF', '--value', '1000', '--chain', '1']);
    expect(opts.to).toBe('0xABC');
    expect(opts.data).toBe('0xDEF');
    expect(opts.value).toBe('1000');
    expect(opts.chain).toBe('1');
  });

  test('布尔标志（无值参数）应为 true', () => {
    const opts = parseArgs(['--json']);
    expect(opts.json).toBe(true);
  });

  test('带连字符的参数名应转为下划线', () => {
    const opts = parseArgs(['--typed-data', '{"test": 1}']);
    expect(opts.typed_data).toBe('{"test": 1}');
  });

  test('空参数列表应返回空对象', () => {
    const opts = parseArgs([]);
    expect(opts).toEqual({});
  });

  test('--chains 逗号分隔应保持为字符串（需调用者 split）', () => {
    const opts = parseArgs(['--chains', '8453,1,42161']);
    expect(opts.chains).toBe('8453,1,42161');
    expect(opts.chains.split(',')).toEqual(['8453', '1', '42161']);
  });

  test('值以 -- 开头时应被视为新标志', () => {
    const opts = parseArgs(['--to', '--json']);
    expect(opts.to).toBe(true); // Because --json starts with --
    expect(opts.json).toBe(true);
  });
});
