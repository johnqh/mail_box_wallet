/**
 * Signer Service Interface
 *
 * Handles message signing and verification for EVM chains.
 * Supports personal_sign, eth_signTypedData_v4, and SIWE.
 */

/**
 * EIP-712 TypedData structure
 */
export interface TypedData {
  types: {
    [key: string]: Array<{
      name: string;
      type: string;
    }>;
  };
  primaryType: string;
  domain: {
    name?: string;
    version?: string;
    chainId?: number;
    verifyingContract?: string;
    salt?: string;
  };
  message: {
    [key: string]: unknown;
  };
}

/**
 * SIWE (Sign-In with Ethereum) message structure
 * Based on EIP-4361
 */
export interface SiweMessage {
  domain: string;
  address: string;
  statement?: string;
  uri: string;
  version: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
  expirationTime?: string;
  notBefore?: string;
  requestId?: string;
  resources?: string[];
}

/**
 * Signature result
 */
export interface SignatureResult {
  signature: string;
  messageHash: string;
  v: number;
  r: string;
  s: string;
}

/**
 * Verification result
 */
export interface VerificationResult {
  isValid: boolean;
  recoveredAddress?: string;
  error?: string;
}

export interface ISignerService {
  /**
   * Sign a message using personal_sign (EIP-191)
   * @param message - Message to sign (hex string or UTF-8 string)
   * @param privateKey - Private key to sign with
   * @returns Signature result
   */
  personalSign(message: string, privateKey: string): Promise<SignatureResult>;

  /**
   * Sign typed data using eth_signTypedData_v4 (EIP-712)
   * @param typedData - Structured data to sign
   * @param privateKey - Private key to sign with
   * @returns Signature result
   */
  signTypedData(typedData: TypedData, privateKey: string): Promise<SignatureResult>;

  /**
   * Parse SIWE message from string
   * @param message - SIWE message string
   * @returns Parsed SIWE message
   */
  parseSiweMessage(message: string): SiweMessage;

  /**
   * Verify a personal_sign signature
   * @param message - Original message
   * @param signature - Signature to verify
   * @param expectedAddress - Expected signer address
   * @returns Verification result
   */
  verifyPersonalSignature(
    message: string,
    signature: string,
    expectedAddress: string
  ): Promise<VerificationResult>;

  /**
   * Verify a typed data signature
   * @param typedData - Original typed data
   * @param signature - Signature to verify
   * @param expectedAddress - Expected signer address
   * @returns Verification result
   */
  verifyTypedDataSignature(
    typedData: TypedData,
    signature: string,
    expectedAddress: string
  ): Promise<VerificationResult>;

  /**
   * Recover address from personal_sign signature
   * @param message - Original message
   * @param signature - Signature
   * @returns Recovered address
   */
  recoverPersonalSignature(message: string, signature: string): Promise<string>;

  /**
   * Recover address from typed data signature
   * @param typedData - Original typed data
   * @param signature - Signature
   * @returns Recovered address
   */
  recoverTypedDataSignature(typedData: TypedData, signature: string): Promise<string>;
}
