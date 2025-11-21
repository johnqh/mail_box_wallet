import { describe, it, expect, beforeEach } from 'vitest';
import { KeyringService } from '@/shared/services/KeyringService';
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

describe('KeyringService', () => {
  let keyringService: KeyringService;
  let walletService: WalletService;
  let storageService: MockStorageService;

  // Use a known test seed phrase for consistency
  const TEST_SEED_PHRASE =
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

  beforeEach(() => {
    walletService = new WalletService();
    storageService = new MockStorageService();
    keyringService = new KeyringService(walletService, storageService);
  });

  describe('initialize', () => {
    it('should initialize keyring with seed phrase', async () => {
      await keyringService.initialize(TEST_SEED_PHRASE);

      expect(keyringService.isInitialized()).toBe(true);
    });

    it('should create first account automatically', async () => {
      await keyringService.initialize(TEST_SEED_PHRASE);

      const accounts = await keyringService.getAccounts();
      expect(accounts).toHaveLength(1);
      expect(accounts[0].name).toBe('Account 1');
      expect(accounts[0].index).toBe(0);
    });

    it('should derive correct address for known seed', async () => {
      await keyringService.initialize(TEST_SEED_PHRASE);

      const accounts = await keyringService.getAccounts();
      // Known address for this test seed phrase at index 0
      expect(accounts[0].address.toLowerCase()).toBe('0x9858effd232b4033e47d90003d41ec34ecaeda94');
    });

    it('should load existing accounts from storage', async () => {
      // Initialize first time
      await keyringService.initialize(TEST_SEED_PHRASE);
      await keyringService.createAccount('Account 2');

      // Create new keyring instance
      const newKeyring = new KeyringService(walletService, storageService);
      await newKeyring.initialize(TEST_SEED_PHRASE);

      const accounts = await newKeyring.getAccounts();
      expect(accounts).toHaveLength(2);
      expect(accounts[1].name).toBe('Account 2');
    });
  });

  describe('isInitialized', () => {
    it('should return false before initialization', () => {
      expect(keyringService.isInitialized()).toBe(false);
    });

    it('should return true after initialization', async () => {
      await keyringService.initialize(TEST_SEED_PHRASE);

      expect(keyringService.isInitialized()).toBe(true);
    });

    it('should return false after lock', async () => {
      await keyringService.initialize(TEST_SEED_PHRASE);
      await keyringService.lock();

      expect(keyringService.isInitialized()).toBe(false);
    });
  });

  describe('createAccount', () => {
    beforeEach(async () => {
      await keyringService.initialize(TEST_SEED_PHRASE);
    });

    it('should create account with custom name', async () => {
      const account = await keyringService.createAccount('My Account');

      expect(account.name).toBe('My Account');
      expect(account.index).toBe(1); // First account is index 0
      expect(account.chainType).toBe('evm');
    });

    it('should create account with default name', async () => {
      const account = await keyringService.createAccount();

      expect(account.name).toBe('Account 2');
    });

    it('should create multiple accounts with sequential indexes', async () => {
      const account2 = await keyringService.createAccount();
      const account3 = await keyringService.createAccount();

      expect(account2.index).toBe(1);
      expect(account3.index).toBe(2);
    });

    it('should derive different addresses for each account', async () => {
      const account1 = (await keyringService.getAccounts())[0];
      const account2 = await keyringService.createAccount();

      expect(account1.address).not.toBe(account2.address);
    });

    it('should throw error if not initialized', async () => {
      const uninitializedKeyring = new KeyringService(walletService, storageService);

      await expect(uninitializedKeyring.createAccount()).rejects.toThrow(
        'Keyring not initialized'
      );
    });

    it('should persist accounts to storage', async () => {
      await keyringService.createAccount('Test');

      // Create new keyring and verify account is loaded
      const newKeyring = new KeyringService(walletService, storageService);
      await newKeyring.initialize(TEST_SEED_PHRASE);

      const accounts = await newKeyring.getAccounts();
      expect(accounts.some((a) => a.name === 'Test')).toBe(true);
    });
  });

  describe('getAccounts', () => {
    beforeEach(async () => {
      await keyringService.initialize(TEST_SEED_PHRASE);
    });

    it('should return all accounts', async () => {
      await keyringService.createAccount('Account 2');
      await keyringService.createAccount('Account 3');

      const accounts = await keyringService.getAccounts();

      expect(accounts).toHaveLength(3);
    });

    it('should return copy of accounts array', async () => {
      const accounts1 = await keyringService.getAccounts();
      const accounts2 = await keyringService.getAccounts();

      expect(accounts1).not.toBe(accounts2); // Different array references
      expect(accounts1).toEqual(accounts2); // Same content
    });
  });

  describe('getAccount', () => {
    beforeEach(async () => {
      await keyringService.initialize(TEST_SEED_PHRASE);
    });

    it('should get account by address', async () => {
      const accounts = await keyringService.getAccounts();
      const address = accounts[0].address;

      const account = await keyringService.getAccount(address);

      expect(account).not.toBeNull();
      expect(account?.address).toBe(address);
    });

    it('should be case-insensitive', async () => {
      const accounts = await keyringService.getAccounts();
      const address = accounts[0].address;

      const accountLower = await keyringService.getAccount(address.toLowerCase());
      const accountUpper = await keyringService.getAccount(address.toUpperCase());

      expect(accountLower).not.toBeNull();
      expect(accountUpper).not.toBeNull();
      expect(accountLower?.address).toBe(accountUpper?.address);
    });

    it('should return null for non-existent address', async () => {
      const account = await keyringService.getAccount('0x0000000000000000000000000000000000000000');

      expect(account).toBeNull();
    });
  });

  describe('getAccountByIndex', () => {
    beforeEach(async () => {
      await keyringService.initialize(TEST_SEED_PHRASE);
      await keyringService.createAccount();
      await keyringService.createAccount();
    });

    it('should get account by index', async () => {
      const account = await keyringService.getAccountByIndex(1);

      expect(account).not.toBeNull();
      expect(account?.index).toBe(1);
    });

    it('should return null for non-existent index', async () => {
      const account = await keyringService.getAccountByIndex(999);

      expect(account).toBeNull();
    });
  });

  describe('updateAccountName', () => {
    beforeEach(async () => {
      await keyringService.initialize(TEST_SEED_PHRASE);
    });

    it('should update account name', async () => {
      const accounts = await keyringService.getAccounts();
      const address = accounts[0].address;

      await keyringService.updateAccountName(address, 'New Name');

      const account = await keyringService.getAccount(address);
      expect(account?.name).toBe('New Name');
    });

    it('should persist name change', async () => {
      const accounts = await keyringService.getAccounts();
      const address = accounts[0].address;

      await keyringService.updateAccountName(address, 'Persistent');

      // Create new keyring and verify
      const newKeyring = new KeyringService(walletService, storageService);
      await newKeyring.initialize(TEST_SEED_PHRASE);

      const account = await newKeyring.getAccount(address);
      expect(account?.name).toBe('Persistent');
    });

    it('should throw error for non-existent account', async () => {
      await expect(
        keyringService.updateAccountName('0x0000000000000000000000000000000000000000', 'Name')
      ).rejects.toThrow('Account not found');
    });
  });

  describe('getPrivateKey', () => {
    beforeEach(async () => {
      await keyringService.initialize(TEST_SEED_PHRASE);
    });

    it('should get private key for derived account', async () => {
      const accounts = await keyringService.getAccounts();
      const address = accounts[0].address;

      const privateKey = await keyringService.getPrivateKey(address);

      expect(privateKey).toBeDefined();
      expect(privateKey).toHaveLength(64); // 32 bytes = 64 hex chars
    });

    it('should derive same private key for same account', async () => {
      const accounts = await keyringService.getAccounts();
      const address = accounts[0].address;

      const pk1 = await keyringService.getPrivateKey(address);
      const pk2 = await keyringService.getPrivateKey(address);

      expect(pk1).toBe(pk2);
    });

    it('should derive different private keys for different accounts', async () => {
      await keyringService.createAccount();
      const accounts = await keyringService.getAccounts();

      const pk1 = await keyringService.getPrivateKey(accounts[0].address);
      const pk2 = await keyringService.getPrivateKey(accounts[1].address);

      expect(pk1).not.toBe(pk2);
    });

    it('should throw error for non-existent account', async () => {
      await expect(
        keyringService.getPrivateKey('0x0000000000000000000000000000000000000000')
      ).rejects.toThrow('Account not found');
    });

    it('should throw error if not initialized', async () => {
      const accounts = await keyringService.getAccounts();
      await keyringService.lock();

      await expect(keyringService.getPrivateKey(accounts[0].address)).rejects.toThrow(
        'Keyring not initialized'
      );
    });
  });

  describe('importAccount', () => {
    beforeEach(async () => {
      await keyringService.initialize(TEST_SEED_PHRASE);
    });

    it('should import account from private key', async () => {
      const privateKey = '4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318';

      const account = await keyringService.importAccount(privateKey, 'Imported');

      expect(account.name).toBe('Imported');
      expect(account.index).toBe(-1); // -1 indicates imported
      expect(account.address.toLowerCase()).toBe('0x2c7536e3605d9c16a7a3d7b1898e529396a65c23');
    });

    it('should handle private key with 0x prefix', async () => {
      const privateKey = '0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318';

      const account = await keyringService.importAccount(privateKey);

      expect(account.address.toLowerCase()).toBe('0x2c7536e3605d9c16a7a3d7b1898e529396a65c23');
    });

    it('should generate default name for imported account', async () => {
      const pk1 = '4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318';
      const pk2 = '3c9229289a6125f7fdf1885a77bb12c37a8d3b4962d936f7e3084dece32a3ca1';

      const account1 = await keyringService.importAccount(pk1);
      const account2 = await keyringService.importAccount(pk2);

      expect(account1.name).toBe('Imported 1');
      expect(account2.name).toBe('Imported 2');
    });

    it('should retrieve private key for imported account', async () => {
      const privateKey = '4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318';

      const account = await keyringService.importAccount(privateKey);
      const retrievedKey = await keyringService.getPrivateKey(account.address);

      expect(retrievedKey).toBe(privateKey);
    });

    it('should persist imported account', async () => {
      const privateKey = '4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318';

      await keyringService.importAccount(privateKey, 'Test');

      // Create new keyring and verify
      const newKeyring = new KeyringService(walletService, storageService);
      await newKeyring.initialize(TEST_SEED_PHRASE);

      const accounts = await newKeyring.getAccounts();
      expect(accounts.some((a) => a.name === 'Test')).toBe(true);
    });

    it('should throw error for invalid private key length', async () => {
      await expect(keyringService.importAccount('short')).rejects.toThrow(
        'Invalid private key length'
      );
    });

    it('should throw error for duplicate account', async () => {
      const privateKey = '4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318';

      await keyringService.importAccount(privateKey);

      await expect(keyringService.importAccount(privateKey)).rejects.toThrow(
        'Account already exists'
      );
    });
  });

  describe('removeAccount', () => {
    beforeEach(async () => {
      await keyringService.initialize(TEST_SEED_PHRASE);
    });

    it('should remove imported account', async () => {
      const privateKey = '4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318';
      const account = await keyringService.importAccount(privateKey);

      await keyringService.removeAccount(account.address);

      const retrieved = await keyringService.getAccount(account.address);
      expect(retrieved).toBeNull();
    });

    it('should throw error when removing derived account', async () => {
      const accounts = await keyringService.getAccounts();
      const address = accounts[0].address;

      await expect(keyringService.removeAccount(address)).rejects.toThrow(
        'Cannot remove derived accounts'
      );
    });

    it('should throw error for non-existent account', async () => {
      await expect(
        keyringService.removeAccount('0x0000000000000000000000000000000000000000')
      ).rejects.toThrow('Account not found');
    });
  });

  describe('lock', () => {
    beforeEach(async () => {
      await keyringService.initialize(TEST_SEED_PHRASE);
    });

    it('should clear in-memory data', async () => {
      await keyringService.lock();

      expect(keyringService.isInitialized()).toBe(false);
      // Note: getAccounts() still returns accounts from storage after lock
      // In-memory state (isInitialized) is properly cleared
    });

    it('should not clear storage', async () => {
      await keyringService.createAccount('Test');
      await keyringService.lock();

      // Accounts should still be in storage
      const newKeyring = new KeyringService(walletService, storageService);
      await newKeyring.initialize(TEST_SEED_PHRASE);

      const accounts = await newKeyring.getAccounts();
      expect(accounts.length).toBeGreaterThan(0);
    });
  });

  describe('exportAccounts', () => {
    beforeEach(async () => {
      await keyringService.initialize(TEST_SEED_PHRASE);
    });

    it('should export all accounts', async () => {
      await keyringService.createAccount('Account 2');
      await keyringService.createAccount('Account 3');

      const exported = await keyringService.exportAccounts();

      expect(exported).toHaveLength(3);
      expect(exported[0].name).toBe('Account 1');
    });
  });

  describe('Full workflow', () => {
    it('should handle complete account lifecycle', async () => {
      // Initialize
      await keyringService.initialize(TEST_SEED_PHRASE);
      expect(keyringService.isInitialized()).toBe(true);

      // Create accounts
      const account2 = await keyringService.createAccount('My Wallet');
      const account3 = await keyringService.createAccount();

      // Import account
      const imported = await keyringService.importAccount(
        '4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318',
        'Imported Wallet'
      );

      // Verify all accounts exist
      const accounts = await keyringService.getAccounts();
      expect(accounts).toHaveLength(4);

      // Get private keys
      const pk1 = await keyringService.getPrivateKey(account2.address);
      const pkImported = await keyringService.getPrivateKey(imported.address);
      expect(pk1).toBeDefined();
      expect(pkImported).toBe('4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318');

      // Update name
      await keyringService.updateAccountName(account3.address, 'Renamed');
      const updated = await keyringService.getAccount(account3.address);
      expect(updated?.name).toBe('Renamed');

      // Remove imported account
      await keyringService.removeAccount(imported.address);
      const finalAccounts = await keyringService.getAccounts();
      expect(finalAccounts).toHaveLength(3);

      // Lock
      await keyringService.lock();
      expect(keyringService.isInitialized()).toBe(false);

      // Unlock and verify persistence
      await keyringService.initialize(TEST_SEED_PHRASE);
      const reloadedAccounts = await keyringService.getAccounts();
      expect(reloadedAccounts).toHaveLength(3);
      expect(reloadedAccounts.some((a) => a.name === 'Renamed')).toBe(true);
    });
  });
});
