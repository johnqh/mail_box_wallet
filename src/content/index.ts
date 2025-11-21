/**
 * Content Script
 *
 * This script runs in the context of web pages and:
 * - Injects the inpage script into the page
 * - Acts as a bridge between the inpage script and background worker
 * - Maintains per-tab state
 */

import browser from 'webextension-polyfill';
import {
  Message,
  MessageTarget,
  MessageType,
  ProviderRequestMessage,
  ProviderResponseMessage,
  ProviderErrorMessage,
  ProviderEventMessage,
} from '../shared/types/messaging';

console.log('✓ Content script loaded on:', window.location.href);

// Inject the inpage script into the page
function injectInpageScript() {
  try {
    const script = document.createElement('script');
    // Use standalone JS bundle (no imports/modules)
    script.src = browser.runtime.getURL('src/inpage/index-standalone.js');
    script.onload = () => {
      console.log('✓ Inpage script injected');
      script.remove(); // Clean up
    };
    script.onerror = (error) => {
      console.error('✗ Failed to load inpage script:', error);
    };
    (document.head || document.documentElement).appendChild(script);
  } catch (error) {
    console.error('✗ Failed to inject inpage script:', error);
  }
}

// Inject immediately if document is ready
if (document.documentElement) {
  injectInpageScript();
} else {
  // Wait for document to be ready
  const observer = new MutationObserver(() => {
    if (document.documentElement) {
      injectInpageScript();
      observer.disconnect();
    }
  });
  observer.observe(document, { childList: true });
}

/**
 * Handle messages from inpage script
 */
window.addEventListener('message', async (event: MessageEvent) => {
  // Only accept messages from the same window
  if (event.source !== window) return;

  const message = event.data as Message;

  console.log('Content script received message:', message);

  // Verify message is for content script
  if (!message || message.target !== MessageTarget.CONTENT_SCRIPT) {
    console.log('Message not for content script, ignoring');
    return;
  }

  console.log('Message is for content script, type:', message.type);

  // Only handle provider requests from inpage
  if (message.type !== MessageType.PROVIDER_REQUEST) {
    console.log('Not a provider request, ignoring');
    return;
  }

  console.log('Handling provider request:', message);

  const request = message as ProviderRequestMessage;

  try {
    // Forward request to background
    const response = await browser.runtime.sendMessage({
      id: request.id,
      type: MessageType.PROVIDER_REQUEST,
      payload: request.payload,
    }) as { error?: { code: number; message: string; data?: unknown }; result?: unknown };

    // Check if response is an error
    if (response.error) {
      const errorMessage: ProviderErrorMessage = {
        id: request.id,
        target: MessageTarget.INPAGE,
        type: MessageType.PROVIDER_ERROR,
        payload: response.error,
      };
      window.postMessage(errorMessage, '*');
    } else {
      // Send successful response back to inpage
      const responseMessage: ProviderResponseMessage = {
        id: request.id,
        target: MessageTarget.INPAGE,
        type: MessageType.PROVIDER_RESPONSE,
        payload: response.result,
      };
      window.postMessage(responseMessage, '*');
    }
  } catch (error) {
    // Handle communication errors
    const errorMessage: ProviderErrorMessage = {
      id: request.id,
      target: MessageTarget.INPAGE,
      type: MessageType.PROVIDER_ERROR,
      payload: {
        code: -32603,
        message: error instanceof Error ? error.message : 'Internal error',
      },
    };
    window.postMessage(errorMessage, '*');
  }
});

/**
 * Handle messages from background (events, etc.)
 */
browser.runtime.onMessage.addListener((message: unknown) => {
  const msg = message as { type: string; id: string; event: string; data: unknown };
  // Forward events to inpage
  if (msg.type === MessageType.PROVIDER_EVENT) {
    const eventMessage: ProviderEventMessage = {
      id: msg.id || '',
      target: MessageTarget.INPAGE,
      type: MessageType.PROVIDER_EVENT,
      payload: { event: msg.event, data: msg.data },
    };
    window.postMessage(eventMessage, '*');
  }

  return Promise.resolve({ received: true });
});
