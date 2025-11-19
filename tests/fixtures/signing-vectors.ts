/**
 * Signing Test Vectors
 *
 * Known test cases with expected signatures for validation.
 * These test vectors are based on standard Ethereum test cases.
 */

import { TypedData } from '@/shared/di/interfaces/ISignerService';

/**
 * Test account used for signing
 */
export const TEST_PRIVATE_KEY =
  'ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

export const TEST_ADDRESS = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266';

/**
 * Personal Sign Test Vectors
 */
export const PERSONAL_SIGN_VECTORS = [
  {
    description: 'Simple text message',
    message: 'Hello, World!',
    expectedAddress: TEST_ADDRESS,
  },
  {
    description: 'Hex-encoded message',
    message: '0x48656c6c6f', // "Hello" in hex
    expectedAddress: TEST_ADDRESS,
  },
  {
    description: 'Empty message',
    message: '',
    expectedAddress: TEST_ADDRESS,
  },
  {
    description: 'Message with special characters',
    message: 'Test message with émojis 🚀 and symbols !@#$%',
    expectedAddress: TEST_ADDRESS,
  },
];

/**
 * EIP-712 Typed Data Test Vectors
 */

// Simple Mail example from EIP-712
export const TYPED_DATA_MAIL: TypedData = {
  types: {
    EIP712Domain: [
      { name: 'name', type: 'string' },
      { name: 'version', type: 'string' },
      { name: 'chainId', type: 'uint256' },
      { name: 'verifyingContract', type: 'address' },
    ],
    Person: [
      { name: 'name', type: 'string' },
      { name: 'wallet', type: 'address' },
    ],
    Mail: [
      { name: 'from', type: 'Person' },
      { name: 'to', type: 'Person' },
      { name: 'contents', type: 'string' },
    ],
  },
  primaryType: 'Mail',
  domain: {
    name: 'Ether Mail',
    version: '1',
    chainId: 1,
    verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
  },
  message: {
    from: {
      name: 'Cow',
      wallet: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
    },
    to: {
      name: 'Bob',
      wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
    },
    contents: 'Hello, Bob!',
  },
};

// Permit example (ERC-20 Permit)
export const TYPED_DATA_PERMIT: TypedData = {
  types: {
    EIP712Domain: [
      { name: 'name', type: 'string' },
      { name: 'version', type: 'string' },
      { name: 'chainId', type: 'uint256' },
      { name: 'verifyingContract', type: 'address' },
    ],
    Permit: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
  },
  primaryType: 'Permit',
  domain: {
    name: 'MyToken',
    version: '1',
    chainId: 1,
    verifyingContract: '0x1234567890123456789012345678901234567890',
  },
  message: {
    owner: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
    spender: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
    value: '1000000000000000000',
    nonce: '0',
    deadline: '9999999999',
  },
};

/**
 * SIWE (Sign-In with Ethereum) Test Messages
 */
export const SIWE_MESSAGE_SIMPLE = `example.com wants you to sign in with your Ethereum account:
0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2

I accept the ExampleOrg Terms of Service: https://example.com/tos

URI: https://example.com/login
Version: 1
Chain ID: 1
Nonce: 32891756
Issued At: 2021-09-30T16:25:24Z`;

export const SIWE_MESSAGE_FULL = `service.invalid wants you to sign in with your Ethereum account:
0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2

I accept the ServiceInvalid Terms of Service: https://service.invalid/tos

URI: https://service.invalid/login
Version: 1
Chain ID: 1
Nonce: 32891757
Issued At: 2021-09-30T16:25:24Z
Expiration Time: 2021-09-30T16:35:24Z
Not Before: 2021-09-30T16:20:24Z
Request ID: some-request-id
Resources:
- https://example.com/resource1
- https://example.com/resource2`;

export const SIWE_EXPECTED_SIMPLE = {
  domain: 'example.com',
  address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  statement: 'I accept the ExampleOrg Terms of Service: https://example.com/tos',
  uri: 'https://example.com/login',
  version: '1',
  chainId: 1,
  nonce: '32891756',
  issuedAt: '2021-09-30T16:25:24Z',
};

export const SIWE_EXPECTED_FULL = {
  domain: 'service.invalid',
  address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  statement: 'I accept the ServiceInvalid Terms of Service: https://service.invalid/tos',
  uri: 'https://service.invalid/login',
  version: '1',
  chainId: 1,
  nonce: '32891757',
  issuedAt: '2021-09-30T16:25:24Z',
  expirationTime: '2021-09-30T16:35:24Z',
  notBefore: '2021-09-30T16:20:24Z',
  requestId: 'some-request-id',
  resources: ['https://example.com/resource1', 'https://example.com/resource2'],
};
