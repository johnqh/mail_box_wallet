import { describe, it, expect, beforeEach } from 'vitest';
import { VaultService } from '@/shared/services/VaultService';
import { KeyringService } from '@/shared/services/KeyringService';
import { SessionService } from '@/shared/services/SessionService';
import { CryptoService } from '@/shared/services/CryptoService';
import { WalletService } from '@/shared/services/WalletService';
import { IStorageService } from '@/shared/di/interfaces/IStorageService';

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

describe('Vault + Keyring Integration', () => {
  let storageService: MockStorageService;
  let cryptoService: CryptoService;
  let walletService: WalletService;
  let vaultService: VaultService;
  let keyringService: KeyringService;
  let sessionService: SessionService;

  const TEST_PASSWORD = 'TestPassword123!';
  const TEST_SEED_PHRASE =
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

  beforeEach(() => {
    storageService = new MockStorageService();
    cryptoService = new CryptoService();
    walletService = new WalletService();
    vaultService = new VaultService(cryptoService, storageService);
    keyringService = new KeyringService(walletService, storageService);
    sessionService = new SessionService(storageService);
  });

  describe('Complete Workflow', () => {
    it('should handle full wallet lifecycle', async () => {
      // ===== 1. Create Vault =====
      await vaultService.create(TEST_PASSWORD, TEST_SEED_PHRASE);
      expect(await vaultService.exists()).toBe(true);
      expect(vaultService.isUnlocked()).toBe(true); // Vault is auto-unlocked after creation

      // ===== 2. Unlock Vault =====
      const seedPhrase = await vaultService.unlock(TEST_PASSWORD);
      expect(vaultService.isUnlocked()).toBe(true);
      expect(seedPhrase).toBe(TEST_SEED_PHRASE);

      // ===== 3. Initialize Keyring =====
      await keyringService.initialize(seedPhrase);
      expect(keyringService.isInitialized()).toBe(true);

      // Should auto-create first account
      const accounts = await keyringService.getAccounts();
      expect(accounts).toHaveLength(1);
      expect(accounts[0].name).toBe('Account 1');
      expect(accounts[0].index).toBe(0);

      // ===== 4. Start Session =====
      await sessionService.startSession(accounts[0].address);
      expect(sessionService.isUnlocked()).toBe(true);
      expect(await sessionService.getActiveAddress()).toBe(accounts[0].address);

      // ===== 5. Create More Accounts =====
      const account2 = await keyringService.createAccount('Account 2');
      const account3 = await keyringService.createAccount('Account 3');

      expect(account2.index).toBe(1);
      expect(account3.index).toBe(2);

      const allAccounts = await keyringService.getAccounts();
      expect(allAccounts).toHaveLength(3);

      // ===== 6. Switch Active Account =====
      await sessionService.setActiveAddress(account2.address);
      expect(await sessionService.getActiveAddress()).toBe(account2.address);

      // ===== 7. Lock Everything =====
      await vaultService.lock();
      await keyringService.lock();
      await sessionService.endSession();

      expect(vaultService.isUnlocked()).toBe(false);
      expect(keyringService.isInitialized()).toBe(false);
      expect(sessionService.isUnlocked()).toBe(false);

      // ===== 8. Unlock Again =====
      const seedPhrase2 = await vaultService.unlock(TEST_PASSWORD);
      await keyringService.initialize(seedPhrase2);

      // ===== 9. Verify Accounts Persist =====
      const persistedAccounts = await keyringService.getAccounts();
      expect(persistedAccounts).toHaveLength(3);
      expect(persistedAccounts[0].name).toBe('Account 1');
      expect(persistedAccounts[1].name).toBe('Account 2');
      expect(persistedAccounts[2].name).toBe('Account 3');

      // ===== 10. Restart Session with Previous Active Account =====
      await sessionService.startSession(account2.address);
      expect(await sessionService.getActiveAddress()).toBe(account2.address);
    });

    it('should handle imported accounts across lock/unlock', async () => {
      // Create and unlock vault
      await vaultService.create(TEST_PASSWORD, TEST_SEED_PHRASE);
      const seedPhrase = await vaultService.unlock(TEST_PASSWORD);
      await keyringService.initialize(seedPhrase);

      // Import an account
      const importedPrivateKey =
        '0123456789012345678901234567890123456789012345678901234567890123';
      const importedAccount = await keyringService.importAccount(
        importedPrivateKey,
        'Imported Account'
      );

      expect(importedAccount.index).toBe(-1);
      expect(importedAccount.name).toBe('Imported Account');

      // Get private key before lock
      const privateKey1 = await keyringService.getPrivateKey(importedAccount.address);
      expect(privateKey1).toBe(importedPrivateKey);

      // Lock and unlock
      await vaultService.lock();
      await keyringService.lock();

      const seedPhrase2 = await vaultService.unlock(TEST_PASSWORD);
      await keyringService.initialize(seedPhrase2);

      // Verify imported account persists
      const accounts = await keyringService.getAccounts();
      const found = accounts.find((a) => a.address === importedAccount.address);
      expect(found).toBeDefined();
      expect(found!.index).toBe(-1);

      // Verify private key still accessible
      const privateKey2 = await keyringService.getPrivateKey(importedAccount.address);
      expect(privateKey2).toBe(importedPrivateKey);
    });

    it('should maintain account order after lock/unlock', async () => {
      // Create vault and initialize keyring
      await vaultService.create(TEST_PASSWORD, TEST_SEED_PHRASE);
      const seedPhrase = await vaultService.unlock(TEST_PASSWORD);
      await keyringService.initialize(seedPhrase);

      // Create multiple accounts
      await keyringService.createAccount('First');
      await keyringService.createAccount('Second');
      await keyringService.createAccount('Third');

      const accountsBefore = await keyringService.getAccounts();
      const addressesBefore = accountsBefore.map((a) => a.address);

      // Lock and unlock
      await keyringService.lock();
      await keyringService.initialize(seedPhrase);

      const accountsAfter = await keyringService.getAccounts();
      const addressesAfter = accountsAfter.map((a) => a.address);

      // Verify same accounts in same order
      expect(addressesAfter).toEqual(addressesBefore);
    });

    it('should handle session state persistence', async () => {
      // Create vault and start session
      await vaultService.create(TEST_PASSWORD, TEST_SEED_PHRASE);
      const seedPhrase = await vaultService.unlock(TEST_PASSWORD);
      await keyringService.initialize(seedPhrase);

      const accounts = await keyringService.getAccounts();
      await sessionService.startSession(accounts[0].address);

      // Set custom auto-lock timeout
      await sessionService.setAutoLockTimeout(10);

      // Lock everything
      await sessionService.endSession();
      await keyringService.lock();
      await vaultService.lock();

      // Unlock and start new session
      await vaultService.unlock(TEST_PASSWORD);
      await keyringService.initialize(seedPhrase);
      await sessionService.startSession(accounts[0].address);

      // Verify auto-lock timeout persisted
      const timeout = await sessionService.getAutoLockTimeout();
      expect(timeout).toBe(10);
    });
  });

  describe('Error Handling', () => {
    it('should prevent keyring initialization with wrong password', async () => {
      // Create vault
      await vaultService.create(TEST_PASSWORD, TEST_SEED_PHRASE);

      // Lock the vault first
      await vaultService.lock();

      // Try to unlock with wrong password
      await expect(vaultService.unlock('WrongPassword')).rejects.toThrow();

      // Keyring should not be initialized
      expect(keyringService.isInitialized()).toBe(false);
    });

    it('should prevent operations on locked keyring', async () => {
      // Create and unlock vault
      await vaultService.create(TEST_PASSWORD, TEST_SEED_PHRASE);
      const seedPhrase = await vaultService.unlock(TEST_PASSWORD);
      await keyringService.initialize(seedPhrase);

      // Lock keyring
      await keyringService.lock();

      // Operations should fail
      await expect(keyringService.createAccount()).rejects.toThrow('Keyring not initialized');
      await expect(
        keyringService.getPrivateKey('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb')
      ).rejects.toThrow('Keyring not initialized');
    });

    it('should prevent session operations when locked', async () => {
      // Create vault and session
      await vaultService.create(TEST_PASSWORD, TEST_SEED_PHRASE);
      const seedPhrase = await vaultService.unlock(TEST_PASSWORD);
      await keyringService.initialize(seedPhrase);

      const accounts = await keyringService.getAccounts();
      await sessionService.startSession(accounts[0].address);

      // End session
      await sessionService.endSession();

      // Operations should fail
      await expect(sessionService.setActiveAddress(accounts[0].address)).rejects.toThrow(
        'Session not active'
      );
    });
  });

  describe('Account Management Integration', () => {
    beforeEach(async () => {
      // Setup: Create vault and initialize keyring
      await vaultService.create(TEST_PASSWORD, TEST_SEED_PHRASE);
      const seedPhrase = await vaultService.unlock(TEST_PASSWORD);
      await keyringService.initialize(seedPhrase);
    });

    it('should derive private keys consistently', async () => {
      const account = await keyringService.createAccount('Test Account');
      const privateKey1 = await keyringService.getPrivateKey(account.address);

      // Lock and unlock
      await keyringService.lock();
      const seedPhrase = await vaultService.unlock(TEST_PASSWORD);
      await keyringService.initialize(seedPhrase);

      const privateKey2 = await keyringService.getPrivateKey(account.address);

      // Same private key should be derived
      expect(privateKey2).toBe(privateKey1);
    });

    it('should handle account name updates across lock/unlock', async () => {
      const account = await keyringService.createAccount('Original Name');

      // Update name
      await keyringService.updateAccountName(account.address, 'New Name');

      // Lock and unlock
      await keyringService.lock();
      const seedPhrase = await vaultService.unlock(TEST_PASSWORD);
      await keyringService.initialize(seedPhrase);

      // Verify name persisted
      const updatedAccount = await keyringService.getAccount(account.address);
      expect(updatedAccount?.name).toBe('New Name');
    });

    it('should remove imported accounts properly', async () => {
      // Import account
      const privateKey = '0123456789012345678901234567890123456789012345678901234567890123';
      const imported = await keyringService.importAccount(privateKey, 'To Remove');

      // Remove it
      await keyringService.removeAccount(imported.address);

      // Lock and unlock
      await keyringService.lock();
      const seedPhrase = await vaultService.unlock(TEST_PASSWORD);
      await keyringService.initialize(seedPhrase);

      // Verify account is gone
      const accounts = await keyringService.getAccounts();
      const found = accounts.find((a) => a.address === imported.address);
      expect(found).toBeUndefined();
    });

    it('should prevent removing derived accounts', async () => {
      const accounts = await keyringService.getAccounts();
      const derivedAccount = accounts[0]; // First account is always derived

      await expect(keyringService.removeAccount(derivedAccount.address)).rejects.toThrow(
        'Cannot remove derived accounts'
      );
    });
  });

  describe('Known Test Vectors', () => {
    it('should derive correct addresses for known seed phrase', async () => {
      await vaultService.create(TEST_PASSWORD, TEST_SEED_PHRASE);
      const seedPhrase = await vaultService.unlock(TEST_PASSWORD);
      await keyringService.initialize(seedPhrase);

      // First account should be auto-created
      const accounts = await keyringService.getAccounts();
      expect(accounts[0].address.toLowerCase()).toBe(
        '0x9858effd232b4033e47d90003d41ec34ecaeda94'
      );
      expect(accounts[0].index).toBe(0);

      // Create second account
      const account2 = await keyringService.createAccount();
      expect(account2.index).toBe(1);
      expect(account2.address).toBeTruthy();
      expect(account2.address.startsWith('0x')).toBe(true);

      // Create third account
      const account3 = await keyringService.createAccount();
      expect(account3.index).toBe(2);
      expect(account3.address).toBeTruthy();
      expect(account3.address.startsWith('0x')).toBe(true);

      // All accounts should have different addresses
      const allAccounts = await keyringService.getAccounts();
      const addresses = allAccounts.map((a) => a.address);
      const uniqueAddresses = new Set(addresses);
      expect(uniqueAddresses.size).toBe(3);
    });
  });
});
