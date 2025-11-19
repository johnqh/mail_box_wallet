/**
 * Inpage Script
 *
 * This script runs in the page context and provides the window.ethereum provider.
 * It is completely isolated from the extension's context for security.
 */

import { IdentityWalletProvider } from './provider';

// Create provider instance
const provider = new IdentityWalletProvider();

// Inject provider into window
Object.defineProperty(window, 'ethereum', {
  value: provider,
  writable: false,
  configurable: false,
});

// Announce provider availability (EIP-6963)
window.dispatchEvent(
  new CustomEvent('eip6963:announceProvider', {
    detail: Object.freeze({
      info: {
        uuid: 'identity-wallet-extension',
        name: 'Identity Wallet',
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><text y="20" font-size="20">🔐</text></svg>',
        rdns: 'com.identitywallet',
      },
      provider,
    }),
  })
);

console.log('✓ Identity Wallet provider injected');
