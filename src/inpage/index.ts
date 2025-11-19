/**
 * Inpage Script
 *
 * This script runs in the page context and provides the window.ethereum provider.
 * It is completely isolated from the extension's context for security.
 */

console.log('Identity Wallet inpage script loaded');

// Simple provider implementation
const provider = {
  isIdentityWallet: true,
  isMetaMask: false,
  chainId: '0x1', // Ethereum mainnet

  request: async (args) => {
    console.log('Provider request:', args);

    return new Promise((resolve, reject) => {
      // Send message to content script
      window.postMessage(
        {
          type: 'IDENTITY_WALLET_REQUEST',
          payload: args,
        },
        '*'
      );

      // Listen for response
      const handleResponse = (event) => {
        if (event.source !== window) return;

        const { type, payload } = event.data;

        if (type === 'IDENTITY_WALLET_RESPONSE') {
          window.removeEventListener('message', handleResponse);
          resolve(payload);
        }
      };

      window.addEventListener('message', handleResponse);

      // Timeout after 30 seconds
      setTimeout(() => {
        window.removeEventListener('message', handleResponse);
        reject(new Error('Request timeout'));
      }, 30000);
    });
  },

  on: (event, handler) => {
    console.log('Provider event listener added:', event);
  },

  removeListener: (event, handler) => {
    console.log('Provider event listener removed:', event);
  },
};

// Inject provider into window
Object.defineProperty(window, 'ethereum', {
  value: provider,
  writable: false,
  configurable: false,
});

console.log('window.ethereum injected:', window.ethereum);
