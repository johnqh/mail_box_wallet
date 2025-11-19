import { describe, it, expect, beforeEach } from 'vitest';
import { WalletService } from '@/shared/services/WalletService';

describe('WalletService', () => {
  let walletService: WalletService;

  beforeEach(() => {
    walletService = new WalletService();
  });

  describe('generateSeedPhrase', () => {
    it('should generate a 12-word seed phrase by default', async () => {
      const seedPhrase = await walletService.generateSeedPhrase();
      const words = seedPhrase.split(' ');

      expect(words).toHaveLength(12);
      expect(seedPhrase).toBeTruthy();
    });

    it('should generate a 12-word seed phrase when specified', async () => {
      const seedPhrase = await walletService.generateSeedPhrase(12);
      const words = seedPhrase.split(' ');

      expect(words).toHaveLength(12);
    });

    it('should generate a 24-word seed phrase when specified', async () => {
      const seedPhrase = await walletService.generateSeedPhrase(24);
      const words = seedPhrase.split(' ');

      expect(words).toHaveLength(24);
    });

    it('should generate different seed phrases each time', async () => {
      const seedPhrase1 = await walletService.generateSeedPhrase();
      const seedPhrase2 = await walletService.generateSeedPhrase();

      expect(seedPhrase1).not.toBe(seedPhrase2);
    });

    it('should generate valid BIP-39 seed phrases', async () => {
      const seedPhrase = await walletService.generateSeedPhrase();
      const isValid = await walletService.validateSeedPhrase(seedPhrase);

      expect(isValid).toBe(true);
    });
  });

  describe('validateSeedPhrase', () => {
    it('should validate a correct 12-word seed phrase', async () => {
      const seedPhrase = await walletService.generateSeedPhrase(12);
      const isValid = await walletService.validateSeedPhrase(seedPhrase);

      expect(isValid).toBe(true);
    });

    it('should validate a correct 24-word seed phrase', async () => {
      const seedPhrase = await walletService.generateSeedPhrase(24);
      const isValid = await walletService.validateSeedPhrase(seedPhrase);

      expect(isValid).toBe(true);
    });

    it('should reject an invalid seed phrase', async () => {
      const isValid = await walletService.validateSeedPhrase(
        'invalid seed phrase with random words that do not exist'
      );

      expect(isValid).toBe(false);
    });

    it('should reject a seed phrase with wrong word count', async () => {
      const seedPhrase = await walletService.generateSeedPhrase(12);
      const words = seedPhrase.split(' ');
      const truncated = words.slice(0, 11).join(' ');

      const isValid = await walletService.validateSeedPhrase(truncated);

      expect(isValid).toBe(false);
    });

    it('should reject empty string', async () => {
      const isValid = await walletService.validateSeedPhrase('');

      expect(isValid).toBe(false);
    });
  });

  describe('seedPhraseToSeed', () => {
    it('should convert seed phrase to seed bytes', async () => {
      const seedPhrase = await walletService.generateSeedPhrase();
      const seed = await walletService.seedPhraseToSeed(seedPhrase);

      expect(seed).toBeInstanceOf(Uint8Array);
      expect(seed.length).toBe(64); // BIP-39 produces 64-byte seed
    });

    it('should produce the same seed for the same seed phrase', async () => {
      const seedPhrase = await walletService.generateSeedPhrase();
      const seed1 = await walletService.seedPhraseToSeed(seedPhrase);
      const seed2 = await walletService.seedPhraseToSeed(seedPhrase);

      expect(seed1).toEqual(seed2);
    });

    it('should produce different seeds for different seed phrases', async () => {
      const seedPhrase1 = await walletService.generateSeedPhrase();
      const seedPhrase2 = await walletService.generateSeedPhrase();
      const seed1 = await walletService.seedPhraseToSeed(seedPhrase1);
      const seed2 = await walletService.seedPhraseToSeed(seedPhrase2);

      expect(seed1).not.toEqual(seed2);
    });

    it('should produce different seeds with different passwords', async () => {
      const seedPhrase = await walletService.generateSeedPhrase();
      const seed1 = await walletService.seedPhraseToSeed(seedPhrase, 'password1');
      const seed2 = await walletService.seedPhraseToSeed(seedPhrase, 'password2');

      expect(seed1).not.toEqual(seed2);
    });

    it('should throw error for invalid seed phrase', async () => {
      await expect(
        walletService.seedPhraseToSeed('invalid seed phrase')
      ).rejects.toThrow('Invalid seed phrase');
    });
  });

  describe('derivePrivateKey', () => {
    it('should derive private key from seed', async () => {
      const seedPhrase = await walletService.generateSeedPhrase();
      const seed = await walletService.seedPhraseToSeed(seedPhrase);
      const privateKey = await walletService.derivePrivateKey(
        seed,
        "m/44'/60'/0'/0/0"
      );

      expect(privateKey).toBeDefined();
      expect(privateKey).toHaveLength(64); // 32 bytes = 64 hex chars
    });

    it('should derive the same key for the same path', async () => {
      const seedPhrase = await walletService.generateSeedPhrase();
      const seed = await walletService.seedPhraseToSeed(seedPhrase);
      const path = "m/44'/60'/0'/0/0";

      const privateKey1 = await walletService.derivePrivateKey(seed, path);
      const privateKey2 = await walletService.derivePrivateKey(seed, path);

      expect(privateKey1).toBe(privateKey2);
    });

    it('should derive different keys for different paths', async () => {
      const seedPhrase = await walletService.generateSeedPhrase();
      const seed = await walletService.seedPhraseToSeed(seedPhrase);

      const privateKey1 = await walletService.derivePrivateKey(
        seed,
        "m/44'/60'/0'/0/0"
      );
      const privateKey2 = await walletService.derivePrivateKey(
        seed,
        "m/44'/60'/0'/0/1"
      );

      expect(privateKey1).not.toBe(privateKey2);
    });

    it('should derive different keys for different account indexes', async () => {
      const seedPhrase = await walletService.generateSeedPhrase();
      const seed = await walletService.seedPhraseToSeed(seedPhrase);

      const privateKey1 = await walletService.derivePrivateKey(
        seed,
        "m/44'/60'/0'/0/0"
      );
      const privateKey2 = await walletService.derivePrivateKey(
        seed,
        "m/44'/60'/1'/0/0"
      );

      expect(privateKey1).not.toBe(privateKey2);
    });
  });

  describe('getAddress', () => {
    it('should derive Ethereum address from private key', async () => {
      const seedPhrase = await walletService.generateSeedPhrase();
      const seed = await walletService.seedPhraseToSeed(seedPhrase);
      const privateKey = await walletService.derivePrivateKey(
        seed,
        "m/44'/60'/0'/0/0"
      );
      const address = await walletService.getAddress(privateKey);

      expect(address).toMatch(/^0x[0-9a-f]{40}$/i);
    });

    it('should derive the same address for the same private key', async () => {
      const seedPhrase = await walletService.generateSeedPhrase();
      const seed = await walletService.seedPhraseToSeed(seedPhrase);
      const privateKey = await walletService.derivePrivateKey(
        seed,
        "m/44'/60'/0'/0/0"
      );

      const address1 = await walletService.getAddress(privateKey);
      const address2 = await walletService.getAddress(privateKey);

      expect(address1).toBe(address2);
    });

    it('should derive different addresses for different private keys', async () => {
      const seedPhrase = await walletService.generateSeedPhrase();
      const seed = await walletService.seedPhraseToSeed(seedPhrase);

      const privateKey1 = await walletService.derivePrivateKey(
        seed,
        "m/44'/60'/0'/0/0"
      );
      const privateKey2 = await walletService.derivePrivateKey(
        seed,
        "m/44'/60'/0'/0/1"
      );

      const address1 = await walletService.getAddress(privateKey1);
      const address2 = await walletService.getAddress(privateKey2);

      expect(address1).not.toBe(address2);
    });

    it('should handle private key with 0x prefix', async () => {
      const seedPhrase = await walletService.generateSeedPhrase();
      const seed = await walletService.seedPhraseToSeed(seedPhrase);
      const privateKey = await walletService.derivePrivateKey(
        seed,
        "m/44'/60'/0'/0/0"
      );

      const address1 = await walletService.getAddress(privateKey);
      const address2 = await walletService.getAddress('0x' + privateKey);

      expect(address1).toBe(address2);
    });

    // Test with a known test vector (from Ethereum's test suite)
    it('should derive correct address for known private key', async () => {
      // Known test vector: private key -> address
      const privateKey =
        '0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318';
      const expectedAddress = '0x2c7536e3605d9c16a7a3d7b1898e529396a65c23';

      const address = await walletService.getAddress(privateKey);

      expect(address.toLowerCase()).toBe(expectedAddress.toLowerCase());
    });
  });

  describe('Full wallet workflow', () => {
    it('should complete full workflow: generate -> derive -> address', async () => {
      // 1. Generate seed phrase
      const seedPhrase = await walletService.generateSeedPhrase();
      expect(seedPhrase.split(' ')).toHaveLength(12);

      // 2. Validate seed phrase
      const isValid = await walletService.validateSeedPhrase(seedPhrase);
      expect(isValid).toBe(true);

      // 3. Convert to seed
      const seed = await walletService.seedPhraseToSeed(seedPhrase);
      expect(seed).toBeInstanceOf(Uint8Array);
      expect(seed.length).toBe(64);

      // 4. Derive private key for first account
      const privateKey = await walletService.derivePrivateKey(
        seed,
        "m/44'/60'/0'/0/0"
      );
      expect(privateKey).toHaveLength(64);

      // 5. Get Ethereum address
      const address = await walletService.getAddress(privateKey);
      expect(address).toMatch(/^0x[0-9a-f]{40}$/i);
    });

    it('should derive multiple accounts from same seed', async () => {
      const seedPhrase = await walletService.generateSeedPhrase();
      const seed = await walletService.seedPhraseToSeed(seedPhrase);

      // Derive first 5 accounts
      const accounts = [];
      for (let i = 0; i < 5; i++) {
        const privateKey = await walletService.derivePrivateKey(
          seed,
          `m/44'/60'/0'/0/${i}`
        );
        const address = await walletService.getAddress(privateKey);
        accounts.push({ privateKey, address });
      }

      // All addresses should be unique
      const addresses = accounts.map((a) => a.address);
      const uniqueAddresses = new Set(addresses);
      expect(uniqueAddresses.size).toBe(5);

      // All private keys should be unique
      const privateKeys = accounts.map((a) => a.privateKey);
      const uniquePrivateKeys = new Set(privateKeys);
      expect(uniquePrivateKeys.size).toBe(5);
    });
  });
});
