/**
 * Crypto Service Interface
 *
 * Provides cryptographic operations: encryption, decryption, key derivation.
 */

export interface EncryptedData {
  ciphertext: string; // Base64 encoded
  iv: string; // Base64 encoded initialization vector
  salt: string; // Base64 encoded salt
  version: number; // Version for future migrations
}

export interface ICryptoService {
  /**
   * Derive encryption key from password using PBKDF2
   * @param password - User password
   * @param salt - Salt (hex string or will generate if not provided)
   * @param iterations - PBKDF2 iterations (default: 100000)
   * @returns Derived key (hex string) and salt (hex string)
   */
  deriveKey(
    password: string,
    salt?: string,
    iterations?: number
  ): Promise<{ key: string; salt: string }>;

  /**
   * Encrypt data using AES-256-GCM
   * @param data - Plain text data
   * @param key - Encryption key (hex string)
   * @returns Encrypted data with IV and metadata
   */
  encrypt(data: string, key: string): Promise<EncryptedData>;

  /**
   * Decrypt data using AES-256-GCM
   * @param encrypted - Encrypted data with IV
   * @param key - Decryption key (hex string)
   * @returns Decrypted plain text
   */
  decrypt(encrypted: EncryptedData, key: string): Promise<string>;

  /**
   * Generate random bytes
   * @param length - Number of bytes to generate
   * @returns Hex string of random bytes
   */
  randomBytes(length: number): Promise<string>;
}
