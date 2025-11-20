/**
 * Keyring Service Implementation
 *
 * Manages HD wallet accounts derived from a seed phrase.
 * Supports both derived accounts (from seed) and imported accounts (from private key).
 */

import { IKeyringService, Account } from '@/shared/di/interfaces/IKeyringService';
import { IWalletService } from '@/shared/di/interfaces/IWalletService';
import { IStorageService } from '@/shared/di/interfaces/IStorageService';

const ACCOUNTS_STORAGE_KEY = 'accounts';
const IMPORTED_KEYS_STORAGE_KEY = 'imported_keys';
const DERIVATION_PATH_PREFIX = "m/44'/60'/0'/0/";

interface ImportedKey {
  address: string;
  privateKey: string; // Encrypted in production, plain in memory
}

export class KeyringService implements IKeyringService {
  private initialized: boolean = false;
  private seed: Uint8Array | null = null;
  private accounts: Account[] = [];
  private importedKeys: Map<string, string> = new Map(); // address -> privateKey

  constructor(
    private walletService: IWalletService,
    private storage: IStorageService
  ) {}

  /**
   * Initialize keyring from unlocked vault
   */
  async initialize(seedPhrase: string): Promise<void> {
    // Convert seed phrase to seed
    this.seed = await this.walletService.seedPhraseToSeed(seedPhrase);

    // Load accounts from storage
    const storedAccounts = await this.storage.get<Account[]>(ACCOUNTS_STORAGE_KEY);
    this.accounts = storedAccounts || [];

    // Load imported keys
    const storedKeys = await this.storage.get<ImportedKey[]>(IMPORTED_KEYS_STORAGE_KEY);
    if (storedKeys) {
      storedKeys.forEach(({ address, privateKey }) => {
        this.importedKeys.set(address.toLowerCase(), privateKey);
      });
    }

    // Mark as initialized before creating accounts
    this.initialized = true;

    // If no accounts exist, create first account
    if (this.accounts.length === 0) {
      await this.createAccount('Account 1');
    }
  }

  /**
   * Check if keyring is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Create a new derived account
   */
  async createAccount(name?: string): Promise<Account> {
    if (!this.initialized || !this.seed) {
      throw new Error('Keyring not initialized');
    }

    // Find next available index
    const derivedAccounts = this.accounts.filter((a) => a.index >= 0);
    const nextIndex = derivedAccounts.length > 0
      ? Math.max(...derivedAccounts.map((a) => a.index)) + 1
      : 0;

    // Derive private key
    const path = DERIVATION_PATH_PREFIX + nextIndex;
    const privateKey = await this.walletService.derivePrivateKey(this.seed, path);

    // Get address
    const address = await this.walletService.getAddress(privateKey);

    // Create account
    const account: Account = {
      address,
      name: name || `Account ${nextIndex + 1}`,
      index: nextIndex,
      chainType: 'evm',
      createdAt: Date.now(),
    };

    // Store account
    this.accounts.push(account);
    await this.saveAccounts();

    return account;
  }

  /**
   * Get all accounts
   */
  async getAccounts(): Promise<Account[]> {
    // If accounts are empty, try loading from storage
    // This handles the case where popup unlocked but background keyring wasn't initialized
    if (this.accounts.length === 0) {
      const storedAccounts = await this.storage.get<Account[]>(ACCOUNTS_STORAGE_KEY);
      if (storedAccounts && storedAccounts.length > 0) {
        return [...storedAccounts];
      }
    }
    return [...this.accounts];
  }

  /**
   * Get account by address
   */
  async getAccount(address: string): Promise<Account | null> {
    // First check in-memory accounts
    const account = this.accounts.find((a) => a.address.toLowerCase() === address.toLowerCase());
    if (account) {
      return account;
    }

    // If not found and accounts array is empty, try loading from storage
    // This handles the case where popup unlocked but background keyring wasn't initialized
    if (this.accounts.length === 0) {
      const storedAccounts = await this.storage.get<Account[]>(ACCOUNTS_STORAGE_KEY);
      if (storedAccounts && storedAccounts.length > 0) {
        return storedAccounts.find((a) => a.address.toLowerCase() === address.toLowerCase()) || null;
      }
    }

    return null;
  }

  /**
   * Get account by index
   */
  async getAccountByIndex(index: number): Promise<Account | null> {
    return this.accounts.find((a) => a.index === index) || null;
  }

  /**
   * Update account name
   */
  async updateAccountName(address: string, name: string): Promise<void> {
    const account = await this.getAccount(address);
    if (!account) {
      throw new Error('Account not found');
    }

    account.name = name;
    await this.saveAccounts();
  }

  /**
   * Get private key for account
   */
  async getPrivateKey(address: string): Promise<string> {
    if (!this.initialized) {
      throw new Error('Keyring not initialized');
    }

    const normalizedAddress = address.toLowerCase();

    // Check if it's an imported account
    if (this.importedKeys.has(normalizedAddress)) {
      return this.importedKeys.get(normalizedAddress)!;
    }

    // Must be a derived account
    const account = await this.getAccount(address);
    if (!account) {
      throw new Error('Account not found');
    }

    if (account.index < 0) {
      throw new Error('Cannot derive private key for imported account without stored key');
    }

    // Derive private key from seed
    if (!this.seed) {
      throw new Error('Seed not available');
    }

    const path = DERIVATION_PATH_PREFIX + account.index;
    const privateKey = await this.walletService.derivePrivateKey(this.seed, path);

    return privateKey;
  }

  /**
   * Import account from private key
   */
  async importAccount(privateKey: string, name?: string): Promise<Account> {
    if (!this.initialized) {
      throw new Error('Keyring not initialized');
    }

    // Remove 0x prefix if present
    const cleanPrivateKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;

    // Validate private key length
    if (cleanPrivateKey.length !== 64) {
      throw new Error('Invalid private key length');
    }

    // Get address from private key
    const address = await this.walletService.getAddress(cleanPrivateKey);

    // Check if account already exists
    if (await this.getAccount(address)) {
      throw new Error('Account already exists');
    }

    // Create account with index -1 to indicate imported
    const account: Account = {
      address,
      name: name || `Imported ${this.accounts.filter((a) => a.index === -1).length + 1}`,
      index: -1, // -1 indicates imported account
      chainType: 'evm',
      createdAt: Date.now(),
    };

    // Store account and private key
    this.accounts.push(account);
    this.importedKeys.set(address.toLowerCase(), cleanPrivateKey);

    await this.saveAccounts();
    await this.saveImportedKeys();

    return account;
  }

  /**
   * Remove account
   */
  async removeAccount(address: string): Promise<void> {
    const account = await this.getAccount(address);
    if (!account) {
      throw new Error('Account not found');
    }

    // Can only remove imported accounts
    if (account.index >= 0) {
      throw new Error('Cannot remove derived accounts');
    }

    // Remove from accounts list
    this.accounts = this.accounts.filter(
      (a) => a.address.toLowerCase() !== address.toLowerCase()
    );

    // Remove private key
    this.importedKeys.delete(address.toLowerCase());

    await this.saveAccounts();
    await this.saveImportedKeys();
  }

  /**
   * Lock keyring
   */
  async lock(): Promise<void> {
    this.initialized = false;
    this.seed = null;
    this.accounts = [];
    this.importedKeys.clear();
  }

  /**
   * Export all account metadata
   */
  async exportAccounts(): Promise<Account[]> {
    return [...this.accounts];
  }

  // ========== Private Methods ==========

  private async saveAccounts(): Promise<void> {
    await this.storage.set(ACCOUNTS_STORAGE_KEY, this.accounts);
  }

  private async saveImportedKeys(): Promise<void> {
    const keys: ImportedKey[] = Array.from(this.importedKeys.entries()).map(
      ([address, privateKey]) => ({
        address,
        privateKey,
      })
    );
    await this.storage.set(IMPORTED_KEYS_STORAGE_KEY, keys);
  }
}
