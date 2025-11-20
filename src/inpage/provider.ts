/**
 * EIP-1193 Provider Implementation
 *
 * Provides window.ethereum interface for dApp integration.
 * Communicates with the extension via window.postMessage.
 */

import {
  EIP1193Provider,
  RequestArguments,
  ProviderRpcError,
  ProviderConnectInfo,
} from '../shared/types/eip1193';
import {
  MessageTarget,
  MessageType,
  ProviderRequestMessage,
  ProviderResponseMessage,
  ProviderErrorMessage,
  ProviderEventMessage,
  Message,
} from '../shared/types/messaging';

/**
 * Identity Wallet Provider
 * Implements EIP-1193 Ethereum Provider JavaScript API
 */
export class IdentityWalletProvider implements EIP1193Provider {
  // Provider identification
  readonly isIdentityWallet = true;
  readonly isMetaMask = false; // Don't impersonate MetaMask

  // Connection state
  private _chainId: string | null = null;
  private _selectedAddress: string | null = null;
  private _isConnected = false;

  // Event listeners
  private _eventListeners = new Map<string, Set<(...args: any[]) => void>>();

  // Request tracking
  private _pendingRequests = new Map<
    string,
    {
      resolve: (value: unknown) => void;
      reject: (reason: ProviderRpcError) => void;
    }
  >();

  constructor() {
    this._initialize();
  }

  /**
   * Initialize provider and set up message listener
   */
  private _initialize(): void {
    // Listen for messages from content script
    window.addEventListener('message', this._handleMessage.bind(this));

    // Request initial state (async, don't wait)
    // Use setTimeout to avoid blocking constructor
    setTimeout(() => this._requestInitialState(), 0);
  }

  /**
   * Handle incoming messages from content script
   */
  private _handleMessage(event: MessageEvent): void {
    // Only accept messages from same window
    if (event.source !== window) return;

    const message = event.data as Message;

    // Verify message is for us
    if (!message || message.target !== MessageTarget.INPAGE) return;

    switch (message.type) {
      case MessageType.PROVIDER_RESPONSE:
        this._handleResponse(message as ProviderResponseMessage);
        break;

      case MessageType.PROVIDER_ERROR:
        this._handleError(message as ProviderErrorMessage);
        break;

      case MessageType.PROVIDER_EVENT:
        this._handleEvent(message as ProviderEventMessage);
        break;
    }
  }

  /**
   * Handle response message
   */
  private _handleResponse(message: ProviderResponseMessage): void {
    const pending = this._pendingRequests.get(message.id);
    if (!pending) return;

    this._pendingRequests.delete(message.id);
    pending.resolve(message.payload);
  }

  /**
   * Handle error message
   */
  private _handleError(message: ProviderErrorMessage): void {
    const pending = this._pendingRequests.get(message.id);
    if (!pending) return;

    this._pendingRequests.delete(message.id);

    const error = new ProviderRpcError(
      message.payload.code,
      message.payload.message,
      message.payload.data
    );

    pending.reject(error);
  }

  /**
   * Handle event message
   */
  private _handleEvent(message: ProviderEventMessage): void {
    const { event, data } = message.payload;

    // Update internal state for specific events
    switch (event) {
      case 'accountsChanged':
        this._selectedAddress = (data as string[])[0] || null;
        break;

      case 'chainChanged':
        this._chainId = data as string;
        break;

      case 'connect':
        this._isConnected = true;
        this._chainId = (data as ProviderConnectInfo).chainId;
        break;

      case 'disconnect':
        this._isConnected = false;
        this._selectedAddress = null;
        break;
    }

    // Emit event to listeners
    this._emit(event, data);
  }

  /**
   * Request initial state from extension
   */
  private _requestInitialState(): void {
    // Request current chain and accounts
    this.request({ method: 'eth_chainId' })
      .then((chainId) => {
        this._chainId = chainId as string;
      })
      .catch(() => {
        // Ignore errors during initialization
      });

    this.request({ method: 'eth_accounts' })
      .then((accounts) => {
        const accountList = accounts as string[];
        this._selectedAddress = accountList[0] || null;
        if (accountList.length > 0) {
          this._isConnected = true;
        }
      })
      .catch(() => {
        // Ignore errors during initialization
      });
  }

  /**
   * EIP-1193 request method
   */
  async request(args: RequestArguments): Promise<unknown> {
    if (!args || typeof args.method !== 'string') {
      throw new ProviderRpcError(
        -32600,
        'Invalid request: method must be a string'
      );
    }

    return new Promise((resolve, reject) => {
      const id = this._generateRequestId();

      // Store pending request
      this._pendingRequests.set(id, { resolve, reject });

      // Send message to content script
      const message: ProviderRequestMessage = {
        id,
        target: MessageTarget.CONTENT_SCRIPT,
        type: MessageType.PROVIDER_REQUEST,
        payload: args,
      };

      window.postMessage(message, '*');

      // Set timeout (30 seconds)
      setTimeout(() => {
        if (this._pendingRequests.has(id)) {
          this._pendingRequests.delete(id);
          reject(
            new ProviderRpcError(
              -32603,
              'Request timeout: No response from wallet'
            )
          );
        }
      }, 30000);
    });
  }

  /**
   * Add event listener (EIP-1193)
   */
  on(event: string, listener: (...args: any[]) => void): void {
    if (!this._eventListeners.has(event)) {
      this._eventListeners.set(event, new Set());
    }
    this._eventListeners.get(event)!.add(listener);
  }

  /**
   * Remove event listener (EIP-1193)
   */
  removeListener(event: string, listener: (...args: any[]) => void): void {
    const listeners = this._eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * Emit event to all listeners
   */
  private _emit(event: string, data: unknown): void {
    const listeners = this._eventListeners.get(event);
    if (!listeners) return;

    for (const listener of listeners) {
      try {
        listener(data);
      } catch (error) {
        console.error(`Error in ${event} listener:`, error);
      }
    }
  }

  /**
   * Generate unique request ID
   */
  private _generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Get current chain ID
   */
  get chainId(): string | undefined {
    return this._chainId ?? undefined;
  }

  /**
   * Get selected address
   */
  get selectedAddress(): string | null {
    return this._selectedAddress;
  }

  /**
   * Check if provider is connected
   */
  get isConnected(): boolean {
    return this._isConnected;
  }
}
