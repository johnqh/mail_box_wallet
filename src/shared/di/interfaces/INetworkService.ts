/**
 * Network Service Interface
 *
 * Manages blockchain networks and RPC endpoints.
 */

export interface Network {
  /** Unique identifier for the network */
  id: string;

  /** Display name */
  name: string;

  /** Chain ID in hex format (e.g., "0x1" for Ethereum mainnet) */
  chainId: string;

  /** RPC endpoint URL */
  rpcUrl: string;

  /** Currency symbol (e.g., "ETH") */
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };

  /** Block explorer URL (optional) */
  blockExplorerUrl?: string;

  /** Whether this is a testnet */
  isTestnet: boolean;

  /** Whether this is a default network (cannot be deleted) */
  isDefault: boolean;

  /** Icon URL (optional) */
  iconUrl?: string;

  /** Creation timestamp */
  createdAt: number;
}

export interface NetworkValidation {
  /** Whether the network configuration is valid */
  isValid: boolean;

  /** Validation errors */
  errors: string[];
}

export interface RpcResponse<T = unknown> {
  jsonrpc: string;
  id: number | string;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface INetworkService {
  /**
   * Get all networks
   */
  getNetworks(): Promise<Network[]>;

  /**
   * Get network by ID
   */
  getNetwork(id: string): Promise<Network | null>;

  /**
   * Get network by chain ID
   */
  getNetworkByChainId(chainId: string): Promise<Network | null>;

  /**
   * Get current active network
   */
  getCurrentNetwork(): Promise<Network | null>;

  /**
   * Set current active network
   */
  setCurrentNetwork(id: string): Promise<void>;

  /**
   * Add custom network
   */
  addNetwork(network: Omit<Network, 'id' | 'isDefault' | 'createdAt'>): Promise<Network>;

  /**
   * Update network
   */
  updateNetwork(id: string, updates: Partial<Network>): Promise<void>;

  /**
   * Remove network (only custom networks)
   */
  removeNetwork(id: string): Promise<void>;

  /**
   * Validate network configuration
   */
  validateNetwork(network: Partial<Network>): NetworkValidation;

  /**
   * Test RPC connectivity
   */
  testRpcConnection(rpcUrl: string): Promise<boolean>;

  /**
   * Make RPC call
   */
  rpcCall<T = unknown>(rpcUrl: string, method: string, params?: unknown[]): Promise<T>;

  /**
   * Get default networks
   */
  getDefaultNetworks(): Network[];
}
