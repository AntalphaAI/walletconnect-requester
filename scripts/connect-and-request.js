#!/usr/bin/env node
/**
 * Connect and immediately request transaction in one session
 */

const { SignClient } = require('@walletconnect/sign-client');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const CONFIG_DIR = path.join(process.env.HOME, '.walletconnect-requester');
const SESSIONS_FILE = path.join(CONFIG_DIR, 'sessions.json');

const projectId = process.env.WC_PROJECT_ID || 'ee1a6e6d82ab82fab5130e5b8eaf5f73';

const METADATA = {
  name: 'AI Agent Requester',
  description: 'Secure WalletConnect client for AI agents',
  url: 'https://github.com/openclaw',
  icons: ['https://avatars.githubusercontent.com/u/1234567']
};

async function main() {
  console.log('Initializing WalletConnect client...');
  
  const client = await SignClient.init({
    projectId: projectId,
    metadata: METADATA
  });

  // Build namespaces for Base only
  const namespaces = {
    eip155: {
      chains: ['eip155:8453'],
      methods: ['eth_sendTransaction', 'personal_sign'],
      events: ['accountsChanged', 'chainChanged']
    }
  };

  console.log('Creating connection...');
  const { uri, approval } = await client.connect({
    requiredNamespaces: namespaces
  });

  console.log('\n' + '='.repeat(60));
  console.log('WalletConnect URI:');
  console.log(uri);
  console.log('='.repeat(60));

  // Generate QR code
  const qrPath = '/home/admin/.openclaw/workspace/wc_final.png';
  await QRCode.toFile(qrPath, uri, { width: 400, margin: 2 });
  console.log(`\nQR code saved to: ${qrPath}`);
  console.log('\n📱 Scan with MetaMask and approve connection...');
  console.log('⏳ Waiting for connection...\n');

  // Wait for approval
  const session = await approval();
  
  console.log('✅ Connected!');
  console.log(`   Wallet: ${session.peer.metadata.name}`);
  const accounts = session.namespaces.eip155.accounts;
  console.log(`   Accounts: ${accounts.map(a => a.split(':')[2]).join(', ')}`);

  // Get the account for Base (chain 8453)
  const baseAccount = accounts.find(a => a.startsWith('eip155:8453:'));
  if (!baseAccount) {
    console.error('❌ No account for Base chain');
    return;
  }
  const fromAddress = baseAccount.split(':')[2];

  // Build USDT transfer transaction
  const usdtAddress = '0xfde4C96c8593536E11F39842a902aB0E47ec4E54';
  const recipient = '0x0abfc5fa5b5bc304646132701f53f256004356ee';
  const amount = 10 * 1000000; // 10 USDT (6 decimals)

  // ERC-20 transfer(address,uint256)
  const selector = 'a9059cbb';
  const paddedAddress = recipient.slice(2).toLowerCase().padStart(64, '0');
  const paddedAmount = amount.toString(16).padStart(64, '0');
  const data = '0x' + selector + paddedAddress + paddedAmount;

  const tx = {
    from: fromAddress,
    to: usdtAddress,
    data: data,
    value: '0x0'
  };

  console.log('\n📤 Requesting transaction...');
  console.log(`   Chain: Base (8453)`);
  console.log(`   From: ${fromAddress}`);
  console.log(`   To (USDT): ${usdtAddress}`);
  console.log(`   Amount: 10 USDT`);
  console.log(`   Recipient: ${recipient}`);
  console.log('\n⏳ Please approve in MetaMask...\n');

  try {
    const result = await client.request({
      topic: session.topic,
      chainId: 'eip155:8453',
      request: {
        method: 'eth_sendTransaction',
        params: [tx]
      }
    });

    console.log('\n✅ Transaction approved and submitted!');
    console.log(`   TX Hash: ${result}`);
    console.log('\n🎉 Investment successful! 10 USDT subscribed to 7-day RWA product.');
    
  } catch (error) {
    if (error.message?.includes('rejected')) {
      console.log('\n❌ Transaction rejected by user.');
    } else {
      console.error('\n❌ Error:', error.message);
    }
  }
}

main().catch(console.error);