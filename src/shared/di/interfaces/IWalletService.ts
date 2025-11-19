/**
 * Wallet Service Interface
 *
 * Manages seed phrase generation, validation, and key derivation.
 */

export interface IWalletService {
  /**
   * Generate a new BIP-39 seed phrase
   * @param wordCount - Number of words (12 or 24)
   * @returns BIP-39 mnemonic phrase
   */
  generateSeedPhrase(wordCount?: 12 | 24): Promise<string>;

  /**
   * Validate a BIP-39 seed phrase
   * @param seedPhrase - Mnemonic to validate
   * @returns True if valid
   */
  validateSeedPhrase(seedPhrase: string): Promise<boolean>;

  /**
   * Convert seed phrase to seed bytes
   * @param seedPhrase - BIP-39 mnemonic
   * @param password - Optional passphrase (BIP-39 extension)
   * @returns 64-byte seed
   */
  seedPhraseToSeed(seedPhrase: string, password?: string): Promise<Uint8Array>;

  /**
   * Derive a private key from seed using BIP-32/BIP-44
   * @param seed - Seed bytes from seedPhraseToSeed
   * @param path - Derivation path (e.g., "m/44'/60'/0'/0/0")
   * @returns Private key hex string
   */
  derivePrivateKey(seed: Uint8Array, path: string): Promise<string>;

  /**
   * Get Ethereum address from private key
   * @param privateKey - Private key hex string
   * @returns Ethereum address (0x...)
   */
  getAddress(privateKey: string): Promise<string>;
}
