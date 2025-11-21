/**
 * EIP-1193: Ethereum Provider JavaScript API
 * https://eips.ethereum.org/EIPS/eip-1193
 */

/**
 * Request arguments for the EIP-1193 provider
 */
export interface RequestArguments {
  method: string;
  params?: unknown[] | object;
}

/**
 * Provider RPC error codes per EIP-1193
 */
export enum ProviderRpcErrorCode {
  /**
   * Internal error
   */
  INTERNAL_ERROR = -32603,

  /**
   * User rejected the request
   */
  USER_REJECTED_REQUEST = 4001,

  /**
   * The requested method and/or account has not been authorized by the user
   */
  UNAUTHORIZED = 4100,

  /**
   * The Provider does not support the requested method
   */
  UNSUPPORTED_METHOD = 4200,

  /**
   * The Provider is disconnected from all chains
   */
  DISCONNECTED = 4900,

  /**
   * The Provider is not connected to the requested chain
   */
  CHAIN_DISCONNECTED = 4901,
}

/**
 * Provider RPC error
 */
export class ProviderRpcError extends Error {
  code: number;
  data?: unknown;

  constructor(code: number, message: string, data?: unknown) {
    super(message);
    this.code = code;
    this.data = data;
    this.name = 'ProviderRpcError';
  }
}

/**
 * Provider information
 */
export interface ProviderInfo {
  uuid?: string;
  name?: string;
  icon?: string;
  description?: string;
}

/**
 * Provider connect info
 */
export interface ProviderConnectInfo {
  chainId: string;
}

/**
 * Provider message
 */
export interface ProviderMessage {
  type: string;
  data: unknown;
}

/**
 * EIP-1193 Ethereum Provider interface
 */
export interface EIP1193Provider {
  // Request method
  request(args: RequestArguments): Promise<unknown>;

  // Event emitter methods
  on(event: string, listener: (...args: unknown[]) => void): void;
  removeListener(event: string, listener: (...args: unknown[]) => void): void;

  // Provider identification
  isIdentityWallet?: boolean;

  // Chain ID (hex string)
  chainId?: string;

  // Selected address
  selectedAddress?: string | null;
}

/**
 * Event types
 */
export type ProviderEvents = {
  connect: ProviderConnectInfo;
  disconnect: ProviderRpcError;
  accountsChanged: string[];
  chainChanged: string;
  message: ProviderMessage;
};
