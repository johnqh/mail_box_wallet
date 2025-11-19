/**
 * Vault Service Implementation
 *
 * Manages encrypted storage of seed phrases and sensitive data.
 * Uses CryptoService for encryption and StorageService for persistence.
 */

import { IVaultService, VaultData } from '@/shared/di/interfaces/IVaultService';
import { ICryptoService } from '@/shared/di/interfaces/ICryptoService';
import { IStorageService } from '@/shared/di/interfaces/IStorageService';

const VAULT_STORAGE_KEY = 'vault';
const SALT_STORAGE_KEY = 'vault_salt';

export class VaultService implements IVaultService {
  private seedPhrase: string | null = null;
  private unlocked: boolean = false;

  constructor(
    private crypto: ICryptoService,
    private storage: IStorageService
  ) {}

  /**
   * Create a new vault with a seed phrase
   */
  async create(password: string, seedPhrase: string): Promise<void> {
    if (await this.exists()) {
      throw new Error('Vault already exists. Delete existing vault first.');
    }

    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    if (!seedPhrase || seedPhrase.trim().split(/\s+/).length < 12) {
      throw new Error('Invalid seed phrase');
    }

    // Derive key from password
    const { key, salt } = await this.crypto.deriveKey(password);

    // Encrypt seed phrase
    const encrypted = await this.crypto.encrypt(seedPhrase, key);

    // Create vault data
    const vaultData: VaultData = {
      encrypted,
      salt,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Store vault (salt is included in vaultData)
    await this.storage.set(VAULT_STORAGE_KEY, vaultData);
    await this.storage.set(SALT_STORAGE_KEY, salt); // Also store separately for quick access

    // Keep in memory
    this.seedPhrase = seedPhrase;
    this.unlocked = true;
  }

  /**
   * Unlock the vault and return the seed phrase
   */
  async unlock(password: string): Promise<string> {
    if (this.unlocked && this.seedPhrase) {
      return this.seedPhrase;
    }

    if (!(await this.exists())) {
      throw new Error('Vault does not exist');
    }

    // Get vault data and salt
    const vaultData = await this.storage.get<VaultData>(VAULT_STORAGE_KEY);
    const salt = await this.storage.get<string>(SALT_STORAGE_KEY);

    if (!vaultData || !salt) {
      throw new Error('Vault data corrupted');
    }

    // Derive key from password using stored salt
    const { key } = await this.crypto.deriveKey(password, salt);

    // Decrypt seed phrase
    try {
      this.seedPhrase = await this.crypto.decrypt(vaultData.encrypted, key);
      this.unlocked = true;
      return this.seedPhrase;
    } catch (error) {
      throw new Error('Invalid password');
    }
  }

  /**
   * Lock the vault (clear in-memory data)
   */
  async lock(): Promise<void> {
    this.seedPhrase = null;
    this.unlocked = false;
  }

  /**
   * Check if vault exists
   */
  async exists(): Promise<boolean> {
    const vaultData = await this.storage.get<VaultData>(VAULT_STORAGE_KEY);
    return vaultData !== null;
  }

  /**
   * Check if vault is currently unlocked
   */
  isUnlocked(): boolean {
    return this.unlocked && this.seedPhrase !== null;
  }

  /**
   * Change vault password
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    if (!(await this.exists())) {
      throw new Error('Vault does not exist');
    }

    if (!newPassword || newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters');
    }

    // Lock vault to force password verification
    await this.lock();

    // Unlock with old password to get seed phrase (will throw if wrong password)
    const seedPhrase = await this.unlock(oldPassword);

    // Derive new key
    const { key: newKey, salt: newSalt } = await this.crypto.deriveKey(newPassword);

    // Encrypt with new key
    const encrypted = await this.crypto.encrypt(seedPhrase, newKey);

    // Update vault data
    const vaultData: VaultData = {
      encrypted,
      salt: newSalt,
      createdAt: (await this.storage.get<VaultData>(VAULT_STORAGE_KEY))?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    };

    // Store updated vault and new salt
    await this.storage.set(VAULT_STORAGE_KEY, vaultData);
    await this.storage.set(SALT_STORAGE_KEY, newSalt);
  }

  /**
   * Export vault data (for backup)
   */
  async export(): Promise<VaultData> {
    if (!(await this.exists())) {
      throw new Error('Vault does not exist');
    }

    const vaultData = await this.storage.get<VaultData>(VAULT_STORAGE_KEY);

    if (!vaultData) {
      throw new Error('Vault data not found');
    }

    return vaultData;
  }

  /**
   * Import vault data (from backup)
   */
  async import(vaultData: VaultData, password: string): Promise<void> {
    if (await this.exists()) {
      throw new Error('Vault already exists. Delete existing vault first.');
    }

    if (!vaultData.encrypted || !vaultData.salt || !vaultData.createdAt) {
      throw new Error('Invalid vault data');
    }

    // Derive key using the exported salt
    const { key } = await this.crypto.deriveKey(password, vaultData.salt);

    // Try to decrypt to verify password and data integrity
    try {
      const seedPhrase = await this.crypto.decrypt(vaultData.encrypted, key);

      // If decryption succeeds, store the vault
      await this.storage.set(VAULT_STORAGE_KEY, vaultData);
      await this.storage.set(SALT_STORAGE_KEY, vaultData.salt);

      this.seedPhrase = seedPhrase;
      this.unlocked = true;
    } catch (error) {
      throw new Error('Invalid password or corrupted vault data');
    }
  }

  /**
   * Delete the vault (for testing/reset)
   */
  async delete(): Promise<void> {
    await this.storage.remove(VAULT_STORAGE_KEY);
    await this.storage.remove(SALT_STORAGE_KEY);
    await this.lock();
  }
}
