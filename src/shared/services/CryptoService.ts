/**
 * Crypto Service Implementation
 *
 * Provides cryptographic operations using @noble libraries:
 * - PBKDF2 for key derivation
 * - AES-256-GCM for encryption/decryption
 */

import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { gcm } from '@noble/ciphers/aes.js';
import { randomBytes as cryptoRandomBytes } from '@noble/hashes/utils.js';
import { ICryptoService, EncryptedData } from '@/shared/di/interfaces/ICryptoService';

export class CryptoService implements ICryptoService {
  private readonly PBKDF2_ITERATIONS = 100000; // Default iterations
  private readonly KEY_LENGTH = 32; // 256 bits for AES-256
  private readonly SALT_LENGTH = 16; // 128 bits
  private readonly IV_LENGTH = 12; // 96 bits for GCM

  /**
   * Derive encryption key from password using PBKDF2-SHA256
   */
  async deriveKey(
    password: string,
    salt?: string,
    iterations?: number
  ): Promise<{ key: string; salt: string }> {
    // Generate or decode salt
    const saltBytes = salt
      ? this.hexToBytes(salt)
      : cryptoRandomBytes(this.SALT_LENGTH);

    // Derive key using PBKDF2
    const keyBytes = pbkdf2(
      sha256,
      password,
      saltBytes,
      {
        c: iterations || this.PBKDF2_ITERATIONS,
        dkLen: this.KEY_LENGTH,
      }
    );

    return {
      key: this.bytesToHex(keyBytes),
      salt: this.bytesToHex(saltBytes),
    };
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  async encrypt(data: string, key: string): Promise<EncryptedData> {
    // Generate random IV
    const iv = cryptoRandomBytes(this.IV_LENGTH);

    // Convert key and data to bytes
    const keyBytes = this.hexToBytes(key);
    const dataBytes = new TextEncoder().encode(data);

    // Create AES-GCM cipher
    const cipher = gcm(keyBytes, iv);

    // Encrypt (includes authentication tag)
    const ciphertext = cipher.encrypt(dataBytes);

    // Return base64-encoded data
    return {
      ciphertext: this.bytesToBase64(ciphertext),
      iv: this.bytesToBase64(iv),
      salt: '', // Salt is stored separately in derivation
      version: 1,
    };
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  async decrypt(encrypted: EncryptedData, key: string): Promise<string> {
    try {
      // Decode base64 data
      const ciphertext = this.base64ToBytes(encrypted.ciphertext);
      const iv = this.base64ToBytes(encrypted.iv);
      const keyBytes = this.hexToBytes(key);

      // Create AES-GCM cipher
      const cipher = gcm(keyBytes, iv);

      // Decrypt (will throw if authentication fails)
      const plaintext = cipher.decrypt(ciphertext);

      // Convert to string
      return new TextDecoder().decode(plaintext);
    } catch (error) {
      throw new Error('Decryption failed: Invalid password or corrupted data');
    }
  }

  /**
   * Generate random bytes
   */
  async randomBytes(length: number): Promise<string> {
    const bytes = cryptoRandomBytes(length);
    return this.bytesToHex(bytes);
  }

  // ========== Helper Methods ==========

  private bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    }
    return bytes;
  }

  private bytesToBase64(bytes: Uint8Array): string {
    return btoa(String.fromCharCode(...bytes));
  }

  private base64ToBytes(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}
