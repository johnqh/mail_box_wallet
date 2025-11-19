/**
 * Standalone Inpage Script
 *
 * This script is injected into web pages and provides the window.ethereum provider.
 * It's a standalone bundle with no external dependencies.
 */

(function() {
  'use strict';

  // Message types and targets (inlined from shared/types)
  const MessageTarget = {
    INPAGE: 'INPAGE',
    CONTENT_SCRIPT: 'CONTENT_SCRIPT',
    BACKGROUND: 'BACKGROUND',
  };

  const MessageType = {
    PROVIDER_REQUEST: 'PROVIDER_REQUEST',
    PROVIDER_RESPONSE: 'PROVIDER_RESPONSE',
    PROVIDER_ERROR: 'PROVIDER_ERROR',
    PROVIDER_EVENT: 'PROVIDER_EVENT',
  };

  /**
   * Identity Wallet Provider
   * Implements EIP-1193 Ethereum Provider JavaScript API
   */
  class IdentityWalletProvider {
    constructor() {
      this.isIdentityWallet = true;
      this.isMetaMask = false;

      this._chainId = null;
      this._selectedAddress = null;
      this._isConnected = false;

      this._eventListeners = new Map();
      this._pendingRequests = new Map();

      this._initialize();
    }

    _initialize() {
      window.addEventListener('message', this._handleMessage.bind(this));
      setTimeout(() => this._requestInitialState(), 0);
    }

    _handleMessage(event) {
      if (event.source !== window) return;

      const message = event.data;
      if (!message || message.target !== MessageTarget.INPAGE) return;

      switch (message.type) {
        case MessageType.PROVIDER_RESPONSE:
          this._handleResponse(message);
          break;
        case MessageType.PROVIDER_ERROR:
          this._handleError(message);
          break;
        case MessageType.PROVIDER_EVENT:
          this._handleEvent(message);
          break;
      }
    }

    _handleResponse(message) {
      const pending = this._pendingRequests.get(message.id);
      if (!pending) return;

      pending.resolve(message.payload);
      this._pendingRequests.delete(message.id);
    }

    _handleError(message) {
      const pending = this._pendingRequests.get(message.id);
      if (!pending) return;

      const error = new Error(message.payload.message);
      error.code = message.payload.code;
      error.data = message.payload.data;

      pending.reject(error);
      this._pendingRequests.delete(message.id);
    }

    _handleEvent(message) {
      const { event, data } = message.payload;
      this._emit(event, data);
    }

    async _requestInitialState() {
      try {
        const chainId = await this.request({ method: 'eth_chainId' });
        this._chainId = chainId;
        this._isConnected = true;
      } catch (error) {
        console.debug('Could not get initial chain ID');
      }
    }

    async request(args) {
      return new Promise((resolve, reject) => {
        const id = `${Date.now()}_${Math.random().toString(36).substring(7)}`;

        this._pendingRequests.set(id, { resolve, reject });

        window.postMessage({
          id,
          target: MessageTarget.CONTENT_SCRIPT,
          type: MessageType.PROVIDER_REQUEST,
          payload: args,
        }, '*');

        setTimeout(() => {
          if (this._pendingRequests.has(id)) {
            this._pendingRequests.delete(id);
            reject(new Error('Request timeout'));
          }
        }, 60000);
      });
    }

    on(event, callback) {
      if (!this._eventListeners.has(event)) {
        this._eventListeners.set(event, new Set());
      }
      this._eventListeners.get(event).add(callback);
      return this;
    }

    removeListener(event, callback) {
      const listeners = this._eventListeners.get(event);
      if (listeners) {
        listeners.delete(callback);
      }
      return this;
    }

    _emit(event, ...args) {
      const listeners = this._eventListeners.get(event);
      if (listeners) {
        listeners.forEach(callback => {
          try {
            callback(...args);
          } catch (error) {
            console.error('Error in event listener:', error);
          }
        });
      }
    }

    get chainId() {
      return this._chainId;
    }

    get selectedAddress() {
      return this._selectedAddress;
    }

    get isConnected() {
      return this._isConnected;
    }
  }

  // Create provider instance
  const provider = new IdentityWalletProvider();

  // Inject provider into window
  Object.defineProperty(window, 'ethereum', {
    value: provider,
    writable: false,
    configurable: false,
  });

  // Announce provider availability
  window.dispatchEvent(new Event('ethereum#initialized'));

  console.log('✓ Identity Wallet provider injected');
})();
