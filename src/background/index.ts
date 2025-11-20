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
import { registerServices } from '../shared/di';
import { MessageHandler } from './message-handler';
import { MessageType } from '../shared/types/messaging';
import type { IVaultService } from '../shared/di/interfaces/IVaultService';
import type { IKeyringService } from '../shared/di/interfaces/IKeyringService';
import type { ISessionService } from '../shared/di/interfaces/ISessionService';
import { pendingRequestsManager } from './pending-requests';

console.log('✓ Background service worker starting...');

// Initialize DI container and services
registerServices();

// Create message handler
const messageHandler = new MessageHandler();

// Set approval callback
messageHandler.setApprovalCallback(openApprovalPopup);

console.log('✓ Services initialized');

// Track open popup window
let popupWindowId: number | null = null;

/**
 * Open approval popup
 */
async function openApprovalPopup(): Promise<void> {
  // Check if popup is already open
  if (popupWindowId !== null) {
    try {
      await browser.windows.get(popupWindowId);
      // Window exists, focus it
      await browser.windows.update(popupWindowId, { focused: true });
      return;
    } catch {
      // Window doesn't exist anymore
      popupWindowId = null;
    }
  }

  // Create new popup window
  const popup = await browser.windows.create({
    url: browser.runtime.getURL('src/popup/index.html'),
    type: 'popup',
    width: 400,
    height: 600,
  });

  popupWindowId = popup.id || null;
}

// Listen for window close events
browser.windows.onRemoved.addListener((windowId) => {
  if (windowId === popupWindowId) {
    popupWindowId = null;
  }
});

// Listen for messages from popup and content scripts
browser.runtime.onMessage.addListener(async (message: any, sender: browser.Runtime.MessageSender) => {
  console.log('Background received message:', message.type, 'from:', sender.tab?.url || 'popup');

  const { type, payload } = message;

  // Handle provider requests from content script
  if (type === MessageType.PROVIDER_REQUEST) {
    // Get origin from sender
    const origin = sender.tab?.url ? new URL(sender.tab.url).origin : undefined;

    // Handle the request
    const response = await messageHandler.handleRequest(payload, origin);

    // Return response with same ID for correlation
    return response;
  }

  // Handle popup messages
  if (type === 'GET_PENDING_REQUEST') {
    // Get the first pending request
    const request = pendingRequestsManager.getFirstRequest();
    return { request };
  }

  if (type === 'APPROVE_REQUEST') {
    const { requestId } = payload;
    const request = pendingRequestsManager.getRequest(requestId);
    if (request) {
      request.resolve(true);
      pendingRequestsManager.removeRequest(requestId);
      return { success: true };
    }
    return { success: false, error: 'Request not found' };
  }

  if (type === 'REJECT_REQUEST') {
    const { requestId } = payload;
    const request = pendingRequestsManager.getRequest(requestId);
    if (request) {
      request.reject({
        code: 4001,
        message: 'User rejected the request',
      });
      pendingRequestsManager.removeRequest(requestId);
      return { success: true };
    }
    return { success: false, error: 'Request not found' };
  }

  if (type === 'GET_ACTIVE_ACCOUNT') {
    try {
      const accounts = await messageHandler['keyringService'].getAccounts();
      if (accounts.length > 0) {
        return { address: accounts[0].address };
      }
      return { address: null };
    } catch (error) {
      console.error('Error getting active account:', error);
      return { address: null };
    }
  }

  if (type === 'UNLOCK_WALLET') {
    try {
      const { password } = payload;
      const { getService, SERVICE_TOKENS } = await import('../shared/di');
      const vaultService = getService<IVaultService>(SERVICE_TOKENS.VAULT);
      const keyringService = getService<IKeyringService>(SERVICE_TOKENS.KEYRING);
      const sessionService = getService<ISessionService>(SERVICE_TOKENS.SESSION);

      // Unlock vault
      const seedPhrase = await vaultService.unlock(password);

      // Initialize keyring
      await keyringService.initialize(seedPhrase);

      // Start session
      await sessionService.startSession();

      return { success: true };
    } catch (error) {
      console.error('Error unlocking wallet in background:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to unlock' };
    }
  }

  // Default response
  return { success: true };
});

// Install event - runs when extension is first installed or updated
browser.runtime.onInstalled.addListener((details) => {
  console.log('✓ Extension installed:', details.reason);

  // TODO: Initialize default state on install in Phase 7
});

console.log('✓ Background service worker ready');
