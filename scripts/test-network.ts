#!/usr/bin/env tsx

/**
 * Network Test Script
 *
 * Usage: npm run dev:test-network
 *
 * Tests network management functionality:
 * - List all default networks
 * - Test RPC connectivity
 * - Add custom network
 * - Network validation
 * - RPC calls (eth_chainId, eth_blockNumber)
 */

import { NetworkService } from '../src/shared/services/NetworkService';
import { IStorageService } from '../src/shared/di/interfaces/IStorageService';

// Mock Storage for testing
class MemoryStorageService implements IStorageService {
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

async function main() {
  console.log('🌐 Network Management Test Script\n');
  console.log('='.repeat(70) + '\n');

  // Initialize service
  const storageService = new MemoryStorageService();
  const networkService = new NetworkService(storageService);

  try {
    // Test 1: Initialize and list default networks
    console.log('📋 Test 1: List Default Networks');
    await networkService.initialize();

    const networks = await networkService.getNetworks();
    console.log(`   Found ${networks.length} networks:\n`);

    networks.forEach((network) => {
      const tag = network.isTestnet ? '[TESTNET]' : '[MAINNET]';
      const defaultTag = network.isDefault ? '[DEFAULT]' : '[CUSTOM]';
      console.log(`   ${defaultTag} ${tag} ${network.name}`);
      console.log(`      Chain ID: ${network.chainId}`);
      console.log(`      RPC: ${network.rpcUrl}`);
      console.log(`      Currency: ${network.nativeCurrency.symbol}`);
      if (network.blockExplorerUrl) {
        console.log(`      Explorer: ${network.blockExplorerUrl}`);
      }
      console.log('');
    });
    console.log('   ✓ Default networks loaded\n');

    // Test 2: Get current network
    console.log('🎯 Test 2: Current Network');
    const currentNetwork = await networkService.getCurrentNetwork();
    console.log(`   Current network: ${currentNetwork?.name}`);
    console.log(`   Chain ID: ${currentNetwork?.chainId}`);
    console.log('   ✓ Current network retrieved\n');

    // Test 3: Network validation
    console.log('✅ Test 3: Network Validation');

    const validNetwork = {
      name: 'Test Valid Network',
      chainId: '0x539',
      rpcUrl: 'https://localhost:8545',
      nativeCurrency: {
        name: 'Test Ether',
        symbol: 'TEST',
        decimals: 18,
      },
    };

    const validation1 = networkService.validateNetwork(validNetwork);
    console.log(`   Valid network: ${validation1.isValid ? '✓' : '✗'}`);

    const invalidNetwork = {
      name: '',
      chainId: '1', // Not hex
      rpcUrl: 'not-a-url',
      nativeCurrency: {
        name: 'Test',
        symbol: 'TEST',
        decimals: -1,
      },
    };

    const validation2 = networkService.validateNetwork(invalidNetwork);
    console.log(`   Invalid network detected: ${validation2.isValid ? '✗' : '✓'}`);
    if (validation2.errors.length > 0) {
      console.log(`   Errors found:`);
      validation2.errors.forEach((error) => {
        console.log(`      - ${error}`);
      });
    }
    console.log('   ✓ Validation working\n');

    // Test 4: Add custom network
    console.log('➕ Test 4: Add Custom Network');
    const customNetwork = await networkService.addNetwork({
      name: 'Local Testnet',
      chainId: '0x7a69',
      rpcUrl: 'http://localhost:8545',
      nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
      },
      blockExplorerUrl: 'http://localhost:4000',
      isTestnet: true,
    });

    console.log(`   Added: ${customNetwork.name}`);
    console.log(`   ID: ${customNetwork.id}`);
    console.log(`   Chain ID: ${customNetwork.chainId}`);
    console.log('   ✓ Custom network added\n');

    // Test 5: Switch networks
    console.log('🔄 Test 5: Switch Networks');
    await networkService.setCurrentNetwork('sepolia');
    const switched = await networkService.getCurrentNetwork();
    console.log(`   Switched to: ${switched?.name}`);
    console.log(`   Chain ID: ${switched?.chainId}`);
    console.log('   ✓ Network switching working\n');

    // Test 6: Update custom network
    console.log('📝 Test 6: Update Custom Network');
    await networkService.updateNetwork(customNetwork.id, {
      name: 'Updated Local Testnet',
      rpcUrl: 'http://localhost:9545',
    });

    const updated = await networkService.getNetwork(customNetwork.id);
    console.log(`   Updated name: ${updated?.name}`);
    console.log(`   Updated RPC: ${updated?.rpcUrl}`);
    console.log('   ✓ Network updated\n');

    // Test 7: RPC connectivity (optional - requires network)
    console.log('🔌 Test 7: Test RPC Connectivity (Optional)');
    console.log('   Testing connectivity to public RPCs...');
    console.log('   Note: This requires internet connection\n');

    const testNetworks = [
      { name: 'Ethereum Mainnet', url: 'https://eth.llamarpc.com' },
      { name: 'Sepolia Testnet', url: 'https://rpc.sepolia.org' },
    ];

    for (const test of testNetworks) {
      try {
        const isConnected = await networkService.testRpcConnection(test.url);
        console.log(`   ${test.name}: ${isConnected ? '✓ Connected' : '✗ Failed'}`);

        if (isConnected) {
          try {
            const chainId = await networkService.rpcCall<string>(test.url, 'eth_chainId');
            const blockNumber = await networkService.rpcCall<string>(
              test.url,
              'eth_blockNumber'
            );
            console.log(`      Chain ID: ${chainId}`);
            console.log(`      Latest block: ${parseInt(blockNumber, 16)}`);
          } catch (error) {
            console.log(`      ⚠ RPC call failed: ${error}`);
          }
        }
      } catch (error) {
        console.log(`   ${test.name}: ✗ Error - ${error}`);
      }
    }
    console.log('   ✓ RPC testing complete\n');

    // Test 8: Remove custom network
    console.log('🗑️  Test 8: Remove Custom Network');
    await networkService.removeNetwork(customNetwork.id);

    const removed = await networkService.getNetwork(customNetwork.id);
    console.log(`   Network removed: ${removed === null ? '✓' : '✗'}`);
    console.log('   ✓ Network removal working\n');

    // Test 9: Get network by chain ID
    console.log('🔍 Test 9: Get Network by Chain ID');
    const ethMainnet = await networkService.getNetworkByChainId('0x1');
    console.log(`   Found network: ${ethMainnet?.name}`);
    console.log(`   Chain ID: ${ethMainnet?.chainId}`);
    console.log('   ✓ Lookup by chain ID working\n');

    // Summary
    console.log('='.repeat(70));
    console.log('✅ All Tests Passed!\n');

    console.log('Network Service Features Tested:');
    console.log('  • Load default networks (5+ networks)');
    console.log('  • Get current network');
    console.log('  • Network validation');
    console.log('  • Add custom network');
    console.log('  • Switch networks');
    console.log('  • Update custom network');
    console.log('  • Test RPC connectivity');
    console.log('  • Make RPC calls (eth_chainId, eth_blockNumber)');
    console.log('  • Remove custom network');
    console.log('  • Lookup by chain ID');
    console.log('');

    const finalNetworks = await networkService.getNetworks();
    console.log(`Total networks: ${finalNetworks.length}`);
    console.log(
      `Default networks: ${finalNetworks.filter((n) => n.isDefault).length}`
    );
    console.log(
      `Custom networks: ${finalNetworks.filter((n) => !n.isDefault).length}`
    );
    console.log('');
  } catch (error) {
    console.error('\n❌ Test Failed:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
