import { describe, it, expect, beforeEach } from 'vitest';
import { SignerService } from '@/shared/services/SignerService';
import {
  TEST_PRIVATE_KEY,
  TEST_ADDRESS,
  PERSONAL_SIGN_VECTORS,
  TYPED_DATA_MAIL,
  TYPED_DATA_PERMIT,
  SIWE_MESSAGE_SIMPLE,
  SIWE_MESSAGE_FULL,
  SIWE_EXPECTED_SIMPLE,
  SIWE_EXPECTED_FULL,
} from '../fixtures/signing-vectors';

describe('SignerService', () => {
  let signerService: SignerService;

  beforeEach(() => {
    signerService = new SignerService();
  });

  describe('personalSign', () => {
    it('should sign a simple text message', async () => {
      const message = 'Hello, World!';
      const result = await signerService.personalSign(message, TEST_PRIVATE_KEY);

      expect(result.signature).toBeTruthy();
      expect(result.signature.startsWith('0x')).toBe(true);
      expect(result.messageHash).toBeTruthy();
      expect(result.v).toBeGreaterThanOrEqual(27);
      expect(result.r).toBeTruthy();
      expect(result.s).toBeTruthy();
    });

    it('should sign hex-encoded message', async () => {
      const message = '0x48656c6c6f'; // "Hello"
      const result = await signerService.personalSign(message, TEST_PRIVATE_KEY);

      expect(result.signature).toBeTruthy();
      expect(result.messageHash).toBeTruthy();
    });

    it('should sign empty message', async () => {
      const message = '';
      const result = await signerService.personalSign(message, TEST_PRIVATE_KEY);

      expect(result.signature).toBeTruthy();
      expect(result.messageHash).toBeTruthy();
    });

    it('should sign message with special characters', async () => {
      const message = 'Test message with émojis 🚀 and symbols !@#$%';
      const result = await signerService.personalSign(message, TEST_PRIVATE_KEY);

      expect(result.signature).toBeTruthy();
      expect(result.messageHash).toBeTruthy();
    });

    it('should produce consistent signatures for same message', async () => {
      const message = 'Consistent test';

      const result1 = await signerService.personalSign(message, TEST_PRIVATE_KEY);
      const result2 = await signerService.personalSign(message, TEST_PRIVATE_KEY);

      expect(result1.signature).toBe(result2.signature);
      expect(result1.messageHash).toBe(result2.messageHash);
    });

    it('should produce different signatures for different messages', async () => {
      const message1 = 'Message 1';
      const message2 = 'Message 2';

      const result1 = await signerService.personalSign(message1, TEST_PRIVATE_KEY);
      const result2 = await signerService.personalSign(message2, TEST_PRIVATE_KEY);

      expect(result1.signature).not.toBe(result2.signature);
      expect(result1.messageHash).not.toBe(result2.messageHash);
    });
  });

  describe('signTypedData', () => {
    it('should sign typed data (Mail example)', async () => {
      const result = await signerService.signTypedData(TYPED_DATA_MAIL, TEST_PRIVATE_KEY);

      expect(result.signature).toBeTruthy();
      expect(result.signature.startsWith('0x')).toBe(true);
      expect(result.messageHash).toBeTruthy();
      expect(result.v).toBeGreaterThanOrEqual(27);
      expect(result.r).toBeTruthy();
      expect(result.s).toBeTruthy();
    });

    it('should sign typed data (Permit example)', async () => {
      const result = await signerService.signTypedData(TYPED_DATA_PERMIT, TEST_PRIVATE_KEY);

      expect(result.signature).toBeTruthy();
      expect(result.messageHash).toBeTruthy();
    });

    it('should produce consistent signatures for same typed data', async () => {
      const result1 = await signerService.signTypedData(TYPED_DATA_MAIL, TEST_PRIVATE_KEY);
      const result2 = await signerService.signTypedData(TYPED_DATA_MAIL, TEST_PRIVATE_KEY);

      expect(result1.signature).toBe(result2.signature);
      expect(result1.messageHash).toBe(result2.messageHash);
    });
  });

  describe('recoverPersonalSignature', () => {
    it('should recover correct address from signature', async () => {
      const message = 'Test recovery';
      const signResult = await signerService.personalSign(message, TEST_PRIVATE_KEY);

      const recoveredAddress = await signerService.recoverPersonalSignature(
        message,
        signResult.signature
      );

      expect(recoveredAddress.toLowerCase()).toBe(TEST_ADDRESS.toLowerCase());
    });

    it('should recover address for hex message', async () => {
      const message = '0x48656c6c6f';
      const signResult = await signerService.personalSign(message, TEST_PRIVATE_KEY);

      const recoveredAddress = await signerService.recoverPersonalSignature(
        message,
        signResult.signature
      );

      expect(recoveredAddress.toLowerCase()).toBe(TEST_ADDRESS.toLowerCase());
    });

    it('should recover address for empty message', async () => {
      const message = '';
      const signResult = await signerService.personalSign(message, TEST_PRIVATE_KEY);

      const recoveredAddress = await signerService.recoverPersonalSignature(
        message,
        signResult.signature
      );

      expect(recoveredAddress.toLowerCase()).toBe(TEST_ADDRESS.toLowerCase());
    });
  });

  describe('recoverTypedDataSignature', () => {
    it('should recover correct address from typed data signature', async () => {
      const signResult = await signerService.signTypedData(TYPED_DATA_MAIL, TEST_PRIVATE_KEY);

      const recoveredAddress = await signerService.recoverTypedDataSignature(
        TYPED_DATA_MAIL,
        signResult.signature
      );

      expect(recoveredAddress.toLowerCase()).toBe(TEST_ADDRESS.toLowerCase());
    });

    it('should recover address from permit signature', async () => {
      const signResult = await signerService.signTypedData(TYPED_DATA_PERMIT, TEST_PRIVATE_KEY);

      const recoveredAddress = await signerService.recoverTypedDataSignature(
        TYPED_DATA_PERMIT,
        signResult.signature
      );

      expect(recoveredAddress.toLowerCase()).toBe(TEST_ADDRESS.toLowerCase());
    });
  });

  describe('verifyPersonalSignature', () => {
    it('should verify valid signature', async () => {
      const message = 'Verify this';
      const signResult = await signerService.personalSign(message, TEST_PRIVATE_KEY);

      const verification = await signerService.verifyPersonalSignature(
        message,
        signResult.signature,
        TEST_ADDRESS
      );

      expect(verification.isValid).toBe(true);
      expect(verification.recoveredAddress?.toLowerCase()).toBe(TEST_ADDRESS.toLowerCase());
      expect(verification.error).toBeUndefined();
    });

    it('should reject signature from wrong address', async () => {
      const message = 'Test message';
      const signResult = await signerService.personalSign(message, TEST_PRIVATE_KEY);

      const wrongAddress = '0x0000000000000000000000000000000000000001';
      const verification = await signerService.verifyPersonalSignature(
        message,
        signResult.signature,
        wrongAddress
      );

      expect(verification.isValid).toBe(false);
      expect(verification.recoveredAddress).not.toBe(wrongAddress);
    });

    it('should reject invalid signature format', async () => {
      const message = 'Test';
      const invalidSignature = '0xinvalid';

      const verification = await signerService.verifyPersonalSignature(
        message,
        invalidSignature,
        TEST_ADDRESS
      );

      expect(verification.isValid).toBe(false);
      expect(verification.error).toBeTruthy();
    });

    it('should reject signature for different message', async () => {
      const message1 = 'Original message';
      const message2 = 'Different message';

      const signResult = await signerService.personalSign(message1, TEST_PRIVATE_KEY);

      const verification = await signerService.verifyPersonalSignature(
        message2,
        signResult.signature,
        TEST_ADDRESS
      );

      expect(verification.isValid).toBe(false);
    });

    it('should be case-insensitive for addresses', async () => {
      const message = 'Case test';
      const signResult = await signerService.personalSign(message, TEST_PRIVATE_KEY);

      const verification = await signerService.verifyPersonalSignature(
        message,
        signResult.signature,
        TEST_ADDRESS.toUpperCase()
      );

      expect(verification.isValid).toBe(true);
    });
  });

  describe('verifyTypedDataSignature', () => {
    it('should verify valid typed data signature', async () => {
      const signResult = await signerService.signTypedData(TYPED_DATA_MAIL, TEST_PRIVATE_KEY);

      const verification = await signerService.verifyTypedDataSignature(
        TYPED_DATA_MAIL,
        signResult.signature,
        TEST_ADDRESS
      );

      expect(verification.isValid).toBe(true);
      expect(verification.recoveredAddress?.toLowerCase()).toBe(TEST_ADDRESS.toLowerCase());
    });

    it('should reject signature from wrong address', async () => {
      const signResult = await signerService.signTypedData(TYPED_DATA_MAIL, TEST_PRIVATE_KEY);

      const wrongAddress = '0x0000000000000000000000000000000000000001';
      const verification = await signerService.verifyTypedDataSignature(
        TYPED_DATA_MAIL,
        signResult.signature,
        wrongAddress
      );

      expect(verification.isValid).toBe(false);
    });

    it('should reject invalid signature', async () => {
      const invalidSignature = '0xinvalid';

      const verification = await signerService.verifyTypedDataSignature(
        TYPED_DATA_MAIL,
        invalidSignature,
        TEST_ADDRESS
      );

      expect(verification.isValid).toBe(false);
      expect(verification.error).toBeTruthy();
    });
  });

  describe('parseSiweMessage', () => {
    it('should parse simple SIWE message', () => {
      const parsed = signerService.parseSiweMessage(SIWE_MESSAGE_SIMPLE);

      expect(parsed.domain).toBe(SIWE_EXPECTED_SIMPLE.domain);
      expect(parsed.address).toBe(SIWE_EXPECTED_SIMPLE.address);
      expect(parsed.statement).toBe(SIWE_EXPECTED_SIMPLE.statement);
      expect(parsed.uri).toBe(SIWE_EXPECTED_SIMPLE.uri);
      expect(parsed.version).toBe(SIWE_EXPECTED_SIMPLE.version);
      expect(parsed.chainId).toBe(SIWE_EXPECTED_SIMPLE.chainId);
      expect(parsed.nonce).toBe(SIWE_EXPECTED_SIMPLE.nonce);
      expect(parsed.issuedAt).toBe(SIWE_EXPECTED_SIMPLE.issuedAt);
    });

    it('should parse full SIWE message with all fields', () => {
      const parsed = signerService.parseSiweMessage(SIWE_MESSAGE_FULL);

      expect(parsed.domain).toBe(SIWE_EXPECTED_FULL.domain);
      expect(parsed.address).toBe(SIWE_EXPECTED_FULL.address);
      expect(parsed.statement).toBe(SIWE_EXPECTED_FULL.statement);
      expect(parsed.uri).toBe(SIWE_EXPECTED_FULL.uri);
      expect(parsed.version).toBe(SIWE_EXPECTED_FULL.version);
      expect(parsed.chainId).toBe(SIWE_EXPECTED_FULL.chainId);
      expect(parsed.nonce).toBe(SIWE_EXPECTED_FULL.nonce);
      expect(parsed.issuedAt).toBe(SIWE_EXPECTED_FULL.issuedAt);
      expect(parsed.expirationTime).toBe(SIWE_EXPECTED_FULL.expirationTime);
      expect(parsed.notBefore).toBe(SIWE_EXPECTED_FULL.notBefore);
      expect(parsed.requestId).toBe(SIWE_EXPECTED_FULL.requestId);
      expect(parsed.resources).toEqual(SIWE_EXPECTED_FULL.resources);
    });

    it('should throw error for invalid SIWE message (missing address)', () => {
      const invalidMessage = `example.com wants you to sign in

URI: https://example.com
Version: 1
Chain ID: 1
Nonce: 123
Issued At: 2021-09-30T16:25:24Z`;

      expect(() => signerService.parseSiweMessage(invalidMessage)).toThrow(
        'address not found'
      );
    });

    it('should throw error for invalid SIWE message (missing URI)', () => {
      const invalidMessage = `example.com wants you to sign in
0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2

Version: 1
Chain ID: 1
Nonce: 123
Issued At: 2021-09-30T16:25:24Z`;

      expect(() => signerService.parseSiweMessage(invalidMessage)).toThrow('URI not found');
    });
  });

  describe('Full workflow', () => {
    it('should sign and verify personal message end-to-end', async () => {
      const message = 'Complete workflow test';

      // Sign
      const signResult = await signerService.personalSign(message, TEST_PRIVATE_KEY);

      // Verify
      const verification = await signerService.verifyPersonalSignature(
        message,
        signResult.signature,
        TEST_ADDRESS
      );

      expect(verification.isValid).toBe(true);
    });

    it('should sign and verify typed data end-to-end', async () => {
      // Sign
      const signResult = await signerService.signTypedData(TYPED_DATA_MAIL, TEST_PRIVATE_KEY);

      // Verify
      const verification = await signerService.verifyTypedDataSignature(
        TYPED_DATA_MAIL,
        signResult.signature,
        TEST_ADDRESS
      );

      expect(verification.isValid).toBe(true);
    });

    it('should handle all test vectors', async () => {
      for (const vector of PERSONAL_SIGN_VECTORS) {
        const signResult = await signerService.personalSign(vector.message, TEST_PRIVATE_KEY);

        const verification = await signerService.verifyPersonalSignature(
          vector.message,
          signResult.signature,
          vector.expectedAddress
        );

        expect(verification.isValid).toBe(true);
      }
    });
  });
});
