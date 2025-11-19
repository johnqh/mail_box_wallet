import { describe, it, expect, beforeEach } from 'vitest';
import { VaultService } from '@/shared/services/VaultService';
import { CryptoService } from '@/shared/services/CryptoService';
import { IStorageService } from '@/shared/di/interfaces/IStorageService';

// Mock Storage Service for testing
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

describe('VaultService', () => {
  let vaultService: VaultService;
  let cryptoService: CryptoService;
  let storageService: MockStorageService;

  const TEST_PASSWORD = 'TestPassword123!';
  const TEST_SEED_PHRASE =
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

  beforeEach(() => {
    cryptoService = new CryptoService();
    storageService = new MockStorageService();
    vaultService = new VaultService(cryptoService, storageService);
  });

  describe('create', () => {
    it('should create a new vault', async () => {
      await vaultService.create(TEST_PASSWORD, TEST_SEED_PHRASE);

      expect(await vaultService.exists()).toBe(true);
      expect(vaultService.isUnlocked()).toBe(true);
    });

    it('should reject weak passwords', async () => {
      await expect(vaultService.create('short', TEST_SEED_PHRASE)).rejects.toThrow(
        'Password must be at least 8 characters'
      );
    });

    it('should reject invalid seed phrases', async () => {
      await expect(vaultService.create(TEST_PASSWORD, 'invalid')).rejects.toThrow(
        'Invalid seed phrase'
      );
    });

    it('should reject creating vault when one already exists', async () => {
      await vaultService.create(TEST_PASSWORD, TEST_SEED_PHRASE);

      await expect(
        vaultService.create(TEST_PASSWORD, TEST_SEED_PHRASE)
      ).rejects.toThrow('Vault already exists');
    });

    it('should store encrypted data', async () => {
      await vaultService.create(TEST_PASSWORD, TEST_SEED_PHRASE);

      const keys = await storageService.keys();
      expect(keys).toContain('vault');
      expect(keys).toContain('vault_salt');
    });
  });

  describe('unlock', () => {
    beforeEach(async () => {
      await vaultService.create(TEST_PASSWORD, TEST_SEED_PHRASE);
      await vaultService.lock();
    });

    it('should unlock vault with correct password', async () => {
      const seedPhrase = await vaultService.unlock(TEST_PASSWORD);

      expect(seedPhrase).toBe(TEST_SEED_PHRASE);
      expect(vaultService.isUnlocked()).toBe(true);
    });

    it('should reject incorrect password', async () => {
      await expect(vaultService.unlock('WrongPassword123!')).rejects.toThrow(
        'Invalid password'
      );
    });

    it('should fail to unlock non-existent vault', async () => {
      const emptyVault = new VaultService(cryptoService, new MockStorageService());

      await expect(emptyVault.unlock(TEST_PASSWORD)).rejects.toThrow(
        'Vault does not exist'
      );
    });

    it('should return cached seed phrase if already unlocked', async () => {
      const seedPhrase1 = await vaultService.unlock(TEST_PASSWORD);
      const seedPhrase2 = await vaultService.unlock(TEST_PASSWORD);

      expect(seedPhrase1).toBe(seedPhrase2);
      expect(vaultService.isUnlocked()).toBe(true);
    });
  });

  describe('lock', () => {
    beforeEach(async () => {
      await vaultService.create(TEST_PASSWORD, TEST_SEED_PHRASE);
    });

    it('should lock the vault', async () => {
      expect(vaultService.isUnlocked()).toBe(true);

      await vaultService.lock();

      expect(vaultService.isUnlocked()).toBe(false);
    });

    it('should clear in-memory seed phrase', async () => {
      await vaultService.lock();

      // Should need to unlock again to get seed phrase
      const seedPhrase = await vaultService.unlock(TEST_PASSWORD);
      expect(seedPhrase).toBe(TEST_SEED_PHRASE);
    });
  });

  describe('exists', () => {
    it('should return false for non-existent vault', async () => {
      expect(await vaultService.exists()).toBe(false);
    });

    it('should return true for existing vault', async () => {
      await vaultService.create(TEST_PASSWORD, TEST_SEED_PHRASE);

      expect(await vaultService.exists()).toBe(true);
    });
  });

  describe('isUnlocked', () => {
    it('should return false when locked', async () => {
      await vaultService.create(TEST_PASSWORD, TEST_SEED_PHRASE);
      await vaultService.lock();

      expect(vaultService.isUnlocked()).toBe(false);
    });

    it('should return true when unlocked', async () => {
      await vaultService.create(TEST_PASSWORD, TEST_SEED_PHRASE);

      expect(vaultService.isUnlocked()).toBe(true);
    });
  });

  describe('changePassword', () => {
    beforeEach(async () => {
      await vaultService.create(TEST_PASSWORD, TEST_SEED_PHRASE);
    });

    it('should change password successfully', async () => {
      const newPassword = 'NewPassword456!';

      await vaultService.changePassword(TEST_PASSWORD, newPassword);

      // Lock and try unlocking with new password
      await vaultService.lock();
      const seedPhrase = await vaultService.unlock(newPassword);

      expect(seedPhrase).toBe(TEST_SEED_PHRASE);
    });

    it('should reject old password after change', async () => {
      const newPassword = 'NewPassword456!';

      await vaultService.changePassword(TEST_PASSWORD, newPassword);
      await vaultService.lock();

      await expect(vaultService.unlock(TEST_PASSWORD)).rejects.toThrow(
        'Invalid password'
      );
    });

    it('should reject weak new passwords', async () => {
      await expect(vaultService.changePassword(TEST_PASSWORD, 'short')).rejects.toThrow(
        'New password must be at least 8 characters'
      );
    });

    it('should reject incorrect old password', async () => {
      await expect(
        vaultService.changePassword('WrongPassword!', 'NewPassword456!')
      ).rejects.toThrow('Invalid password');
    });

    it('should fail on non-existent vault', async () => {
      const emptyVault = new VaultService(cryptoService, new MockStorageService());

      await expect(
        emptyVault.changePassword(TEST_PASSWORD, 'NewPassword456!')
      ).rejects.toThrow('Vault does not exist');
    });
  });

  describe('export', () => {
    beforeEach(async () => {
      await vaultService.create(TEST_PASSWORD, TEST_SEED_PHRASE);
    });

    it('should export vault data', async () => {
      const vaultData = await vaultService.export();

      expect(vaultData).toBeDefined();
      expect(vaultData.encrypted).toBeDefined();
      expect(vaultData.encrypted.ciphertext).toBeDefined();
      expect(vaultData.encrypted.iv).toBeDefined();
      expect(vaultData.createdAt).toBeDefined();
      expect(vaultData.updatedAt).toBeDefined();
    });

    it('should fail to export non-existent vault', async () => {
      const emptyVault = new VaultService(cryptoService, new MockStorageService());

      await expect(emptyVault.export()).rejects.toThrow('Vault does not exist');
    });
  });

  describe('import', () => {
    it('should import vault data', async () => {
      // Create and export from one vault
      await vaultService.create(TEST_PASSWORD, TEST_SEED_PHRASE);
      const exportedData = await vaultService.export();

      // Import into new vault
      const newStorage = new MockStorageService();
      const newVault = new VaultService(cryptoService, newStorage);

      await newVault.import(exportedData, TEST_PASSWORD);

      expect(await newVault.exists()).toBe(true);
      expect(newVault.isUnlocked()).toBe(true);
    });

    it('should decrypt seed phrase after import', async () => {
      // Create and export
      await vaultService.create(TEST_PASSWORD, TEST_SEED_PHRASE);
      const exportedData = await vaultService.export();

      // Import into new vault
      const newStorage = new MockStorageService();
      const newVault = new VaultService(cryptoService, newStorage);
      await newVault.import(exportedData, TEST_PASSWORD);

      // Lock and unlock to verify
      await newVault.lock();
      const seedPhrase = await newVault.unlock(TEST_PASSWORD);

      expect(seedPhrase).toBe(TEST_SEED_PHRASE);
    });

    it('should reject import when vault already exists', async () => {
      await vaultService.create(TEST_PASSWORD, TEST_SEED_PHRASE);
      const exportedData = await vaultService.export();

      await expect(vaultService.import(exportedData, TEST_PASSWORD)).rejects.toThrow(
        'Vault already exists'
      );
    });

    it('should reject invalid vault data', async () => {
      const invalidData = {
        encrypted: {} as any,
        createdAt: 0,
        updatedAt: 0,
      };

      await expect(vaultService.import(invalidData, TEST_PASSWORD)).rejects.toThrow();
    });
  });

  describe('Full workflow', () => {
    it('should handle complete vault lifecycle', async () => {
      // 1. Create vault
      await vaultService.create(TEST_PASSWORD, TEST_SEED_PHRASE);
      expect(vaultService.isUnlocked()).toBe(true);

      // 2. Lock vault
      await vaultService.lock();
      expect(vaultService.isUnlocked()).toBe(false);

      // 3. Unlock vault
      const seedPhrase = await vaultService.unlock(TEST_PASSWORD);
      expect(seedPhrase).toBe(TEST_SEED_PHRASE);
      expect(vaultService.isUnlocked()).toBe(true);

      // 4. Change password
      const newPassword = 'NewPassword456!';
      await vaultService.changePassword(TEST_PASSWORD, newPassword);

      // 5. Lock and unlock with new password
      await vaultService.lock();
      const seedPhrase2 = await vaultService.unlock(newPassword);
      expect(seedPhrase2).toBe(TEST_SEED_PHRASE);

      // 6. Export vault
      const exportedData = await vaultService.export();
      expect(exportedData).toBeDefined();

      // 7. Import into new vault
      const newStorage = new MockStorageService();
      const newVault = new VaultService(cryptoService, newStorage);
      await newVault.import(exportedData, newPassword);

      const seedPhrase3 = await newVault.unlock(newPassword);
      expect(seedPhrase3).toBe(TEST_SEED_PHRASE);
    });
  });
});
