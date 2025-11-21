/**
 * Network Service Implementation
 *
 * Manages blockchain networks and RPC connectivity.
 */

import {
  INetworkService,
  Network,
  NetworkValidation,
  RpcResponse,
} from '@/shared/di/interfaces/INetworkService';
import { IStorageService } from '@/shared/di/interfaces/IStorageService';

const NETWORKS_STORAGE_KEY = 'networks';
const CURRENT_NETWORK_KEY = 'current_network';

// Default networks that cannot be deleted
const DEFAULT_NETWORKS: Network[] = [
  {
    id: 'ethereum-mainnet',
    name: 'Ethereum Mainnet',
    chainId: '0x1',
    rpcUrl: 'https://eth.llamarpc.com',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorerUrl: 'https://etherscan.io',
    isTestnet: false,
    isDefault: true,
    createdAt: Date.now(),
  },
  {
    id: 'sepolia',
    name: 'Sepolia Testnet',
    chainId: '0xaa36a7',
    rpcUrl: 'https://rpc.sepolia.org',
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorerUrl: 'https://sepolia.etherscan.io',
    isTestnet: true,
    isDefault: true,
    createdAt: Date.now(),
  },
  {
    id: 'polygon-mainnet',
    name: 'Polygon Mainnet',
    chainId: '0x89',
    rpcUrl: 'https://polygon-rpc.com',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18,
    },
    blockExplorerUrl: 'https://polygonscan.com',
    isTestnet: false,
    isDefault: true,
    createdAt: Date.now(),
  },
  {
    id: 'arbitrum-one',
    name: 'Arbitrum One',
    chainId: '0xa4b1',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorerUrl: 'https://arbiscan.io',
    isTestnet: false,
    isDefault: true,
    createdAt: Date.now(),
  },
  {
    id: 'optimism-mainnet',
    name: 'Optimism Mainnet',
    chainId: '0xa',
    rpcUrl: 'https://mainnet.optimism.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorerUrl: 'https://optimistic.etherscan.io',
    isTestnet: false,
    isDefault: true,
    createdAt: Date.now(),
  },
];

export class NetworkService implements INetworkService {
  private networks: Network[] = [];
  private currentNetworkId: string | null = null;

  constructor(private storage: IStorageService) {}

  /**
   * Initialize service (load networks from storage)
   */
  async initialize(): Promise<void> {
    // Load custom networks from storage
    const storedNetworks = await this.storage.get<Network[]>(NETWORKS_STORAGE_KEY);

    // Combine default networks with custom networks
    this.networks = [...DEFAULT_NETWORKS];

    if (storedNetworks && Array.isArray(storedNetworks)) {
      // Add custom networks
      storedNetworks.forEach((network) => {
        if (!network.isDefault) {
          this.networks.push(network);
        }
      });
    }

    // Load current network
    const currentNetworkId = await this.storage.get<string>(CURRENT_NETWORK_KEY);
    this.currentNetworkId = currentNetworkId || DEFAULT_NETWORKS[0].id;
  }

  /**
   * Get all networks
   */
  async getNetworks(): Promise<Network[]> {
    return [...this.networks];
  }

  /**
   * Get network by ID
   */
  async getNetwork(id: string): Promise<Network | null> {
    return this.networks.find((n) => n.id === id) || null;
  }

  /**
   * Get network by chain ID
   */
  async getNetworkByChainId(chainId: string): Promise<Network | null> {
    return this.networks.find((n) => n.chainId.toLowerCase() === chainId.toLowerCase()) || null;
  }

  /**
   * Get current active network
   */
  async getCurrentNetwork(): Promise<Network | null> {
    if (!this.currentNetworkId) {
      return null;
    }
    return this.networks.find((n) => n.id === this.currentNetworkId) || null;
  }

  /**
   * Set current active network
   */
  async setCurrentNetwork(id: string): Promise<void> {
    const network = await this.getNetwork(id);
    if (!network) {
      throw new Error('Network not found');
    }

    this.currentNetworkId = id;
    await this.storage.set(CURRENT_NETWORK_KEY, id);
  }

  /**
   * Add custom network
   */
  async addNetwork(
    network: Omit<Network, 'id' | 'isDefault' | 'createdAt'>
  ): Promise<Network> {
    // Validate network
    const validation = this.validateNetwork(network);
    if (!validation.isValid) {
      throw new Error(`Invalid network: ${validation.errors.join(', ')}`);
    }

    // Check if network with same chain ID already exists
    const existing = await this.getNetworkByChainId(network.chainId);
    if (existing) {
      throw new Error('Network with this chain ID already exists');
    }

    // Generate ID
    const id = `custom-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const newNetwork: Network = {
      ...network,
      id,
      isDefault: false,
      createdAt: Date.now(),
    };

    this.networks.push(newNetwork);
    await this.saveCustomNetworks();

    return newNetwork;
  }

  /**
   * Update network
   */
  async updateNetwork(id: string, updates: Partial<Network>): Promise<void> {
    const network = await this.getNetwork(id);
    if (!network) {
      throw new Error('Network not found');
    }

    if (network.isDefault) {
      throw new Error('Cannot update default networks');
    }

    // Apply updates
    Object.assign(network, updates);

    // Validate updated network
    const validation = this.validateNetwork(network);
    if (!validation.isValid) {
      throw new Error(`Invalid network: ${validation.errors.join(', ')}`);
    }

    await this.saveCustomNetworks();
  }

  /**
   * Remove network
   */
  async removeNetwork(id: string): Promise<void> {
    const network = await this.getNetwork(id);
    if (!network) {
      throw new Error('Network not found');
    }

    if (network.isDefault) {
      throw new Error('Cannot remove default networks');
    }

    // Remove from list
    this.networks = this.networks.filter((n) => n.id !== id);

    // If this was the current network, switch to default
    if (this.currentNetworkId === id) {
      await this.setCurrentNetwork(DEFAULT_NETWORKS[0].id);
    }

    await this.saveCustomNetworks();
  }

  /**
   * Validate network configuration
   */
  validateNetwork(network: Partial<Network>): NetworkValidation {
    const errors: string[] = [];

    // Validate name
    if (!network.name || network.name.trim().length === 0) {
      errors.push('Network name is required');
    }

    // Validate chain ID
    if (!network.chainId) {
      errors.push('Chain ID is required');
    } else if (!/^0x[0-9a-fA-F]+$/.test(network.chainId)) {
      errors.push('Chain ID must be in hex format (e.g., 0x1)');
    }

    // Validate RPC URL
    if (!network.rpcUrl) {
      errors.push('RPC URL is required');
    } else {
      try {
        const url = new URL(network.rpcUrl);
        if (!['http:', 'https:'].includes(url.protocol)) {
          errors.push('RPC URL must use HTTP or HTTPS protocol');
        }
      } catch {
        errors.push('Invalid RPC URL format');
      }
    }

    // Validate native currency
    if (!network.nativeCurrency) {
      errors.push('Native currency is required');
    } else {
      if (!network.nativeCurrency.name) {
        errors.push('Currency name is required');
      }
      if (!network.nativeCurrency.symbol) {
        errors.push('Currency symbol is required');
      }
      if (typeof network.nativeCurrency.decimals !== 'number' || network.nativeCurrency.decimals < 0) {
        errors.push('Currency decimals must be a non-negative number');
      }
    }

    // Validate block explorer URL (optional)
    if (network.blockExplorerUrl) {
      try {
        const url = new URL(network.blockExplorerUrl);
        if (!['http:', 'https:'].includes(url.protocol)) {
          errors.push('Block explorer URL must use HTTP or HTTPS protocol');
        }
      } catch {
        errors.push('Invalid block explorer URL format');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Test RPC connectivity
   */
  async testRpcConnection(rpcUrl: string): Promise<boolean> {
    try {
      // Try to get chain ID
      await this.rpcCall<string>(rpcUrl, 'eth_chainId');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Make RPC call
   */
  async rpcCall<T = unknown>(rpcUrl: string, method: string, params: unknown[] = []): Promise<T> {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params,
      }),
    });

    if (!response.ok) {
      throw new Error(`RPC request failed: ${response.statusText}`);
    }

    const data = (await response.json()) as RpcResponse<T>;

    if (data.error) {
      throw new Error(`RPC error: ${data.error.message}`);
    }

    if (data.result === undefined) {
      throw new Error('RPC response missing result');
    }

    return data.result;
  }

  /**
   * Get default networks
   */
  getDefaultNetworks(): Network[] {
    return [...DEFAULT_NETWORKS];
  }

  // ========== Private Methods ==========

  private async saveCustomNetworks(): Promise<void> {
    const customNetworks = this.networks.filter((n) => !n.isDefault);
    await this.storage.set(NETWORKS_STORAGE_KEY, customNetworks);
  }
}
