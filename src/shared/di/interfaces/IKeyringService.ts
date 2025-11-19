/**
 * Keyring Service Interface
 *
 * Manages HD wallet accounts derived from a seed phrase.
 * Handles account creation, switching, and private key access.
 */

export interface Account {
  /** Ethereum address (0x...) */
  address: string;

  /** Account name (e.g., "Account 1") */
  name: string;

  /** Derivation path index */
  index: number;

  /** Chain type (currently only 'evm') */
  chainType: 'evm';

  /** Account creation timestamp */
  createdAt: number;
}

export interface IKeyringService {
  /**
   * Initialize keyring from unlocked vault
   * @param seedPhrase - Decrypted seed phrase from vault
   */
  initialize(seedPhrase: string): Promise<void>;

  /**
   * Check if keyring is initialized
   */
  isInitialized(): boolean;

  /**
   * Create a new account
   * @param name - Optional account name
   * @returns Created account
   */
  createAccount(name?: string): Promise<Account>;

  /**
   * Get all accounts
   */
  getAccounts(): Promise<Account[]>;

  /**
   * Get account by address
   * @param address - Ethereum address
   */
  getAccount(address: string): Promise<Account | null>;

  /**
   * Get account by index
   * @param index - Derivation path index
   */
  getAccountByIndex(index: number): Promise<Account | null>;

  /**
   * Update account name
   * @param address - Account address
   * @param name - New name
   */
  updateAccountName(address: string, name: string): Promise<void>;

  /**
   * Get private key for account
   * @param address - Account address
   * @returns Private key (hex string without 0x prefix)
   */
  getPrivateKey(address: string): Promise<string>;

  /**
   * Remove account (only for imported accounts, not derived)
   * @param address - Account address
   */
  removeAccount(address: string): Promise<void>;

  /**
   * Import account from private key
   * @param privateKey - Private key (hex string)
   * @param name - Optional account name
   * @returns Imported account
   */
  importAccount(privateKey: string, name?: string): Promise<Account>;

  /**
   * Lock keyring (clear in-memory data)
   */
  lock(): Promise<void>;

  /**
   * Export all account metadata (for backup)
   */
  exportAccounts(): Promise<Account[]>;
}
