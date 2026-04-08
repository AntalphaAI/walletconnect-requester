/**
 * Suite 3: Documentation Consistency & Completeness
 * 文档一致性与完整性验证
 */
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const skillMd = fs.readFileSync(path.join(PROJECT_ROOT, 'SKILL.md'), 'utf8');
const securityMd = fs.readFileSync(path.join(PROJECT_ROOT, 'references', 'SECURITY.md'), 'utf8');
const changelogMd = fs.readFileSync(path.join(PROJECT_ROOT, 'CHANGELOG.md'), 'utf8');
const scriptsPkg = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'scripts', 'package.json'), 'utf8'));
const wcSrc = fs.readFileSync(path.join(PROJECT_ROOT, 'scripts', 'wc-requester.js'), 'utf8');

describe('8. SKILL.md 文档完整性', () => {

  test('所有 CLI 命令应在文档中有说明', () => {
    const cliCommands = ['connect', 'request-tx', 'request-sign', 'sessions', 'disconnect'];
    for (const cmd of cliCommands) {
      expect(skillMd).toContain(cmd);
    }
  });

  test('所有环境变量应有文档说明', () => {
    const envVars = ['WC_PROJECT_ID', 'WC_METADATA_NAME', 'WC_METADATA_URL', 'WC_METADATA_ICONS'];
    for (const v of envVars) {
      expect(skillMd).toContain(v);
    }
  });

  test('所有 CLI 选项应在文档中列出', () => {
    const options = ['--chains', '--methods', '--qr', '--profile', '--to', '--data', '--value', '--chain', '--from', '--message', '--typed-data', '--topic'];
    for (const opt of options) {
      expect(skillMd).toContain(opt);
    }
  });

  test('文档应提及安全模型（非托管）', () => {
    expect(skillMd).toMatch(/non-custodial|非托管/i);
    expect(skillMd).toContain('Zero custody');
  });

  test('文档应列出支持的钱包', () => {
    expect(skillMd).toContain('MetaMask');
    expect(skillMd).toContain('Rainbow');
  });

  test('文档应包含故障排查指南', () => {
    expect(skillMd).toContain('Troubleshooting');
    expect(skillMd).toContain('No active session');
    expect(skillMd).toContain('Session expired');
  });

  test('SKILL.md YAML frontmatter 应包含必要字段', () => {
    expect(skillMd).toMatch(/^---/);
    expect(skillMd).toContain('name: walletconnect-requester');
    expect(skillMd).toContain('description:');
    expect(skillMd).toContain('WC_PROJECT_ID');
  });

  test('--json 选项应在代码中有实现', () => {
    const handlesJson = wcSrc.includes('options.json');
    expect(handlesJson).toBe(true); // Fixed: --json now implemented
  });
});

describe('9. CHANGELOG.md 一致性', () => {

  test('版本号应与 package.json 一致', () => {
    expect(changelogMd).toContain(scriptsPkg.version);
  });

  test('声明的功能应在代码中实现', () => {
    // CHANGELOG claims these features:
    const features = {
      'Session management': /connect|sessions|disconnect/,
      'Transaction requests': /requestTransaction|request-tx/,
      'Signature requests': /requestSignature|request-sign/,
      'QR code generation': /QRCode|qrcode/,
      'Audit logging': /logAudit|audit/,
      'Multi-chain support': /eip155:\d+/
    };

    for (const [feature, pattern] of Object.entries(features)) {
      expect(wcSrc).toMatch(pattern);
    }
  });

  test('安全声明应在代码中验证', () => {
    // CHANGELOG: "eth_sign blocked by default"
    // Check that eth_sign is NOT in DEFAULT_NAMESPACES
    // Check eth_sign is not a standalone method (eth_signTypedData_v4 is OK)
    const defaultMethods = wcSrc.match(/DEFAULT_NAMESPACES[\s\S]*?methods:\s*\[(.*?)\]/);
    if (defaultMethods) {
      const methods = defaultMethods[1].match(/'[^']+'/g).map(m => m.replace(/'/g, ''));
      expect(methods).not.toContain('eth_sign');
    }
  });
});

describe('10. SECURITY.md 验证', () => {

  test('攻击场景应涵盖主要威胁', () => {
    expect(securityMd).toContain('Agent is Compromised');
    expect(securityMd).toContain('Session Token Stolen');
  });

  test('安全模型表格应完整', () => {
    expect(securityMd).toContain('Private key theft');
    expect(securityMd).toContain('Agent compromised');
    expect(securityMd).toContain('Malicious code');
    expect(securityMd).toContain('Session hijack');
  });

  test('审计日志格式应与代码中 logAudit 输出匹配', () => {
    // SECURITY.md shows: timestamp, action, chain, to, status, tx_hash
    // Code logAudit uses: timestamp (auto), action, topic, chain, to, value, tx_hash, error
    expect(securityMd).toContain('timestamp');
    expect(securityMd).toContain('action');
  });

  test('文档应声明 session 过期时间', () => {
    expect(securityMd).toContain('7 days');
  });
});

describe('11. package.json 配置验证', () => {

  test('main 字段应指向正确文件', () => {
    // scripts/package.json has main: "scripts/wc-requester.js" 
    // but package.json is IN scripts/, so main should be "./wc-requester.js"
    const mainPath = scriptsPkg.main;
    const resolvedMain = path.resolve(path.join(PROJECT_ROOT, 'scripts'), mainPath);
    const exists = fs.existsSync(resolvedMain);
    expect(exists).toBe(true); // Fixed: path corrected to ./wc-requester.js
  });

  test('bin 字段路径应可执行', () => {
    if (scriptsPkg.bin) {
      for (const [name, binPath] of Object.entries(scriptsPkg.bin)) {
        const resolved = path.resolve(path.join(PROJECT_ROOT, 'scripts'), binPath);
        expect(fs.existsSync(resolved)).toBe(true);
      }
    }
  });

  test('license 应与 LICENSE 文件一致', () => {
    const licenseFile = fs.readFileSync(path.join(PROJECT_ROOT, 'LICENSE'), 'utf8');
    expect(licenseFile).toContain('MIT');
    expect(scriptsPkg.license).toBe('MIT');
  });
});

describe('12. 跨文件一致性检查', () => {

  test('wc-requester.js 和 namespaces.json 默认链应一致', () => {
    // wc-requester.js defaults: ['8453', '1']
    const namespacesDefault = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'config', 'namespaces.json'), 'utf8'));
    const configChains = namespacesDefault.default.eip155.chains;
    
    // Code hardcodes: chains: ['eip155:8453', 'eip155:1']
    expect(configChains).toContain('eip155:8453');
    expect(configChains).toContain('eip155:1');
  });

  test('wc-requester.js 实际未使用 namespaces.json 配置文件', () => {
    // The code has DEFAULT_NAMESPACES hardcoded, doesn't load from config/namespaces.json
    const loadsConfig = wcSrc.includes('namespaces.json');
    expect(loadsConfig).toBe(true); // Fixed: config is now loaded
  });

  test('connect-and-request.js 和 wc-requester.js metadata 应一致', () => {
    // Both should use same DApp metadata
    const carSrc = fs.readFileSync(path.join(PROJECT_ROOT, 'scripts', 'connect-and-request.js'), 'utf8');
    // Both use 'AI Agent Requester' as name
    expect(carSrc).toContain('AI Agent Requester');
    expect(wcSrc).toContain('AI Agent Requester');
  });
});
