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

// Listen for messages from popup and content scripts
browser.runtime.onMessage.addListener((message, sender) => {
  console.log('Background received message:', message, 'from:', sender);

  return Promise.resolve({ success: true });
});

// Install event - runs when extension is first installed or updated
browser.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details);
});
