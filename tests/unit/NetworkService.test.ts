import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NetworkService } from '@/shared/services/NetworkService';
import { IStorageService } from '@/shared/di/interfaces/IStorageService';
import { Network } from '@/shared/di/interfaces/INetworkService';

// Mock Storage Service
class MockStorageService implements IStorageService {
  private storage: Map<string, unknown> = new Map();

  async get<T>(key: string): Promise<T | null> {
    return (this.storage.get(key) as T) ?? null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.storage.set(key, value);
  }

  async remove(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }

  async keys(): Promise<string[]> {
    return Array.from(this.storage.keys());
  }
}

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('NetworkService', () => {
  let networkService: NetworkService;
  let storageService: MockStorageService;

  beforeEach(async () => {
    storageService = new MockStorageService();
    networkService = new NetworkService(storageService);
    await networkService.initialize();
    mockFetch.mockClear();
  });

  describe('initialize', () => {
    it('should load default networks', async () => {
      const networks = await networkService.getNetworks();

      expect(networks.length).toBeGreaterThan(0);
      expect(networks.some((n) => n.name === 'Ethereum Mainnet')).toBe(true);
      expect(networks.some((n) => n.name === 'Sepolia Testnet')).toBe(true);
    });

    it('should set Ethereum Mainnet as default current network', async () => {
      const currentNetwork = await networkService.getCurrentNetwork();

      expect(currentNetwork).not.toBeNull();
      expect(currentNetwork?.name).toBe('Ethereum Mainnet');
      expect(currentNetwork?.chainId).toBe('0x1');
    });

    it('should load custom networks from storage', async () => {
      const customNetwork: Network = {
        id: 'custom-test',
        name: 'Test Network',
        chainId: '0x539',
        rpcUrl: 'http://localhost:8545',
        nativeCurrency: {
          name: 'Test Ether',
          symbol: 'TEST',
          decimals: 18,
        },
        isTestnet: true,
        isDefault: false,
        createdAt: Date.now(),
      };

      await storageService.set('networks', [customNetwork]);

      const newService = new NetworkService(storageService);
      await newService.initialize();

      const networks = await newService.getNetworks();
      const found = networks.find((n) => n.id === 'custom-test');

      expect(found).toBeDefined();
      expect(found?.name).toBe('Test Network');
    });
  });

  describe('getNetworks', () => {
    it('should return all networks', async () => {
      const networks = await networkService.getNetworks();

      expect(Array.isArray(networks)).toBe(true);
      expect(networks.length).toBeGreaterThan(0);
    });

    it('should return a copy of networks array', async () => {
      const networks1 = await networkService.getNetworks();
      const networks2 = await networkService.getNetworks();

      expect(networks1).not.toBe(networks2);
      expect(networks1).toEqual(networks2);
    });
  });

  describe('getNetwork', () => {
    it('should get network by ID', async () => {
      const network = await networkService.getNetwork('ethereum-mainnet');

      expect(network).not.toBeNull();
      expect(network?.name).toBe('Ethereum Mainnet');
      expect(network?.chainId).toBe('0x1');
    });

    it('should return null for non-existent network', async () => {
      const network = await networkService.getNetwork('non-existent');

      expect(network).toBeNull();
    });
  });

  describe('getNetworkByChainId', () => {
    it('should get network by chain ID', async () => {
      const network = await networkService.getNetworkByChainId('0x1');

      expect(network).not.toBeNull();
      expect(network?.name).toBe('Ethereum Mainnet');
    });

    it('should be case insensitive', async () => {
      const network1 = await networkService.getNetworkByChainId('0xAA36A7');
      const network2 = await networkService.getNetworkByChainId('0xaa36a7');

      expect(network1).not.toBeNull();
      expect(network2).not.toBeNull();
      expect(network1?.id).toBe(network2?.id);
    });

    it('should return null for non-existent chain ID', async () => {
      const network = await networkService.getNetworkByChainId('0x9999');

      expect(network).toBeNull();
    });
  });

  describe('getCurrentNetwork', () => {
    it('should get current network', async () => {
      const network = await networkService.getCurrentNetwork();

      expect(network).not.toBeNull();
      expect(network?.isDefault).toBe(true);
    });
  });

  describe('setCurrentNetwork', () => {
    it('should set current network', async () => {
      await networkService.setCurrentNetwork('sepolia');

      const currentNetwork = await networkService.getCurrentNetwork();
      expect(currentNetwork?.id).toBe('sepolia');
      expect(currentNetwork?.name).toBe('Sepolia Testnet');
    });

    it('should persist current network to storage', async () => {
      await networkService.setCurrentNetwork('sepolia');

      const storedId = await storageService.get<string>('current_network');
      expect(storedId).toBe('sepolia');
    });

    it('should throw error for non-existent network', async () => {
      await expect(networkService.setCurrentNetwork('non-existent')).rejects.toThrow(
        'Network not found'
      );
    });
  });

  describe('addNetwork', () => {
    it('should add custom network', async () => {
      const newNetwork = await networkService.addNetwork({
        name: 'Custom Network',
        chainId: '0x539',
        rpcUrl: 'http://localhost:8545',
        nativeCurrency: {
          name: 'Test Ether',
          symbol: 'TEST',
          decimals: 18,
        },
        isTestnet: true,
      });

      expect(newNetwork.id).toBeTruthy();
      expect(newNetwork.name).toBe('Custom Network');
      expect(newNetwork.isDefault).toBe(false);

      const networks = await networkService.getNetworks();
      expect(networks.find((n) => n.id === newNetwork.id)).toBeDefined();
    });

    it('should throw error for duplicate chain ID', async () => {
      await expect(
        networkService.addNetwork({
          name: 'Duplicate',
          chainId: '0x1', // Ethereum Mainnet chain ID
          rpcUrl: 'http://localhost:8545',
          nativeCurrency: {
            name: 'Test',
            symbol: 'TEST',
            decimals: 18,
          },
          isTestnet: false,
        })
      ).rejects.toThrow('Network with this chain ID already exists');
    });

    it('should throw error for invalid network', async () => {
      await expect(
        networkService.addNetwork({
          name: '',
          chainId: '0x539',
          rpcUrl: 'http://localhost:8545',
          nativeCurrency: {
            name: 'Test',
            symbol: 'TEST',
            decimals: 18,
          },
          isTestnet: true,
        })
      ).rejects.toThrow('Invalid network');
    });
  });

  describe('updateNetwork', () => {
    it('should update custom network', async () => {
      // Add a custom network first
      const network = await networkService.addNetwork({
        name: 'Test Network',
        chainId: '0x539',
        rpcUrl: 'http://localhost:8545',
        nativeCurrency: {
          name: 'Test',
          symbol: 'TEST',
          decimals: 18,
        },
        isTestnet: true,
      });

      // Update it
      await networkService.updateNetwork(network.id, {
        name: 'Updated Network',
        rpcUrl: 'http://localhost:9545',
      });

      const updated = await networkService.getNetwork(network.id);
      expect(updated?.name).toBe('Updated Network');
      expect(updated?.rpcUrl).toBe('http://localhost:9545');
    });

    it('should throw error when updating default network', async () => {
      await expect(
        networkService.updateNetwork('ethereum-mainnet', {
          name: 'Modified Mainnet',
        })
      ).rejects.toThrow('Cannot update default networks');
    });

    it('should throw error for non-existent network', async () => {
      await expect(
        networkService.updateNetwork('non-existent', {
          name: 'Test',
        })
      ).rejects.toThrow('Network not found');
    });
  });

  describe('removeNetwork', () => {
    it('should remove custom network', async () => {
      // Add a custom network
      const network = await networkService.addNetwork({
        name: 'To Remove',
        chainId: '0x539',
        rpcUrl: 'http://localhost:8545',
        nativeCurrency: {
          name: 'Test',
          symbol: 'TEST',
          decimals: 18,
        },
        isTestnet: true,
      });

      // Remove it
      await networkService.removeNetwork(network.id);

      const removed = await networkService.getNetwork(network.id);
      expect(removed).toBeNull();
    });

    it('should throw error when removing default network', async () => {
      await expect(networkService.removeNetwork('ethereum-mainnet')).rejects.toThrow(
        'Cannot remove default networks'
      );
    });

    it('should throw error for non-existent network', async () => {
      await expect(networkService.removeNetwork('non-existent')).rejects.toThrow(
        'Network not found'
      );
    });

    it('should switch to default network if removing current network', async () => {
      // Add and set custom network as current
      const network = await networkService.addNetwork({
        name: 'Custom Current',
        chainId: '0x539',
        rpcUrl: 'http://localhost:8545',
        nativeCurrency: {
          name: 'Test',
          symbol: 'TEST',
          decimals: 18,
        },
        isTestnet: true,
      });

      await networkService.setCurrentNetwork(network.id);

      // Remove it
      await networkService.removeNetwork(network.id);

      // Should switch to default
      const currentNetwork = await networkService.getCurrentNetwork();
      expect(currentNetwork?.isDefault).toBe(true);
    });
  });

  describe('validateNetwork', () => {
    it('should validate correct network', () => {
      const validation = networkService.validateNetwork({
        name: 'Test Network',
        chainId: '0x1',
        rpcUrl: 'https://example.com',
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18,
        },
      });

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject empty name', () => {
      const validation = networkService.validateNetwork({
        name: '',
        chainId: '0x1',
        rpcUrl: 'https://example.com',
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18,
        },
      });

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Network name is required');
    });

    it('should reject invalid chain ID format', () => {
      const validation = networkService.validateNetwork({
        name: 'Test',
        chainId: '1', // Should be hex
        rpcUrl: 'https://example.com',
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18,
        },
      });

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.includes('hex format'))).toBe(true);
    });

    it('should reject invalid RPC URL', () => {
      const validation = networkService.validateNetwork({
        name: 'Test',
        chainId: '0x1',
        rpcUrl: 'not-a-url',
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18,
        },
      });

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.includes('RPC URL'))).toBe(true);
    });

    it('should reject non-HTTP(S) protocol', () => {
      const validation = networkService.validateNetwork({
        name: 'Test',
        chainId: '0x1',
        rpcUrl: 'ftp://example.com',
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18,
        },
      });

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.includes('HTTP or HTTPS'))).toBe(true);
    });

    it('should reject missing native currency', () => {
      const validation = networkService.validateNetwork({
        name: 'Test',
        chainId: '0x1',
        rpcUrl: 'https://example.com',
      });

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.includes('currency'))).toBe(true);
    });

    it('should reject invalid decimals', () => {
      const validation = networkService.validateNetwork({
        name: 'Test',
        chainId: '0x1',
        rpcUrl: 'https://example.com',
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: -1,
        },
      });

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.includes('decimals'))).toBe(true);
    });

    it('should validate optional block explorer URL', () => {
      const validation = networkService.validateNetwork({
        name: 'Test',
        chainId: '0x1',
        rpcUrl: 'https://example.com',
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18,
        },
        blockExplorerUrl: 'https://etherscan.io',
      });

      expect(validation.isValid).toBe(true);
    });

    it('should reject invalid block explorer URL', () => {
      const validation = networkService.validateNetwork({
        name: 'Test',
        chainId: '0x1',
        rpcUrl: 'https://example.com',
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18,
        },
        blockExplorerUrl: 'not-a-url',
      });

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.includes('explorer'))).toBe(true);
    });
  });

  describe('testRpcConnection', () => {
    it('should return true for successful connection', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          result: '0x1',
        }),
      });

      const result = await networkService.testRpcConnection('https://eth.llamarpc.com');

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://eth.llamarpc.com',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should return false for failed connection', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await networkService.testRpcConnection('https://invalid.url');

      expect(result).toBe(false);
    });

    it('should return false for RPC error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          error: {
            code: -32601,
            message: 'Method not found',
          },
        }),
      });

      const result = await networkService.testRpcConnection('https://eth.llamarpc.com');

      expect(result).toBe(false);
    });
  });

  describe('rpcCall', () => {
    it('should make successful RPC call', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          result: '0x1',
        }),
      });

      const result = await networkService.rpcCall('https://eth.llamarpc.com', 'eth_chainId');

      expect(result).toBe('0x1');
    });

    it('should include params in request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          result: '0x123',
        }),
      });

      await networkService.rpcCall('https://eth.llamarpc.com', 'eth_getBlockByNumber', [
        '0x1',
        false,
      ]);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.method).toBe('eth_getBlockByNumber');
      expect(body.params).toEqual(['0x1', false]);
    });

    it('should throw error for HTTP failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      });

      await expect(
        networkService.rpcCall('https://eth.llamarpc.com', 'eth_chainId')
      ).rejects.toThrow('RPC request failed');
    });

    it('should throw error for RPC error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          error: {
            code: -32601,
            message: 'Method not found',
          },
        }),
      });

      await expect(
        networkService.rpcCall('https://eth.llamarpc.com', 'invalid_method')
      ).rejects.toThrow('RPC error: Method not found');
    });

    it('should throw error for missing result', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
        }),
      });

      await expect(
        networkService.rpcCall('https://eth.llamarpc.com', 'eth_chainId')
      ).rejects.toThrow('RPC response missing result');
    });
  });

  describe('getDefaultNetworks', () => {
    it('should return default networks', () => {
      const networks = networkService.getDefaultNetworks();

      expect(Array.isArray(networks)).toBe(true);
      expect(networks.length).toBeGreaterThan(0);
      expect(networks.every((n) => n.isDefault)).toBe(true);
    });

    it('should include common networks', () => {
      const networks = networkService.getDefaultNetworks();
      const names = networks.map((n) => n.name);

      expect(names).toContain('Ethereum Mainnet');
      expect(names).toContain('Sepolia Testnet');
      expect(names).toContain('Polygon Mainnet');
    });
  });

  describe('Full workflow', () => {
    it('should handle complete network management lifecycle', async () => {
      // Get default networks
      const defaultNetworks = await networkService.getNetworks();
      expect(defaultNetworks.length).toBeGreaterThan(0);

      // Add custom network
      const customNetwork = await networkService.addNetwork({
        name: 'Local Testnet',
        chainId: '0x539',
        rpcUrl: 'http://localhost:8545',
        nativeCurrency: {
          name: 'Test Ether',
          symbol: 'TEST',
          decimals: 18,
        },
        isTestnet: true,
      });

      // Switch to custom network
      await networkService.setCurrentNetwork(customNetwork.id);
      const current = await networkService.getCurrentNetwork();
      expect(current?.id).toBe(customNetwork.id);

      // Update custom network
      await networkService.updateNetwork(customNetwork.id, {
        name: 'Updated Local Testnet',
      });

      const updated = await networkService.getNetwork(customNetwork.id);
      expect(updated?.name).toBe('Updated Local Testnet');

      // Remove custom network (switches to default)
      await networkService.removeNetwork(customNetwork.id);

      const currentAfterRemove = await networkService.getCurrentNetwork();
      expect(currentAfterRemove?.isDefault).toBe(true);
    });
  });
});
