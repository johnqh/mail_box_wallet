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

console.log('✓ Background service worker starting...');

// Initialize DI container and services
registerServices();

// Create message handler
const messageHandler = new MessageHandler();

console.log('✓ Services initialized');

// Listen for messages from popup and content scripts
browser.runtime.onMessage.addListener(async (message, sender) => {
  console.log('Background received message:', message.type, 'from:', sender.tab?.url || 'popup');

  const { id, type, payload } = message;

  // Handle provider requests from content script
  if (type === MessageType.PROVIDER_REQUEST) {
    // Get origin from sender
    const origin = sender.tab?.url ? new URL(sender.tab.url).origin : undefined;

    // Handle the request
    const response = await messageHandler.handleRequest(payload, origin);

    // Return response with same ID for correlation
    return response;
  }

  // Handle other message types
  // TODO: Add handlers for popup messages in Phase 7

  // Default response
  return { success: true };
});

// Install event - runs when extension is first installed or updated
browser.runtime.onInstalled.addListener((details) => {
  console.log('✓ Extension installed:', details.reason);

  // TODO: Initialize default state on install in Phase 7
});

console.log('✓ Background service worker ready');
