#!/usr/bin/env tsx

/**
 * Development Setup Script
 *
 * Usage: npm run dev:setup
 *
 * Creates a pre-configured wallet for development:
 * - Password: dev123
 * - Known seed phrase for consistency
 * - 3 pre-generated accounts
 * - Displays account addresses and private keys for testing
 */

import { WalletService } from '../src/shared/services/WalletService';
import { CryptoService } from '../src/shared/services/CryptoService';
import { VaultService } from '../src/shared/services/VaultService';
import { KeyringService } from '../src/shared/services/KeyringService';
import { SessionService } from '../src/shared/services/SessionService';
import { IStorageService } from '../src/shared/di/interfaces/IStorageService';

// Mock Storage for development
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
  console.log('🚀 Development Wallet Setup\n');
  console.log('='.repeat(70) + '\n');

  // Initialize services
  const walletService = new WalletService();
  const cryptoService = new CryptoService();
  const storageService = new MemoryStorageService();
  const vaultService = new VaultService(cryptoService, storageService);
  const keyringService = new KeyringService(walletService, storageService);
  const sessionService = new SessionService(storageService);

  try {
    // Configuration
    const DEV_PASSWORD = 'dev12345';
    const DEV_SEED_PHRASE =
      'test test test test test test test test test test test junk';

    console.log('📋 Configuration:');
    console.log(`   Password: ${DEV_PASSWORD}`);
    console.log(`   Seed Phrase: ${DEV_SEED_PHRASE}`);
    console.log('');

    // Step 1: Create Vault
    console.log('🔐 Step 1: Creating Vault...');
    await vaultService.create(DEV_PASSWORD, DEV_SEED_PHRASE);
    console.log('   ✓ Vault created and unlocked');
    console.log('');

    // Step 2: Initialize Keyring
    console.log('🔑 Step 2: Initializing Keyring...');
    const seedPhrase = await vaultService.unlock(DEV_PASSWORD);
    await keyringService.initialize(seedPhrase);
    console.log('   ✓ Keyring initialized');
    console.log('');

    // Step 3: Get First Account (auto-created)
    console.log('👤 Step 3: Account Setup...');
    const accounts = await keyringService.getAccounts();
    console.log(`   ✓ Account 1 auto-created`);

    // Step 4: Create Additional Accounts
    await keyringService.createAccount('Account 2');
    await keyringService.createAccount('Account 3');
    console.log('   ✓ Account 2 created');
    console.log('   ✓ Account 3 created');
    console.log('');

    // Step 5: Start Session
    console.log('🎯 Step 4: Starting Session...');
    const allAccounts = await keyringService.getAccounts();
    await sessionService.startSession(allAccounts[0].address);
    console.log(`   ✓ Session started with Account 1`);
    console.log('');

    // Display Account Information
    console.log('='.repeat(70));
    console.log('📊 Account Information\n');

    for (const account of allAccounts) {
      const privateKey = await keyringService.getPrivateKey(account.address);
      console.log(`${account.name}:`);
      console.log(`   Index: ${account.index}`);
      console.log(`   Address: ${account.address}`);
      console.log(`   Private Key: 0x${privateKey}`);
      console.log('');
    }

    console.log('='.repeat(70));
    console.log('✅ Development Wallet Ready!\n');

    console.log('Quick Reference:');
    console.log(`   Password: ${DEV_PASSWORD}`);
    console.log(`   Seed: ${DEV_SEED_PHRASE}`);
    console.log(`   Accounts: ${allAccounts.length}`);
    console.log(`   Active: ${allAccounts[0].address}`);
    console.log('');

    console.log('Session Status:');
    console.log(`   Unlocked: ${sessionService.isUnlocked() ? '✓' : '✗'}`);
    console.log(`   Active Address: ${await sessionService.getActiveAddress()}`);
    console.log(`   Auto-lock: ${await sessionService.getAutoLockTimeout()} minutes`);
    console.log('');

    console.log('Storage Keys:');
    const storageKeys = await storageService.keys();
    storageKeys.forEach((key) => {
      console.log(`   - ${key}`);
    });
    console.log('');

    console.log('🎉 Setup Complete! You can now use these accounts for development.\n');
    console.log('Usage Examples:');
    console.log('   • Import seed phrase in wallet UI');
    console.log('   • Use private keys for testing transactions');
    console.log('   • Test account switching with 3 accounts');
    console.log('   • Test session management and auto-lock');
    console.log('');

    // Export wallet state for reference
    console.log('='.repeat(70));
    console.log('📤 Wallet State Export (for debugging)\n');

    const vaultExists = await vaultService.exists();
    const isUnlocked = vaultService.isUnlocked();
    const isInitialized = keyringService.isInitialized();
    const sessionState = await sessionService.getSessionState();

    const walletState = {
      vault: {
        exists: vaultExists,
        unlocked: isUnlocked,
      },
      keyring: {
        initialized: isInitialized,
        accountCount: allAccounts.length,
      },
      session: sessionState,
      accounts: allAccounts.map((a) => ({
        name: a.name,
        address: a.address,
        index: a.index,
        chainType: a.chainType,
      })),
    };

    console.log(JSON.stringify(walletState, null, 2));
    console.log('');

    console.log('='.repeat(70));
    console.log('');
    console.log('⚠️  Security Note:');
    console.log('   This is a DEVELOPMENT-ONLY wallet with known credentials.');
    console.log('   Never use these accounts or seed phrase with real funds!');
    console.log('');
  } catch (error) {
    console.error('\n❌ Setup Failed:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
