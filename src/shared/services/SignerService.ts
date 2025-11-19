/**
 * Signer Service Implementation
 *
 * Implements EIP-191 (personal_sign) and EIP-712 (signTypedData_v4).
 * Uses @noble/secp256k1 for signing and @noble/hashes for hashing.
 */

import * as secp256k1 from '@noble/secp256k1';
import { keccak_256 } from '@noble/hashes/sha3.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { hmac } from '@noble/hashes/hmac.js';
import {
  ISignerService,
  SignatureResult,
  TypedData,
  SiweMessage,
  VerificationResult,
} from '@/shared/di/interfaces/ISignerService';

// Set hash functions for secp256k1
secp256k1.hashes.sha256 = sha256;
secp256k1.hashes.hmacSha256 = (key: Uint8Array, msg: Uint8Array) => hmac(sha256, key, msg);

export class SignerService implements ISignerService {
  /**
   * Sign a message using personal_sign (EIP-191)
   */
  async personalSign(message: string, privateKey: string): Promise<SignatureResult> {
    // Convert message to bytes
    const messageBytes = this.messageToBytes(message);

    // Create EIP-191 personal sign message
    const prefix = `\x19Ethereum Signed Message:\n${messageBytes.length}`;
    const prefixBytes = new TextEncoder().encode(prefix);

    // Combine prefix and message
    const combined = new Uint8Array(prefixBytes.length + messageBytes.length);
    combined.set(prefixBytes);
    combined.set(messageBytes, prefixBytes.length);

    // Hash the combined message
    const messageHash = keccak_256(combined);

    // Sign the hash
    const privateKeyBytes = this.hexToBytes(privateKey);
    const signature = await secp256k1.sign(messageHash, privateKeyBytes, {
      format: 'recovered',
      prehash: false, // We already hashed with keccak256
    });

    // Extract v, r, s from 'recovered' format
    // Format: [recovery_byte, r (32 bytes), s (32 bytes)]
    const v = signature[0];
    const r = signature.slice(1, 33);
    const s = signature.slice(33, 65);

    // Convert to hex
    const rHex = '0x' + Buffer.from(r).toString('hex');
    const sHex = '0x' + Buffer.from(s).toString('hex');

    // Combine into signature (r + s + v)
    // Note: Ethereum uses v = 27 or 28, not 0 or 1
    const ethereumV = v + 27;
    const signatureHex =
      '0x' +
      Buffer.from(r).toString('hex') +
      Buffer.from(s).toString('hex') +
      ethereumV.toString(16).padStart(2, '0');

    return {
      signature: signatureHex,
      messageHash: '0x' + Buffer.from(messageHash).toString('hex'),
      v: ethereumV,
      r: rHex,
      s: sHex,
    };
  }

  /**
   * Sign typed data using eth_signTypedData_v4 (EIP-712)
   */
  async signTypedData(typedData: TypedData, privateKey: string): Promise<SignatureResult> {
    // Encode typed data according to EIP-712
    const messageHash = this.hashTypedData(typedData);

    // Sign the hash
    const privateKeyBytes = this.hexToBytes(privateKey);
    const signature = await secp256k1.sign(messageHash, privateKeyBytes, {
      format: 'recovered',
      prehash: false, // We already hashed with keccak256
    });

    // Extract v, r, s from 'recovered' format
    // Format: [recovery_byte, r (32 bytes), s (32 bytes)]
    const v = signature[0];
    const r = signature.slice(1, 33);
    const s = signature.slice(33, 65);

    // Convert to hex
    const rHex = '0x' + Buffer.from(r).toString('hex');
    const sHex = '0x' + Buffer.from(s).toString('hex');

    // Combine into signature
    // Note: Ethereum uses v = 27 or 28, not 0 or 1
    const ethereumV = v + 27;
    const signatureHex =
      '0x' +
      Buffer.from(r).toString('hex') +
      Buffer.from(s).toString('hex') +
      ethereumV.toString(16).padStart(2, '0');

    return {
      signature: signatureHex,
      messageHash: '0x' + Buffer.from(messageHash).toString('hex'),
      v: ethereumV,
      r: rHex,
      s: sHex,
    };
  }

  /**
   * Parse SIWE message from string
   */
  parseSiweMessage(message: string): SiweMessage {
    const lines = message.split('\n');

    // Extract domain (first part of first line before " wants you to sign in")
    const firstLine = lines[0].trim();
    const domain = firstLine.split(' wants you to sign in')[0];

    // Find address line
    const addressLine = lines.find((l) => l.trim().match(/^0x[a-fA-F0-9]{40}/));
    if (!addressLine) {
      throw new Error('Invalid SIWE message: address not found');
    }
    const address = addressLine.trim();

    // Find URI
    const uriLine = lines.find((l) => l.startsWith('URI: '));
    if (!uriLine) {
      throw new Error('Invalid SIWE message: URI not found');
    }
    const uri = uriLine.replace('URI: ', '').trim();

    // Find Version
    const versionLine = lines.find((l) => l.startsWith('Version: '));
    if (!versionLine) {
      throw new Error('Invalid SIWE message: Version not found');
    }
    const version = versionLine.replace('Version: ', '').trim();

    // Find Chain ID
    const chainIdLine = lines.find((l) => l.startsWith('Chain ID: '));
    if (!chainIdLine) {
      throw new Error('Invalid SIWE message: Chain ID not found');
    }
    const chainId = parseInt(chainIdLine.replace('Chain ID: ', '').trim());

    // Find Nonce
    const nonceLine = lines.find((l) => l.startsWith('Nonce: '));
    if (!nonceLine) {
      throw new Error('Invalid SIWE message: Nonce not found');
    }
    const nonce = nonceLine.replace('Nonce: ', '').trim();

    // Find Issued At
    const issuedAtLine = lines.find((l) => l.startsWith('Issued At: '));
    if (!issuedAtLine) {
      throw new Error('Invalid SIWE message: Issued At not found');
    }
    const issuedAt = issuedAtLine.replace('Issued At: ', '').trim();

    // Optional fields
    const statementStartIndex = lines.findIndex((l) => l.trim() === address) + 1;
    const statementEndIndex = lines.findIndex((l) => l.startsWith('URI: '));
    const statement =
      statementStartIndex < statementEndIndex
        ? lines.slice(statementStartIndex, statementEndIndex).join('\n').trim()
        : undefined;

    const expirationTimeLine = lines.find((l) => l.startsWith('Expiration Time: '));
    const expirationTime = expirationTimeLine
      ? expirationTimeLine.replace('Expiration Time: ', '').trim()
      : undefined;

    const notBeforeLine = lines.find((l) => l.startsWith('Not Before: '));
    const notBefore = notBeforeLine ? notBeforeLine.replace('Not Before: ', '').trim() : undefined;

    const requestIdLine = lines.find((l) => l.startsWith('Request ID: '));
    const requestId = requestIdLine ? requestIdLine.replace('Request ID: ', '').trim() : undefined;

    const resourcesIndex = lines.findIndex((l) => l.startsWith('Resources:'));
    const resources =
      resourcesIndex !== -1
        ? lines
            .slice(resourcesIndex + 1)
            .filter((l) => l.startsWith('- '))
            .map((l) => l.replace('- ', '').trim())
        : undefined;

    return {
      domain,
      address,
      statement,
      uri,
      version,
      chainId,
      nonce,
      issuedAt,
      expirationTime,
      notBefore,
      requestId,
      resources,
    };
  }

  /**
   * Verify a personal_sign signature
   */
  async verifyPersonalSignature(
    message: string,
    signature: string,
    expectedAddress: string
  ): Promise<VerificationResult> {
    try {
      const recoveredAddress = await this.recoverPersonalSignature(message, signature);
      const isValid = recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();

      return {
        isValid,
        recoveredAddress,
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  }

  /**
   * Verify a typed data signature
   */
  async verifyTypedDataSignature(
    typedData: TypedData,
    signature: string,
    expectedAddress: string
  ): Promise<VerificationResult> {
    try {
      const recoveredAddress = await this.recoverTypedDataSignature(typedData, signature);
      const isValid = recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();

      return {
        isValid,
        recoveredAddress,
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  }

  /**
   * Recover address from personal_sign signature
   */
  async recoverPersonalSignature(message: string, signature: string): Promise<string> {
    // Convert message to bytes
    const messageBytes = this.messageToBytes(message);

    // Create EIP-191 personal sign message
    const prefix = `\x19Ethereum Signed Message:\n${messageBytes.length}`;
    const prefixBytes = new TextEncoder().encode(prefix);

    // Combine prefix and message
    const combined = new Uint8Array(prefixBytes.length + messageBytes.length);
    combined.set(prefixBytes);
    combined.set(messageBytes, prefixBytes.length);

    // Hash the combined message
    const messageHash = keccak_256(combined);

    // Parse signature
    const sig = signature.replace('0x', '');
    const r = sig.substring(0, 64);
    const s = sig.substring(64, 128);
    const v = parseInt(sig.substring(128, 130), 16);

    // Recover public key
    // Format: [recovery_byte, r (32 bytes), s (32 bytes)]
    const signatureBytes = new Uint8Array([
      v - 27,  // recovery byte (0 or 1)
      ...Buffer.from(r, 'hex'),
      ...Buffer.from(s, 'hex'),
    ]);

    const publicKey = await secp256k1.recoverPublicKey(signatureBytes, messageHash, {
      prehash: false,
    });

    // Decompress public key (secp256k1 returns compressed format)
    const point = secp256k1.Point.fromBytes(publicKey);
    const publicKeyUncompressed = point.toBytes(false);

    // Convert public key to address
    const publicKeyBytes = publicKeyUncompressed.slice(1); // Remove 0x04 prefix
    const addressHash = keccak_256(publicKeyBytes);
    const address = '0x' + Buffer.from(addressHash.slice(-20)).toString('hex');

    return address;
  }

  /**
   * Recover address from typed data signature
   */
  async recoverTypedDataSignature(typedData: TypedData, signature: string): Promise<string> {
    // Hash typed data
    const messageHash = this.hashTypedData(typedData);

    // Parse signature
    const sig = signature.replace('0x', '');
    const r = sig.substring(0, 64);
    const s = sig.substring(64, 128);
    const v = parseInt(sig.substring(128, 130), 16);

    // Recover public key
    // Format: [recovery_byte, r (32 bytes), s (32 bytes)]
    const signatureBytes = new Uint8Array([
      v - 27,  // recovery byte (0 or 1)
      ...Buffer.from(r, 'hex'),
      ...Buffer.from(s, 'hex'),
    ]);

    const publicKey = await secp256k1.recoverPublicKey(signatureBytes, messageHash, {
      prehash: false,
    });

    // Decompress public key (secp256k1 returns compressed format)
    const point = secp256k1.Point.fromBytes(publicKey);
    const publicKeyUncompressed = point.toBytes(false);

    // Convert public key to address
    const publicKeyBytes = publicKeyUncompressed.slice(1); // Remove 0x04 prefix
    const addressHash = keccak_256(publicKeyBytes);
    const address = '0x' + Buffer.from(addressHash.slice(-20)).toString('hex');

    return address;
  }

  // ========== Private Methods ==========

  /**
   * Convert hex string to Uint8Array
   */
  private hexToBytes(hex: string): Uint8Array {
    const cleanHex = hex.replace('0x', '');
    return new Uint8Array(Buffer.from(cleanHex, 'hex'));
  }

  /**
   * Convert message to bytes
   */
  private messageToBytes(message: string): Uint8Array {
    // If message starts with 0x, it's hex
    if (message.startsWith('0x')) {
      return Buffer.from(message.slice(2), 'hex');
    }
    // Otherwise it's UTF-8
    return new TextEncoder().encode(message);
  }

  /**
   * Hash typed data according to EIP-712
   */
  private hashTypedData(typedData: TypedData): Uint8Array {
    // Hash domain separator
    const domainSeparator = this.hashStruct('EIP712Domain', typedData.domain, typedData.types);

    // Hash message
    const messageHash = this.hashStruct(typedData.primaryType, typedData.message, typedData.types);

    // Combine according to EIP-712: \x19\x01 + domainSeparator + messageHash
    const combined = new Uint8Array(2 + 32 + 32);
    combined[0] = 0x19;
    combined[1] = 0x01;
    combined.set(domainSeparator, 2);
    combined.set(messageHash, 34);

    return keccak_256(combined);
  }

  /**
   * Hash a struct according to EIP-712
   */
  private hashStruct(
    primaryType: string,
    data: Record<string, unknown>,
    types: TypedData['types']
  ): Uint8Array {
    // Encode type
    const typeHash = keccak_256(new TextEncoder().encode(this.encodeType(primaryType, types)));

    // Encode data
    const encodedData = this.encodeData(primaryType, data, types);

    // Combine type hash and encoded data
    const combined = new Uint8Array(32 + encodedData.length);
    combined.set(typeHash);
    combined.set(encodedData, 32);

    return keccak_256(combined);
  }

  /**
   * Encode type according to EIP-712
   */
  private encodeType(primaryType: string, types: TypedData['types']): string {
    let result = '';
    const deps = this.findTypeDependencies(primaryType, types);
    deps.sort();

    for (const type of [primaryType, ...deps.filter((t) => t !== primaryType)]) {
      const fields = types[type];
      if (!fields) continue;

      result +=
        type + '(' + fields.map((f) => `${f.type} ${f.name}`).join(',') + ')';
    }

    return result;
  }

  /**
   * Find type dependencies
   */
  private findTypeDependencies(primaryType: string, types: TypedData['types']): string[] {
    const deps = new Set<string>();
    const toProcess = [primaryType];

    while (toProcess.length > 0) {
      const type = toProcess.pop()!;
      if (deps.has(type)) continue;

      const fields = types[type];
      if (!fields) continue;

      deps.add(type);

      for (const field of fields) {
        const fieldType = field.type.replace(/\[\]$/, ''); // Remove array suffix
        if (types[fieldType]) {
          toProcess.push(fieldType);
        }
      }
    }

    return Array.from(deps);
  }

  /**
   * Encode data according to EIP-712
   */
  private encodeData(
    primaryType: string,
    data: Record<string, unknown>,
    types: TypedData['types']
  ): Uint8Array {
    const fields = types[primaryType];
    if (!fields) {
      throw new Error(`Type ${primaryType} not found`);
    }

    const encodedValues: Uint8Array[] = [];

    for (const field of fields) {
      const value = data[field.name];
      encodedValues.push(this.encodeValue(field.type, value, types));
    }

    // Combine all encoded values
    const totalLength = encodedValues.reduce((sum, arr) => sum + arr.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;

    for (const encoded of encodedValues) {
      result.set(encoded, offset);
      offset += encoded.length;
    }

    return result;
  }

  /**
   * Encode a single value according to EIP-712
   */
  private encodeValue(
    type: string,
    value: unknown,
    types: TypedData['types']
  ): Uint8Array {
    // Handle arrays
    if (type.endsWith('[]')) {
      const itemType = type.slice(0, -2);
      const items = value as unknown[];
      const encodedItems = items.map((item) => this.encodeValue(itemType, item, types));
      const concatenated = new Uint8Array(
        encodedItems.reduce((sum, arr) => sum + arr.length, 0)
      );
      let offset = 0;
      for (const item of encodedItems) {
        concatenated.set(item, offset);
        offset += item.length;
      }
      return keccak_256(concatenated);
    }

    // Handle custom types
    if (types[type]) {
      return this.hashStruct(type, value as Record<string, unknown>, types);
    }

    // Handle basic types
    return this.encodeBasicValue(type, value);
  }

  /**
   * Encode basic value (bytes32)
   */
  private encodeBasicValue(type: string, value: unknown): Uint8Array {
    const result = new Uint8Array(32);

    if (type === 'string') {
      const hash = keccak_256(new TextEncoder().encode(value as string));
      result.set(hash);
    } else if (type === 'bytes') {
      const bytes =
        typeof value === 'string' && value.startsWith('0x')
          ? Buffer.from(value.slice(2), 'hex')
          : Buffer.from(value as string);
      const hash = keccak_256(bytes);
      result.set(hash);
    } else if (type === 'address') {
      const addr = (value as string).replace('0x', '').padStart(64, '0');
      result.set(Buffer.from(addr, 'hex'));
    } else if (type.startsWith('uint') || type.startsWith('int')) {
      const numValue = BigInt(value as string | number);
      const hex = numValue.toString(16).padStart(64, '0');
      result.set(Buffer.from(hex, 'hex'));
    } else if (type === 'bool') {
      result[31] = value ? 1 : 0;
    } else if (type.startsWith('bytes')) {
      const bytes =
        typeof value === 'string' && value.startsWith('0x')
          ? Buffer.from(value.slice(2), 'hex')
          : Buffer.from(value as string);
      result.set(bytes.slice(0, 32));
    }

    return result;
  }
}
