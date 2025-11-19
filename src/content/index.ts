/**
 * Content Script
 *
 * This script runs in the context of web pages and:
 * - Injects the inpage script into the page
 * - Acts as a bridge between the inpage script and background worker
 * - Maintains per-tab state
 */

import browser from 'webextension-polyfill';

console.log('Content script loaded on:', window.location.href);

// Inject the inpage script into the page
function injectInpageScript() {
  try {
    const script = document.createElement('script');
    script.src = browser.runtime.getURL('src/inpage/index.ts');
    // Don't use type="module" - load as regular script
    script.onload = () => {
      console.log('Inpage script loaded successfully');
      script.remove(); // Clean up
    };
    script.onerror = (error) => {
      console.error('Failed to load inpage script:', error);
    };
    (document.head || document.documentElement).appendChild(script);
    console.log('Inpage script injected');
  } catch (error) {
    console.error('Failed to inject inpage script:', error);
  }
}

// Inject immediately
injectInpageScript();

// Listen for messages from the inpage script
window.addEventListener('message', (event) => {
  // Only accept messages from the same window
  if (event.source !== window) return;

  const { type, payload } = event.data;

  if (type === 'IDENTITY_WALLET_REQUEST') {
    console.log('Content script received request from page:', payload);

    // Forward to background
    browser.runtime.sendMessage({ type, payload }).then((response) => {
      // Send response back to page
      window.postMessage(
        {
          type: 'IDENTITY_WALLET_RESPONSE',
          payload: response,
        },
        '*'
      );
    });
  }
});

// Listen for messages from background
browser.runtime.onMessage.addListener((message) => {
  console.log('Content script received message from background:', message);
  return Promise.resolve({ success: true });
});
