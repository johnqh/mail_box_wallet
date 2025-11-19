/**
 * Background Service Worker
 *
 * This is the core of the extension. It handles:
 * - Vault management (encryption/decryption)
 * - Account management
 * - Signing operations
 * - Network communication
 * - Session management
 */

import browser from 'webextension-polyfill';

console.log('Background service worker started');

// Mock account for Phase 1 testing (will be replaced with real wallet in Phase 2+)
const MOCK_ACCOUNT = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

// Listen for messages from popup and content scripts
browser.runtime.onMessage.addListener((message, sender) => {
  console.log('Background received message:', message, 'from:', sender);

  const { type, payload } = message;

  // Handle provider requests from content script
  if (type === 'IDENTITY_WALLET_REQUEST') {
    const { method, params } = payload;

    console.log(`Processing method: ${method}`, params);

    // Mock implementations for Phase 1 testing
    switch (method) {
      case 'eth_requestAccounts':
        console.log('Mock: Returning test account');
        return Promise.resolve([MOCK_ACCOUNT]);

      case 'eth_accounts':
        console.log('Mock: Returning test account');
        return Promise.resolve([MOCK_ACCOUNT]);

      case 'eth_chainId':
        console.log('Mock: Returning chain ID');
        return Promise.resolve('0x1'); // Ethereum mainnet

      case 'personal_sign':
        console.log('Mock: Would sign message (not implemented in Phase 1)');
        return Promise.resolve('0xMOCK_SIGNATURE_PHASE1_NOT_REAL');

      case 'eth_signTypedData_v4':
        console.log('Mock: Would sign typed data (not implemented in Phase 1)');
        return Promise.resolve('0xMOCK_SIGNATURE_PHASE1_NOT_REAL');

      case 'eth_sendTransaction':
      case 'eth_sendRawTransaction':
      case 'eth_signTransaction':
        console.log('Rejecting transaction method:', method);
        return Promise.reject({
          code: 4001,
          message:
            'Identity Wallet does not support transactions. Please use a transaction wallet like MetaMask, Rainbow, or Coinbase Wallet for sending transactions.',
        });

      default:
        console.log('Method not implemented:', method);
        return Promise.reject({
          code: 4200,
          message: `Method ${method} not supported`,
        });
    }
  }

  // Default response for other message types
  return Promise.resolve({ success: true });
});

// Install event - runs when extension is first installed or updated
browser.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details);
});
