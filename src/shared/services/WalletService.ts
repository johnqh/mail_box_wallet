/**
 * Wallet Service Implementation
 *
 * Provides HD wallet functionality using BIP-39/BIP-32:
 * - BIP-39 seed phrase generation and validation
 * - BIP-32 hierarchical deterministic key derivation
 * - Ethereum address generation
 */

import { generateMnemonic, mnemonicToSeed, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { HDKey } from '@scure/bip32';
import { keccak_256 } from '@noble/hashes/sha3.js';
import { IWalletService } from '@/shared/di/interfaces/IWalletService';

export class WalletService implements IWalletService {
  /**
   * Generate a new BIP-39 seed phrase
   */
  async generateSeedPhrase(wordCount: 12 | 24 = 12): Promise<string> {
    // BIP-39 uses entropy: 128 bits (12 words) or 256 bits (24 words)
    const strength = wordCount === 12 ? 128 : 256;
    const mnemonic = generateMnemonic(wordlist, strength);
    return mnemonic;
  }

  /**
   * Validate a BIP-39 seed phrase
   */
  async validateSeedPhrase(seedPhrase: string): Promise<boolean> {
    try {
      return validateMnemonic(seedPhrase, wordlist);
    } catch {
      return false;
    }
  }

  /**
   * Convert seed phrase to seed bytes
   */
  async seedPhraseToSeed(
    seedPhrase: string,
    password: string = ''
  ): Promise<Uint8Array> {
    if (!await this.validateSeedPhrase(seedPhrase)) {
      throw new Error('Invalid seed phrase');
    }
    return mnemonicToSeed(seedPhrase, password);
  }

  /**
   * Derive a private key from seed using BIP-32/BIP-44
   */
  async derivePrivateKey(seed: Uint8Array, path: string): Promise<string> {
    const hdKey = HDKey.fromMasterSeed(seed);
    const derived = hdKey.derive(path);

    if (!derived.privateKey) {
      throw new Error('Failed to derive private key');
    }

    return this.bytesToHex(derived.privateKey);
  }

  /**
   * Get Ethereum address from private key
   */
  async getAddress(privateKey: string): Promise<string> {
    // Import secp256k1 for public key derivation
    const { getPublicKey } = await import('@noble/secp256k1');

    // Remove 0x prefix if present
    const privKeyHex = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;

    // Convert hex string to Uint8Array
    const privKeyBytes = this.hexToBytes(privKeyHex);

    // Get uncompressed public key (65 bytes: 0x04 prefix + 64 bytes)
    const publicKey = getPublicKey(privKeyBytes, false);

    // Remove the 0x04 prefix, keep only the 64 bytes (x and y coordinates)
    const publicKeyBytes = publicKey.slice(1);

    // Keccak256 hash of the public key
    const hash = keccak_256(publicKeyBytes);

    // Take last 20 bytes as address
    const addressBytes = hash.slice(-20);

    // Convert to hex with 0x prefix
    return '0x' + this.bytesToHex(addressBytes);
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
}
