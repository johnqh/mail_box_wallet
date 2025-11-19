/**
 * Vault Service Interface
 *
 * Manages encrypted storage of seed phrases and sensitive data.
 */

import { EncryptedData } from './ICryptoService';

export interface VaultData {
  encrypted: EncryptedData;
  salt: string; // PBKDF2 salt used for key derivation
  createdAt: number;
  updatedAt: number;
}

export interface IVaultService {
  /**
   * Create a new vault with a seed phrase
   * @param password - Password to encrypt the vault
   * @param seedPhrase - Seed phrase to store
   */
  create(password: string, seedPhrase: string): Promise<void>;

  /**
   * Unlock the vault and return the seed phrase
   * @param password - Password to decrypt the vault
   * @returns Decrypted seed phrase
   */
  unlock(password: string): Promise<string>;

  /**
   * Lock the vault (clear in-memory data)
   */
  lock(): Promise<void>;

  /**
   * Check if vault exists
   */
  exists(): Promise<boolean>;

  /**
   * Check if vault is currently unlocked
   */
  isUnlocked(): boolean;

  /**
   * Change vault password
   * @param oldPassword - Current password
   * @param newPassword - New password
   */
  changePassword(oldPassword: string, newPassword: string): Promise<void>;

  /**
   * Export vault data (for backup)
   */
  export(): Promise<VaultData>;

  /**
   * Import vault data (from backup)
   * @param vaultData - Vault data to import
   * @param password - Password to verify import
   */
  import(vaultData: VaultData, password: string): Promise<void>;
}
