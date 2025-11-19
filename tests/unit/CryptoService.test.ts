import { describe, it, expect, beforeEach } from 'vitest';
import { CryptoService } from '@/shared/services/CryptoService';

describe('CryptoService', () => {
  let cryptoService: CryptoService;

  beforeEach(() => {
    cryptoService = new CryptoService();
  });

  describe('deriveKey', () => {
    it('should derive a key from a password', async () => {
      const password = 'testPassword123';
      const result = await cryptoService.deriveKey(password);

      expect(result.key).toBeDefined();
      expect(result.salt).toBeDefined();
      expect(result.key).toHaveLength(64); // 32 bytes = 64 hex chars
      expect(result.salt).toHaveLength(32); // 16 bytes = 32 hex chars
    });

    it('should derive the same key with the same password and salt', async () => {
      const password = 'testPassword123';
      const result1 = await cryptoService.deriveKey(password);
      const result2 = await cryptoService.deriveKey(password, result1.salt);

      expect(result2.key).toBe(result1.key);
      expect(result2.salt).toBe(result1.salt);
    });

    it('should derive different keys with different salts', async () => {
      const password = 'testPassword123';
      const result1 = await cryptoService.deriveKey(password);
      const result2 = await cryptoService.deriveKey(password);

      expect(result1.key).not.toBe(result2.key);
      expect(result1.salt).not.toBe(result2.salt);
    });

    it('should derive different keys with different passwords', async () => {
      const salt = await cryptoService.randomBytes(16);
      const result1 = await cryptoService.deriveKey('password1', salt);
      const result2 = await cryptoService.deriveKey('password2', salt);

      expect(result1.key).not.toBe(result2.key);
      expect(result1.salt).toBe(result2.salt);
    });

    it('should respect custom iterations', async () => {
      const password = 'testPassword123';
      const salt = await cryptoService.randomBytes(16);

      // These should produce the same result with same iterations
      const result1 = await cryptoService.deriveKey(password, salt, 10000);
      const result2 = await cryptoService.deriveKey(password, salt, 10000);

      expect(result1.key).toBe(result2.key);
    });
  });

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt data', async () => {
      const plaintext = 'Hello, World!';
      const { key } = await cryptoService.deriveKey('password123');

      const encrypted = await cryptoService.encrypt(plaintext, key);
      const decrypted = await cryptoService.decrypt(encrypted, key);

      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext each time (random IV)', async () => {
      const plaintext = 'Hello, World!';
      const { key } = await cryptoService.deriveKey('password123');

      const encrypted1 = await cryptoService.encrypt(plaintext, key);
      const encrypted2 = await cryptoService.encrypt(plaintext, key);

      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });

    it('should fail to decrypt with wrong key', async () => {
      const plaintext = 'Hello, World!';
      const { key: key1 } = await cryptoService.deriveKey('password1');
      const { key: key2 } = await cryptoService.deriveKey('password2');

      const encrypted = await cryptoService.encrypt(plaintext, key1);

      await expect(cryptoService.decrypt(encrypted, key2)).rejects.toThrow(
        'Decryption failed'
      );
    });

    it('should encrypt long text', async () => {
      const plaintext = 'A'.repeat(10000);
      const { key } = await cryptoService.deriveKey('password123');

      const encrypted = await cryptoService.encrypt(plaintext, key);
      const decrypted = await cryptoService.decrypt(encrypted, key);

      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt unicode characters', async () => {
      const plaintext = '你好世界 🌍 مرحبا العالم';
      const { key } = await cryptoService.deriveKey('password123');

      const encrypted = await cryptoService.encrypt(plaintext, key);
      const decrypted = await cryptoService.decrypt(encrypted, key);

      expect(decrypted).toBe(plaintext);
    });

    it('should fail with corrupted ciphertext', async () => {
      const plaintext = 'Hello, World!';
      const { key } = await cryptoService.deriveKey('password123');

      const encrypted = await cryptoService.encrypt(plaintext, key);

      // Corrupt the ciphertext by flipping a character at a known position
      const chars = encrypted.ciphertext.split('');
      chars[0] = chars[0] === 'A' ? 'B' : 'A';
      encrypted.ciphertext = chars.join('');

      await expect(cryptoService.decrypt(encrypted, key)).rejects.toThrow(
        'Decryption failed'
      );
    });

    it('should include version in encrypted data', async () => {
      const plaintext = 'Hello, World!';
      const { key } = await cryptoService.deriveKey('password123');

      const encrypted = await cryptoService.encrypt(plaintext, key);

      expect(encrypted.version).toBe(1);
    });
  });

  describe('randomBytes', () => {
    it('should generate random bytes', async () => {
      const bytes = await cryptoService.randomBytes(16);

      expect(bytes).toBeDefined();
      expect(bytes).toHaveLength(32); // 16 bytes = 32 hex chars
    });

    it('should generate different random bytes each time', async () => {
      const bytes1 = await cryptoService.randomBytes(16);
      const bytes2 = await cryptoService.randomBytes(16);

      expect(bytes1).not.toBe(bytes2);
    });

    it('should generate correct length', async () => {
      const bytes8 = await cryptoService.randomBytes(8);
      const bytes32 = await cryptoService.randomBytes(32);

      expect(bytes8).toHaveLength(16); // 8 bytes = 16 hex chars
      expect(bytes32).toHaveLength(64); // 32 bytes = 64 hex chars
    });
  });
});
