# Crypto Wallet Browser Extension - Technical Design & Implementation Plan

## Executive Summary

A secure, identity-focused crypto wallet browser extension that supports EVM chains (initially) and Solana (future). The wallet prioritizes signing operations for authentication and identity use cases while explicitly rejecting transaction operations.

**Core Philosophy**: Security-first identity wallet, not a transaction wallet.

**Developer Experience Philosophy**: Every phase should be independently testable, debuggable, and demonstrable.

---

## Requirements

### Functional Requirements
1. **Blockchain Support**: EVM chains initially, Solana in later phase
2. **Security**:
   - Private keys stored encrypted and inaccessible to web apps
   - Encryption key stored separately from encrypted data
   - Secure key derivation using password + biometrics
3. **Identity-Focused Operations**:
   - ✅ Text signing (personal_sign)
   - ✅ Typed data signing (EIP-712 / eth_signTypedData_v4)
   - ✅ Sign-In with Ethereum (SIWE)
   - ❌ Transaction signing (eth_sendTransaction) - explicitly rejected
4. **Seed Phrase Management**: Export/import 12 or 24 word mnemonics
5. **Account Management**: Multiple accounts from single seed phrase
6. **Network Support**: Multi-chain EVM with custom RPC endpoints
7. **dApp Integration**: Inject provider for web apps to request signatures
8. **Cross-Platform**: Chrome/Chromium, Firefox, Safari
9. **UX**: Polished, professional interface (similar to MetaMask quality)

---

## Technical Architecture

### 1. Technology Stack

#### Core Technologies
- **Language**: TypeScript
- **UI Framework**: React 18+
- **Build Tool**: Vite with [@crxjs/vite-plugin](https://crxjs.dev/vite-plugin)
- **Styling**: TailwindCSS + @sudobility/design_system
- **UI Components**: @sudobility/components (reusable component library)
- **Dependency Injection**:
  - @sudobility/di (DI interfaces and contracts)
  - @sudobility/di_web (concrete implementations for browser/web)
- **State Management**: Zustand (lightweight, no boilerplate)
- **Extension API**: webextension-polyfill (cross-browser compatibility)

#### Blockchain Libraries
- **Ethereum**: [viem](https://viem.sh) - Modern, lightweight, type-safe
  - Better tree-shaking than ethers.js
  - TypeScript-first design
  - Built-in utilities for signing, ABI encoding, etc.
- **Solana** (Phase 8): @solana/web3.js
- **Wallet Utilities**:
  - `@scure/bip39` - Mnemonic generation/validation (secure, audited)
  - `@scure/bip32` - HD key derivation (BIP-32/BIP-44)
  - `@noble/hashes` - PBKDF2 for key derivation
  - `@noble/ciphers` - AES-256-GCM encryption

#### Development & Testing Tools
- **Testing**: Vitest + React Testing Library + Playwright (E2E)
- **Debugging**:
  - Redux DevTools (for Zustand)
  - React DevTools
  - Chrome Extension DevTools
  - Custom debug console UI
- **Linting**: ESLint + Prettier
- **Type Checking**: TypeScript strict mode
- **Git Hooks**: Husky + lint-staged
- **Logging**: Custom logger with levels (debug, info, warn, error)
- **Mocking**: MSW (Mock Service Worker) for RPC calls

---

### 2. Extension Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        WEB PAGE                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Inpage Script (window.ethereum or custom NS)      │    │
│  └───────────────┬────────────────────────────────────┘    │
│                  │ window.postMessage                       │
│  ┌───────────────▼────────────────────────────────────┐    │
│  │  Content Script (bridge)                           │    │
│  └───────────────┬────────────────────────────────────┘    │
└──────────────────┼──────────────────────────────────────────┘
                   │ chrome.runtime.sendMessage
┌──────────────────▼──────────────────────────────────────────┐
│              EXTENSION ENVIRONMENT                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Background Service Worker (Manifest V3)            │   │
│  │  - Vault management (encryption/decryption)         │   │
│  │  - Account management                                │   │
│  │  - Signing logic                                     │   │
│  │  - Network management                                │   │
│  │  - In-memory session keys                            │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Popup UI (React SPA)                                │   │
│  │  - Account management                                 │   │
│  │  - Network selection                                  │   │
│  │  - Settings                                           │   │
│  │  - Signing approvals                                  │   │
│  │  - DEBUG PANEL (dev mode only)                       │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  chrome.storage.local                                │   │
│  │  - encryptedVault                                    │   │
│  │  - accounts metadata                                 │   │
│  │  - networks configuration                            │   │
│  │  - settings                                          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### Components Breakdown

##### Background Service Worker
- **Purpose**: Core business logic, security-sensitive operations
- **Responsibilities**:
  - Manage encrypted vault (lock/unlock)
  - Handle signing requests from dApps
  - Derive and manage private keys (in-memory when unlocked)
  - Network RPC communication
  - Session management (auto-lock timer)
- **Security**:
  - Private keys NEVER leave this context
  - Session keys cleared on lock
  - No external network access except RPC calls

##### Content Script
- **Purpose**: Bridge between web page and extension
- **Responsibilities**:
  - Inject inpage script into web page
  - Relay messages between inpage script and background
  - Per-tab state management
- **Injection**: Runs in isolated world (cannot access page JS directly)

##### Inpage Script
- **Purpose**: Provide dApp-facing API
- **Responsibilities**:
  - Expose `window.ethereum` (or custom namespace like `window.identityWallet`)
  - Implement EIP-1193 provider interface
  - Queue requests to content script
  - Emit events (accountsChanged, chainChanged, etc.)
- **Security**: Runs in page context but is isolated from page JS modifications

##### Popup UI
- **Purpose**: User-facing interface
- **Responsibilities**:
  - Wallet setup/onboarding
  - Account creation/management
  - Network management
  - Approve/reject signing requests
  - Export/import seed phrases
  - Settings configuration
  - **Debug panel** (dev mode)

---

### 3. Security Architecture

#### 3.1 Encryption Strategy

```
User Password
     │
     ▼
[PBKDF2: 100k iterations + unique salt]
     │
     ▼
Master Encryption Key (256-bit)
     │
     ▼
[AES-256-GCM Encryption]
     │
     ▼
Encrypted Vault → chrome.storage.local
```

**Storage Scheme**:
```typescript
// chrome.storage.local structure
{
  "vault": {
    "ciphertext": "...",  // Encrypted seed phrase
    "iv": "...",          // Initialization vector
    "salt": "...",        // Salt for PBKDF2
    "version": 1          // Vault version for migrations
  },
  "accounts": [
    {
      "address": "0x...",
      "name": "Account 1",
      "derivationPath": "m/44'/60'/0'/0/0",
      "index": 0,
      "chainType": "evm"
    }
  ],
  "networks": [...],
  "settings": {
    "autoLockMinutes": 5,
    "biometricEnabled": false,
    ...
  }
}
```

**Biometric Authentication**:
```
User enables biometric → WebAuthn registration
     │
     ▼
Master password encrypted with WebAuthn credential
     │
     ▼
Stored in chrome.storage.local separately
     │
     ▼
On unlock: WebAuthn challenge → decrypt password → derive key → unlock vault
```

#### 3.2 Key Derivation Paths

**Ethereum (BIP-44)**:
```
m/44'/60'/0'/0/0  - Account 1
m/44'/60'/0'/0/1  - Account 2
m/44'/60'/0'/0/2  - Account 3
...
```

**Solana (BIP-44)** (Phase 8):
```
m/44'/501'/0'/0'  - Account 1
m/44'/501'/1'/0'  - Account 2
...
```

#### 3.3 Security Principles

1. **Principle of Least Privilege**:
   - Content scripts have minimal permissions
   - Only background worker handles private keys
   - Inpage script is completely untrusted

2. **Defense in Depth**:
   - Password protection (what you know)
   - Biometric protection (what you are)
   - Auto-lock timeout
   - Rate limiting on signing requests

3. **Data Minimization**:
   - Private keys only in memory when unlocked
   - No logging of sensitive data
   - Clear session data on lock

4. **Transaction Rejection**:
   - Explicit blocklist for transaction methods
   - Clear user communication about wallet purpose
   - Suggest alternative wallets for transactions

---

### 4. Provider Injection (EIP-1193 Compliance)

#### 4.1 Provider Interface

```typescript
interface IdentityWalletProvider {
  // EIP-1193 standard
  request(args: { method: string; params?: any[] }): Promise<any>;
  on(event: string, handler: (...args: any[]) => void): void;
  removeListener(event: string, handler: (...args: any[]) => void): void;

  // Properties
  isIdentityWallet: boolean;
  isMetaMask: false;  // Don't pretend to be MetaMask
  chainId: string;    // Current chain ID (hex)
  selectedAddress: string | null;

  // Events
  // - accountsChanged
  // - chainChanged
  // - connect
  // - disconnect
  // - message
}
```

#### 4.2 Supported Methods

**✅ Allowed (Identity Operations)**:
- `eth_accounts` - Get connected accounts
- `eth_requestAccounts` - Request account access
- `eth_chainId` - Get current chain ID
- `personal_sign` - Sign arbitrary message
- `eth_signTypedData_v4` - Sign typed data (EIP-712)
- `wallet_switchEthereumChain` - Switch network
- `wallet_addEthereumChain` - Add custom network
- `wallet_watchAsset` - Watch token (metadata only, no balance tracking)

**❌ Rejected (Transaction Operations)**:
- `eth_sendTransaction` → **Reject with helpful error message**
- `eth_sendRawTransaction` → **Reject**
- `eth_signTransaction` → **Reject**
- All other transaction-related methods

**Error Response for Transactions**:
```json
{
  "code": 4001,
  "message": "Identity Wallet does not support transactions. Please use a transaction wallet like MetaMask, Rainbow, or Coinbase Wallet for sending transactions."
}
```

#### 4.3 Communication Flow

```
dApp: window.ethereum.request({ method: 'personal_sign', params: [...] })
  │
  ▼
Inpage Script: Validate request, assign ID
  │
  ▼
window.postMessage({ type: 'IDENTITY_WALLET_REQUEST', ... })
  │
  ▼
Content Script: Receive, forward to background
  │
  ▼
chrome.runtime.sendMessage({ type: 'SIGN_REQUEST', ... })
  │
  ▼
Background Worker: Validate, check if transaction method
  │
  ├─ If transaction → Reject immediately
  │
  └─ If signing → Open popup for approval
       │
       ▼
     User approves/rejects in popup
       │
       ▼
     Background signs with private key
       │
       ▼
     Send response back through chain
       │
       ▼
     dApp receives signed message
```

---

### 5. Network Management

#### 5.1 Pre-configured Networks

```typescript
const DEFAULT_NETWORKS = [
  {
    chainId: '0x1',
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://eth.llamarpc.com',
    blockExplorerUrl: 'https://etherscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
  },
  {
    chainId: '0xaa36a7',
    name: 'Sepolia Testnet',
    rpcUrl: 'https://rpc.sepolia.org',
    blockExplorerUrl: 'https://sepolia.etherscan.io',
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 }
  },
  {
    chainId: '0x89',
    name: 'Polygon Mainnet',
    rpcUrl: 'https://polygon-rpc.com',
    blockExplorerUrl: 'https://polygonscan.com',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 }
  },
  {
    chainId: '0xa4b1',
    name: 'Arbitrum One',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    blockExplorerUrl: 'https://arbiscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
  },
  // Add more popular networks...
];
```

#### 5.2 Custom RPC Support

- Users can add any EVM-compatible network
- Validation: Check chainId matches network response
- Security warnings for unknown networks
- Allow editing/removing custom networks

---

### 6. Project Structure

```
mail_box_wallet/
├── src/
│   ├── background/           # Background service worker
│   │   ├── index.ts          # Entry point
│   │   ├── vault.ts          # Encryption/decryption logic
│   │   ├── keyring.ts        # Key derivation, account management
│   │   ├── signer.ts         # Signing operations
│   │   ├── network.ts        # Network management
│   │   ├── message-handler.ts # Handle messages from content/popup
│   │   └── session.ts        # Session management, auto-lock
│   ├── content/              # Content script
│   │   ├── index.ts          # Entry point
│   │   └── bridge.ts         # Message relay logic
│   ├── inpage/               # Inpage script
│   │   ├── index.ts          # Provider implementation
│   │   └── provider.ts       # EIP-1193 provider class
│   ├── popup/                # React popup UI
│   │   ├── App.tsx           # Main app component
│   │   ├── main.tsx          # Entry point
│   │   ├── pages/            # Page components
│   │   │   ├── Onboarding/   # Setup flow
│   │   │   ├── Home/         # Main view
│   │   │   ├── Accounts/     # Account management
│   │   │   ├── Networks/     # Network management
│   │   │   ├── Settings/     # Settings
│   │   │   ├── Approval/     # Signing approval
│   │   │   └── Debug/        # Debug panel (dev mode)
│   │   ├── components/       # Reusable components
│   │   ├── hooks/            # Custom React hooks
│   │   └── store/            # Zustand stores
│   ├── shared/               # Shared code
│   │   ├── types/            # TypeScript types
│   │   ├── constants/        # Constants (networks, etc.)
│   │   ├── crypto/           # Crypto utilities
│   │   ├── utils/            # Helper functions
│   │   ├── logger/           # Debug logger
│   │   ├── messaging/        # Message types & helpers
│   │   ├── di/               # Dependency Injection
│   │   │   ├── interfaces/   # DI interfaces (using @sudobility/di)
│   │   │   └── providers/    # DI providers configuration
│   │   └── services/         # Service implementations (using @sudobility/di_web)
│   └── manifest.json         # Extension manifest (V3)
├── public/
│   ├── icons/                # Extension icons
│   └── _locales/             # i18n (if needed)
├── plans/
│   └── WALLET.md            # This document
├── tests/
│   ├── unit/                 # Unit tests
│   ├── integration/          # Integration tests
│   ├── e2e/                  # End-to-end tests
│   ├── fixtures/             # Test data & mocks
│   └── utils/                # Test utilities
├── scripts/                  # Development scripts
│   ├── dev-setup.ts          # Setup test data
│   ├── test-signing.ts       # Test signing flows
│   ├── mock-dapp.html        # Mock dApp for testing
│   └── reset-storage.ts      # Clear extension storage
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

### 7. Dependency Injection Architecture

#### 7.1 Overview

The wallet uses **@sudobility/di** for dependency injection to:
- Decouple business logic from implementation details
- Enable easy testing with mock implementations
- Support different environments (extension, web, mobile in future)
- Improve code reusability and maintainability

#### 7.2 DI Layers

**Layer 1: Interfaces (@sudobility/di)**
- Define contracts for services (IStorageService, INetworkService, etc.)
- Platform-agnostic interface definitions
- No concrete implementations

**Layer 2: Implementations (@sudobility/di_web)**
- Concrete implementations for browser/web environment
- Extension-specific implementations (chrome.storage, etc.)
- Can be swapped for testing or different platforms

**Layer 3: Providers**
- Configure and register services
- Set up dependency graph
- Manage service lifecycle

#### 7.3 Service Architecture

```typescript
// src/shared/di/interfaces/IStorageService.ts
import { injectable } from '@sudobility/di';

@injectable()
export interface IStorageService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

// src/shared/services/ChromeStorageService.ts
import { StorageService } from '@sudobility/di_web';
import { IStorageService } from '@/shared/di/interfaces/IStorageService';

export class ChromeStorageService extends StorageService implements IStorageService {
  // Extension-specific implementation using chrome.storage.local
}

// src/shared/di/providers/index.ts
import { Container } from '@sudobility/di';
import { ChromeStorageService } from '@/shared/services/ChromeStorageService';

export const container = new Container();
container.register('IStorageService', ChromeStorageService);
```

#### 7.4 Key Services

Services to be implemented with DI:

1. **IStorageService** - chrome.storage.local abstraction
2. **INetworkService** - RPC calls and network management
3. **ICryptoService** - Encryption/decryption operations
4. **IKeyringService** - Key derivation and management
5. **ISignerService** - Signing operations
6. **IVaultService** - Vault encryption and storage
7. **ILoggerService** - Logging (already implemented, will migrate to DI)

#### 7.5 Benefits

**Testability:**
```typescript
// In tests, inject mock implementations
const mockStorage = new MockStorageService();
container.register('IStorageService', () => mockStorage);

// Test with controlled environment
```

**Flexibility:**
```typescript
// Different implementations for different contexts
// Extension context: ChromeStorageService
// Test context: MockStorageService
// Future mobile: AsyncStorageService
```

**Type Safety:**
```typescript
// TypeScript ensures interface compliance
const storage = container.resolve<IStorageService>('IStorageService');
// storage is fully typed with autocomplete
```

---

### 8. UI Component Architecture

#### 8.1 Design System (@sudobility/design_system)

Use design system for consistent styling across the wallet:

```typescript
import { theme, variants } from '@sudobility/design_system';

// Use design tokens
const Button = styled.button`
  background: ${theme.colors.primary};
  padding: ${theme.spacing.md};
  border-radius: ${theme.radii.md};
`;

// Use variants
<Button variant={variants.button.primary}>Connect</Button>
```

**Key Design Tokens:**
- Colors: primary, secondary, success, warning, danger, neutral
- Spacing: xs, sm, md, lg, xl
- Typography: heading, body, caption, code
- Radii: sm, md, lg, full
- Shadows: sm, md, lg

#### 8.2 Reusable Components (@sudobility/components)

Prefer using components from @sudobility/components:

**Available Components:**
- `Button` - Primary, secondary, danger variants
- `Input` - Text, password, number inputs
- `Card` - Container component
- `Modal` - Dialog/modal overlays
- `List` - Scrollable lists
- `Badge` - Status indicators
- `Spinner` - Loading states
- `Alert` - Notifications
- `Dropdown` - Select menus
- `Checkbox`, `Radio`, `Switch` - Form controls

**Example Usage:**
```typescript
import { Button, Card, Input, Modal } from '@sudobility/components';
import { variants } from '@sudobility/design_system';

function AccountSetup() {
  return (
    <Card>
      <Input
        placeholder="Account name"
        variant={variants.input.default}
      />
      <Button
        variant={variants.button.primary}
        onClick={handleCreate}
      >
        Create Account
      </Button>
    </Card>
  );
}
```

**Custom Components:**
Only create custom components when:
- The component is wallet-specific (SeedPhraseDisplay, AccountList, etc.)
- @sudobility/components doesn't have the needed component
- Specific customization is required

**Component Guidelines:**
- Use @sudobility/components for generic UI (buttons, inputs, cards)
- Use @sudobility/design_system variants for styling
- Create custom components in `src/popup/components/` for wallet-specific UI
- All custom components should use design system tokens

#### 8.3 Component Structure

```
src/popup/
├── components/           # Wallet-specific components
│   ├── SeedPhraseDisplay.tsx
│   ├── AccountCard.tsx
│   ├── NetworkSelector.tsx
│   └── SigningRequest.tsx
├── pages/               # Page components
│   ├── Onboarding/
│   │   ├── CreateWallet.tsx      # Uses @sudobility/components
│   │   ├── ImportWallet.tsx
│   │   └── SeedPhraseConfirm.tsx
│   └── Home/
│       └── Dashboard.tsx
```

---

## Developer Experience & Testing Strategy

### 1. Development Environment Setup

Each phase will include:

1. **Hot Reload**: Vite HMR for instant feedback
2. **Type Safety**: TypeScript strict mode catches errors early
3. **Logging**: Structured logging with levels
4. **Debug UI**: In-extension debug panel
5. **Mock Data**: Pre-populated test accounts/networks
6. **Test Scripts**: CLI commands to test functionality

### 2. Debug Tools

#### Debug Logger
```typescript
// src/shared/logger/index.ts
import debug from 'debug';

export const logger = {
  background: debug('wallet:background'),
  content: debug('wallet:content'),
  inpage: debug('wallet:inpage'),
  popup: debug('wallet:popup'),
  crypto: debug('wallet:crypto'),
  network: debug('wallet:network'),
};

// Enable in dev: localStorage.debug = 'wallet:*'
```

#### Debug Panel (Popup UI)
- View current vault state
- View all accounts & keys (dev mode only)
- View message queue
- Clear storage
- Import test data
- Trigger signing flows manually
- View logs

#### Test Page
```html
<!-- scripts/mock-dapp.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Mock dApp - Wallet Testing</title>
</head>
<body>
  <h1>Mock dApp for Testing</h1>

  <button onclick="testConnect()">Connect Wallet</button>
  <button onclick="testPersonalSign()">Test personal_sign</button>
  <button onclick="testTypedData()">Test eth_signTypedData_v4</button>
  <button onclick="testSIWE()">Test SIWE</button>
  <button onclick="testTransaction()">Test Transaction (should fail)</button>
  <button onclick="testSwitchChain()">Switch to Polygon</button>

  <div id="results"></div>
  <div id="logs"></div>

  <script src="mock-dapp.js"></script>
</body>
</html>
```

### 3. Testing Infrastructure

#### Unit Tests (Vitest)
```typescript
// tests/unit/vault.test.ts
import { describe, it, expect } from 'vitest';
import { Vault } from '@/background/vault';

describe('Vault', () => {
  it('should encrypt and decrypt seed phrase', async () => {
    const password = 'testPassword123';
    const seedPhrase = 'test test test test test test test test test test test junk';

    const vault = new Vault();
    const encrypted = await vault.create(password, seedPhrase);

    expect(encrypted.ciphertext).toBeDefined();
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.salt).toBeDefined();

    const decrypted = await vault.unlock(password, encrypted);
    expect(decrypted).toBe(seedPhrase);
  });

  it('should fail with wrong password', async () => {
    const vault = new Vault();
    const encrypted = await vault.create('correct', 'seed phrase');

    await expect(
      vault.unlock('wrong', encrypted)
    ).rejects.toThrow();
  });
});
```

#### Integration Tests
```typescript
// tests/integration/signing-flow.test.ts
import { test, expect } from 'vitest';
import { setupTestWallet } from '../utils/setup';

test('complete signing flow', async () => {
  const wallet = await setupTestWallet();

  // Simulate dApp request
  const request = {
    method: 'personal_sign',
    params: ['0x48656c6c6f', '0x123...'],
  };

  const signature = await wallet.handleRequest(request);
  expect(signature).toMatch(/^0x[0-9a-f]{130}$/);

  // Verify signature
  const isValid = await wallet.verifySignature(
    '0x48656c6c6f',
    signature,
    '0x123...'
  );
  expect(isValid).toBe(true);
});
```

#### E2E Tests (Playwright)
```typescript
// tests/e2e/onboarding.spec.ts
import { test, expect } from '@playwright/test';

test('onboarding flow creates wallet', async ({ page, context }) => {
  // Load extension
  const extensionId = await loadExtension(context);
  await page.goto(`chrome-extension://${extensionId}/popup.html`);

  // Click "Create New Wallet"
  await page.click('button:has-text("Create New Wallet")');

  // Select 12 words
  await page.click('text=12 words');

  // Get seed phrase
  const seedPhrase = await page.locator('[data-testid="seed-phrase"]').textContent();
  expect(seedPhrase.split(' ')).toHaveLength(12);

  // Continue
  await page.click('button:has-text("I saved my seed phrase")');

  // Confirm seed phrase (select 3 random words)
  // ... verification steps ...

  // Set password
  await page.fill('[data-testid="password"]', 'SecurePass123!');
  await page.fill('[data-testid="confirm-password"]', 'SecurePass123!');
  await page.click('button:has-text("Create Wallet")');

  // Should see home screen
  await expect(page.locator('text=Account 1')).toBeVisible();
});
```

### 4. Development Scripts

#### Package.json Scripts
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest",
    "test:e2e": "playwright test",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest --coverage",
    "type-check": "tsc --noEmit",
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",

    "dev:setup": "tsx scripts/dev-setup.ts",
    "dev:reset": "tsx scripts/reset-storage.ts",
    "dev:mock-dapp": "vite scripts/mock-dapp --port 3000",
    "dev:test-sign": "tsx scripts/test-signing.ts",

    "build:chrome": "vite build --mode chrome",
    "build:firefox": "vite build --mode firefox",
    "build:safari": "vite build --mode safari"
  }
}
```

#### Test Data Setup Script
```typescript
// scripts/dev-setup.ts
import { createTestWallet } from '../tests/utils/setup';

async function setup() {
  console.log('Setting up development environment...');

  const wallet = await createTestWallet({
    password: 'dev123',
    seedPhrase: 'test test test test test test test test test test test junk',
    accounts: 3,
    networks: ['ethereum', 'polygon', 'sepolia'],
  });

  console.log('✅ Wallet created');
  console.log('Password: dev123');
  console.log('Accounts:', wallet.accounts.map(a => a.address));

  // Pre-unlock for development
  await wallet.unlock();
  console.log('✅ Wallet unlocked');
}

setup().catch(console.error);
```

---

## Implementation Plan

### Phase 1: Project Foundation & Dev Tools (Week 1) ✅ COMPLETED

**Goal**: Set up development environment with excellent DX from day 1

**Tasks**:
1. Initialize project with Vite + React + TypeScript
2. Configure @crxjs/vite-plugin for extension build
3. Set up Manifest V3 configuration
4. Install core dependencies
5. Configure ESLint, Prettier, Husky
6. Set up folder structure
7. **Implement debug logger**
8. **Create debug panel UI component**
9. **Set up Vitest with example tests**
10. **Create mock dApp HTML page**
11. Verify hot reload works

**Testing & Debugging**:
- ✅ Extension loads and reloads on file changes
- ✅ Debug logger works (console.log alternative)
- ✅ Can open debug panel in popup
- ✅ Mock dApp page serves locally
- ✅ TypeScript errors show in IDE

**Deliverables**:
- ✅ Extension loads in browser
- ✅ Hot reload working
- ✅ Debug panel accessible
- ✅ Mock dApp ready for testing
- ✅ First unit test passing

---

### Phase 2: Cryptography & Vault (Week 2) ✅ COMPLETED

**Goal**: Implement secure storage with DI architecture and comprehensive tests

**Tasks**:
1. Install @sudobility/di, @sudobility/di_web packages
2. Set up DI container and service registration
3. Define ICryptoService and IStorageService interfaces
4. Implement PBKDF2 key derivation (in CryptoService)
5. Implement AES-256-GCM encryption/decryption
6. Create IVaultService interface and VaultService implementation
7. Implement seed phrase generation (12/24 words)
8. Implement ChromeStorageService (using @sudobility/di_web)
9. **Comprehensive unit tests with mocks (>90% coverage)**
10. **CLI test script for crypto operations**
11. **Add crypto debug commands to debug panel**

**DI Architecture**:
```typescript
// Define interfaces
interface ICryptoService {
  encrypt(data: string, key: string): Promise<EncryptedData>;
  decrypt(encrypted: EncryptedData, key: string): Promise<string>;
  deriveKey(password: string, salt: string): Promise<string>;
}

interface IVaultService {
  create(password: string, seedPhrase: string): Promise<void>;
  unlock(password: string): Promise<string>;
  lock(): Promise<void>;
}

// Register services
container.register('ICryptoService', CryptoService);
container.register('IVaultService', VaultService);
container.register('IStorageService', ChromeStorageService);
```

**Testing & Debugging**:
```bash
# CLI testing
npm run dev:test-crypto

# Options:
# - Generate seed phrase
# - Encrypt/decrypt with password
# - Test key derivation
# - Benchmark encryption speed
```

**Debug Panel Features**:
- Generate test seed phrase
- Encrypt/decrypt test data
- View vault contents (dev mode only)
- Clear vault

**Unit Tests**:
- ✅ Seed phrase generation (12/24 words, valid checksums)
- ✅ PBKDF2 derivation (correct key length, salt uniqueness)
- ✅ AES encryption/decryption (round-trip, different IVs)
- ✅ Wrong password rejection
- ✅ Password change
- ✅ Vault import/export

**Deliverables**:
- ✅ All crypto functions tested
- ✅ >90% code coverage on vault module
- ✅ CLI test script working
- ✅ Debug panel shows vault state

---

### Phase 3: Account Management (Week 3) ✅ COMPLETED

**Goal**: HD wallet derivation with testable account system

**Tasks**:
1. Implement HD key derivation (BIP-32/BIP-44)
2. Create Keyring class
3. Account metadata management
4. Session management
5. Auto-lock timer
6. **Unit tests for all keyring operations**
7. **Integration tests for vault + keyring**
8. **Dev setup script to create test accounts**

**Testing & Debugging**:
```bash
# Setup test wallet with accounts
npm run dev:setup

# Creates wallet with:
# - Password: "dev123"
# - 3 accounts pre-generated
# - Known seed phrase for consistency
```

**Debug Panel Features**:
- List all accounts
- Show derivation paths
- View private keys (dev mode warning)
- Derive new account
- Import account
- Lock/unlock wallet manually
- Reset auto-lock timer

**Unit Tests**:
- ✅ HD derivation (correct addresses for known seed)
- ✅ Multiple accounts from one seed
- ✅ Account metadata persistence
- ✅ Private key retrieval
- ✅ Session lock clears memory
- ✅ Auto-lock timer works

**Integration Tests**:
- ✅ Create wallet → derive accounts → lock → unlock
- ✅ Import wallet → verify accounts match

**Deliverables**:
- ✅ Can derive accounts predictably
- ✅ Known test seed phrase gives known addresses
- ✅ Dev setup script creates consistent state
- ✅ All tests passing
- ✅ Debug panel shows all account info

---

### Phase 4: Network Management (Week 4) ✅ COMPLETED

**Goal**: Multi-chain support with easy testing

**Tasks**:
1. Define Network types
2. Implement default networks
3. Custom network CRUD
4. Network validation (RPC connectivity check)
5. **Unit tests for network validation**
6. **Mock RPC responses for testing**
7. **Network test script**

**Testing & Debugging**:
```bash
# Test network connectivity
npm run dev:test-network

# Options:
# - Test all default networks
# - Add custom network
# - Test RPC calls (eth_chainId, eth_blockNumber)
# - Mock RPC responses
```

**Debug Panel Features**:
- List all networks
- Test RPC connectivity
- View current network
- Add/edit/delete networks
- Switch networks
- Force RPC call (manual testing)

**Unit Tests**:
- ✅ Network validation (chainId format, URL format)
- ✅ RPC connectivity check
- ✅ Add/edit/delete networks
- ✅ Network switching

**Mock RPC Setup** (MSW):
```typescript
// tests/mocks/rpc.ts
import { setupWorker, rest } from 'msw';

export const handlers = [
  rest.post('https://eth.llamarpc.com', (req, res, ctx) => {
    const { method } = req.body as any;

    if (method === 'eth_chainId') {
      return res(ctx.json({ jsonrpc: '2.0', id: 1, result: '0x1' }));
    }
    // ... more methods
  }),
];
```

**Deliverables**:
- ✅ Network validation works
- ✅ Mock RPC for testing
- ✅ Network test script
- ✅ Debug panel shows network state
- ✅ Can test without real RPC calls

---

### Phase 5: Signing Implementation (Week 5) ✅ COMPLETED

**Goal**: Core signing with extensive test cases

**Tasks**:
1. ✅ Implement personal_sign
2. ✅ Implement eth_signTypedData_v4
3. ✅ SIWE message parsing
4. ✅ Message verification
5. ✅ Comprehensive test cases for signing (29 tests)
6. ✅ Known test vectors
7. ✅ Signing service with DI integration

**Testing & Debugging**:
```bash
# Test signing operations
npm run dev:test-sign

# Interactive prompts:
# 1. Select signing method
# 2. Enter message
# 3. See signature
# 4. Verify signature
```

**Test Vectors**:
```typescript
// tests/fixtures/signing.ts
export const SIGNING_TEST_VECTORS = [
  {
    method: 'personal_sign',
    message: '0x48656c6c6f',  // "Hello"
    account: '0x...',
    expectedSignature: '0x...',
  },
  {
    method: 'eth_signTypedData_v4',
    typedData: { /* EIP-712 data */ },
    account: '0x...',
    expectedSignature: '0x...',
  },
  // ... more test vectors
];
```

**Debug Panel Features**:
- Sign arbitrary message
- Test all signing methods
- Verify signatures
- View signing history (session only)
- Import test vectors
- Export signature for verification

**Unit Tests**:
- ✅ personal_sign with known inputs
- ✅ eth_signTypedData_v4 with EIP-712 examples
- ✅ SIWE message parsing
- ✅ Signature verification
- ✅ Invalid inputs rejected

**Deliverables**:
- ✅ All signing methods work
- ✅ Test vectors pass
- ✅ Can sign & verify manually
- ✅ 29 signing tests passing
- ✅ >90% coverage on signing module

**Implementation Details**:
- **SignerService**: personal_sign, signTypedData, signature recovery, SIWE parsing
- **EIP-712**: Full type encoding with dependency resolution
- **Tests**: 29 comprehensive tests with test vectors
- **Libraries**: @noble/secp256k1, @noble/hashes
- **Commit**: `c22ddfc` - 6 files changed, 1276 insertions

---

### Phase 6: Provider Injection (Week 6) ✅ COMPLETED

**Goal**: dApp integration with easy local testing

**Tasks**:
1. ✅ Implement inpage script (EIP-1193 provider)
2. ✅ Implement content script bridge
3. ✅ Background message routing
4. ✅ Connection flow
5. ✅ Method allow/blocklist
6. ✅ Provider unit tests (13 tests)
7. ✅ Mock dApp test page ready

**Testing & Debugging**:
```bash
# Start mock dApp server
npm run dev:mock-dapp

# Opens http://localhost:3000 with test buttons
# Extension injects provider automatically
```

**Mock dApp Features**:
- Connect button → `eth_requestAccounts`
- Sign message button → `personal_sign`
- Sign typed data button → `eth_signTypedData_v4`
- SIWE button → special SIWE message
- Send transaction button → should fail with helpful message
- Switch chain button → `wallet_switchEthereumChain`
- Event listeners → show accountsChanged, chainChanged
- Request history → log all requests/responses

**Debug Panel Features**:
- View injected provider state
- View connected sites
- View pending requests
- Simulate disconnection
- Clear connected sites
- View message queue

**E2E Tests**:
```typescript
// tests/e2e/provider.spec.ts
test('dApp can connect and sign', async ({ page, context }) => {
  // Load mock dApp
  await page.goto('http://localhost:3000');

  // Click connect
  await page.click('button:has-text("Connect")');

  // Extension popup should open
  const popup = await context.waitForEvent('page');
  await popup.click('button:has-text("Connect")');

  // dApp should show connected address
  await expect(page.locator('[data-testid="connected-account"]')).toBeVisible();

  // Click sign
  await page.click('button:has-text("Sign Message")');

  // Approve in popup
  const popup2 = await context.waitForEvent('page');
  await popup2.click('button:has-text("Sign")');

  // dApp should show signature
  await expect(page.locator('[data-testid="signature"]')).toBeVisible();
});
```

**Deliverables**:
- ✅ Provider injected successfully
- ✅ Mock dApp can connect
- ✅ All signing methods work end-to-end
- ✅ Transaction methods rejected properly
- ✅ 13 provider unit tests passing
- ✅ Easy to test locally

**Implementation Details**:
- **Inpage**: EIP-1193 compliant `IdentityWalletProvider` class with event emitters
- **Content**: Message bridge with proper filtering and correlation
- **Background**: `MessageHandler` service with method allow/blocklist
- **Types**: Complete EIP-1193 and messaging type definitions
- **Tests**: 250 total tests passing (237 existing + 13 new provider tests)
- **Commit**: `0d2c841` - 9 files changed, 1241 insertions

---

### Phase 7: Popup UI - Onboarding (Week 7)

**Goal**: Polished onboarding using @sudobility components and design system

**Tasks**:
1. Design onboarding flow
2. Implement all onboarding screens using @sudobility/components
3. Apply @sudobility/design_system variants for consistent styling
4. Form validation
5. **Storybook for all components**
6. **Accessibility testing**
7. **E2E test for full onboarding**

**Component Usage**:
- Use `Button`, `Input`, `Card` from @sudobility/components
- Use `variants.button.primary`, `variants.input.default` from @sudobility/design_system
- Create custom wallet-specific components (SeedPhraseDisplay, etc.) in `src/popup/components/`
- Apply design tokens (`theme.colors`, `theme.spacing`) for custom styling

**Testing & Debugging**:
```bash
# Run Storybook
npm run storybook

# View all components in isolation
# Test different states (loading, error, success)
```

**Storybook Stories**:
```typescript
// src/popup/components/SeedPhraseDisplay.stories.tsx
export default {
  title: 'Onboarding/SeedPhraseDisplay',
  component: SeedPhraseDisplay,
};

export const TwelveWords = {
  args: {
    seedPhrase: 'test test test test test test test test test test test junk',
    onConfirm: action('confirmed'),
  },
};

export const TwentyFourWords = {
  args: {
    seedPhrase: '...',
  },
};
```

**Debug Panel Features**:
- Reset onboarding state
- Skip to any onboarding step
- Import seed phrase for testing
- Auto-fill password fields (dev mode)

**E2E Tests**:
- ✅ Complete onboarding flow (12 words)
- ✅ Complete onboarding flow (24 words)
- ✅ Import existing wallet
- ✅ Seed phrase confirmation validation
- ✅ Password strength validation

**Deliverables**:
- ✅ Full onboarding flow
- ✅ All components in Storybook
- ✅ E2E test passing
- ✅ Accessible (keyboard nav, screen reader)
- ✅ Can reset & retry onboarding

---

### Phase 8-15: Continuing Pattern

Each subsequent phase follows the same developer-friendly approach:

**For Every Phase**:
1. **Unit tests first** (TDD where possible)
2. **Dependency Injection** for all services (using @sudobility/di)
3. **Storybook stories** for UI components
4. **Use @sudobility/components** for generic UI elements
5. **Apply @sudobility/design_system** variants for styling
6. **Debug panel features** for manual testing
7. **CLI scripts** for automated testing
8. **E2E tests** for critical flows
9. **Mock data** for consistent testing
10. **Documentation** in code comments

**Component & Architecture Guidelines**:
- All IO operations through DI interfaces (IStorageService, INetworkService, etc.)
- Concrete implementations using @sudobility/di_web
- UI components from @sudobility/components where possible
- Custom components only for wallet-specific features
- Design tokens from @sudobility/design_system for all styling

**Example Phase Checklist**:
```markdown
## Phase X: [Feature Name]

### Implementation
- [ ] Core functionality
- [ ] Error handling
- [ ] Loading states

### Testing
- [ ] Unit tests (>80% coverage)
- [ ] Integration tests
- [ ] E2E test (if applicable)
- [ ] Storybook stories (if UI)

### Debugging
- [ ] Debug panel features
- [ ] CLI test script
- [ ] Mock data
- [ ] Test fixtures

### Documentation
- [ ] Code comments
- [ ] README section
- [ ] API documentation
```

---

## Testing & Debugging Checklist

### Before Each Phase
- [ ] Review previous phase tests
- [ ] Ensure all tests still pass
- [ ] Update mock data if needed
- [ ] Check debug panel still works

### During Each Phase
- [ ] Write tests as you code (TDD)
- [ ] Test in debug panel manually
- [ ] Use CLI scripts for quick checks
- [ ] Check hot reload still works
- [ ] Monitor console for errors

### After Each Phase
- [ ] Run full test suite
- [ ] Check code coverage (>80% target)
- [ ] Test in actual extension environment
- [ ] Test on mock dApp
- [ ] Update debug panel
- [ ] Update documentation

---

## Development Commands Reference

```bash
# Development
npm run dev                    # Start dev server with hot reload
npm run dev:setup              # Create test wallet with accounts
npm run dev:reset              # Clear all extension storage
npm run dev:mock-dapp          # Start mock dApp server

# Testing
npm run test                   # Run unit tests
npm run test:watch             # Run tests in watch mode
npm run test:e2e               # Run E2E tests
npm run test:coverage          # Generate coverage report

# Testing Scripts
npm run dev:test-crypto        # Test crypto operations
npm run dev:test-network       # Test network connectivity
npm run dev:test-sign          # Test signing operations

# UI Development
npm run storybook              # Run Storybook

# Building
npm run build                  # Build for production
npm run build:chrome           # Build for Chrome
npm run build:firefox          # Build for Firefox
npm run build:safari           # Build for Safari

# Code Quality
npm run lint                   # Run linter
npm run lint:fix               # Fix linting issues
npm run type-check             # TypeScript type checking
```

---

## Debug Panel Features Summary

The debug panel (`/popup/pages/Debug`) should include:

### General
- Extension version
- Current environment (dev/prod)
- Clear all storage button

### Vault & Accounts
- View vault state (encrypted/decrypted)
- View all accounts with addresses
- View private keys (with warning)
- Lock/unlock manually
- Import seed phrase
- Export seed phrase

### Crypto Operations
- Generate seed phrase
- Encrypt/decrypt test data
- Test key derivation
- Benchmark operations

### Network
- View current network
- List all networks
- Test RPC connectivity
- Force RPC call
- View RPC call history

### Signing
- Sign arbitrary message
- Test all signing methods
- View signature
- Verify signature
- Signing history (session)

### Provider
- View injected provider state
- View connected sites
- View pending requests
- Simulate events
- Clear connections

### Logs
- View all logs (with filtering)
- Export logs
- Clear logs

### Test Data
- Import test fixtures
- Load test vectors
- Reset to known state

---

## Testing Best Practices

### 1. Use Known Test Vectors

Always test with predictable data:
```typescript
// tests/fixtures/constants.ts
export const TEST_SEED_PHRASE =
  'test test test test test test test test test test test junk';

export const TEST_PASSWORD = 'TestPassword123!';

export const EXPECTED_ACCOUNTS = [
  { index: 0, address: '0x...' },
  { index: 1, address: '0x...' },
];
```

### 2. Mock External Dependencies

Never rely on real RPC endpoints in tests:
```typescript
// tests/setup.ts
import { setupServer } from 'msw/node';
import { handlers } from './mocks/rpc';

export const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### 3. Test in Isolation

Each test should be independent:
```typescript
beforeEach(async () => {
  // Clear storage
  await chrome.storage.local.clear();

  // Reset state
  await resetWalletState();
});
```

### 4. Readable Test Names

```typescript
// ❌ Bad
test('test1', () => { /* ... */ });

// ✅ Good
test('should reject eth_sendTransaction with helpful error message', () => {
  /* ... */
});
```

### 5. Test Edge Cases

Don't just test the happy path:
```typescript
describe('Vault.unlock', () => {
  it('should unlock with correct password', () => { /* ... */ });
  it('should reject with wrong password', () => { /* ... */ });
  it('should reject with empty password', () => { /* ... */ });
  it('should reject with null password', () => { /* ... */ });
  it('should reject if vault is corrupted', () => { /* ... */ });
});
```

---

## Security Testing

### Security Test Checklist (Phase 12)

- [ ] Private keys never in chrome.storage
- [ ] Private keys cleared from memory on lock
- [ ] No sensitive data in console.log (production builds)
- [ ] CSP configured correctly
- [ ] Origins validated for signing requests
- [ ] Rate limiting on signing requests
- [ ] Transaction methods properly blocked
- [ ] Seed phrase confirmation required
- [ ] Password strength enforced
- [ ] Auto-lock timer works
- [ ] Biometric fallback to password

### Penetration Testing Scenarios

1. **Try to extract private key from storage**
   - Expected: Only encrypted data found

2. **Try to sign transaction**
   - Expected: Rejected with error message

3. **Try XSS in dApp**
   - Expected: Isolated from extension context

4. **Memory dump when locked**
   - Expected: No private keys found

5. **Phishing simulation**
   - Expected: Clear origin display, warnings

---

## Performance Benchmarks

Target performance metrics:

| Operation | Target | Test Method |
|-----------|--------|-------------|
| Unlock wallet | <1s | Unit test |
| Derive account | <100ms | Unit test |
| personal_sign | <500ms | Integration test |
| eth_signTypedData_v4 | <500ms | Integration test |
| Switch network | <200ms | Integration test |
| Open popup | <300ms | E2E test |
| Inject provider | <100ms | E2E test |

Add performance tests:
```typescript
// tests/performance/signing.bench.ts
import { bench, describe } from 'vitest';

describe('signing performance', () => {
  bench('personal_sign', async () => {
    await signer.personalSign(message, account);
  });

  bench('eth_signTypedData_v4', async () => {
    await signer.signTypedData(typedData, account);
  });
});
```

---

## Conclusion

This wallet extension prioritizes **developer experience** alongside security and functionality. Every phase includes:

1. ✅ **Comprehensive tests** - Unit, integration, E2E
2. ✅ **Debug tools** - Panel, CLI scripts, mock dApp
3. ✅ **Mock data** - Consistent test fixtures
4. ✅ **Easy testing** - One command to test any feature
5. ✅ **Fast feedback** - Hot reload, watch mode
6. ✅ **Documentation** - Code comments, README

This approach ensures you can:
- Catch bugs early
- Test features in isolation
- Debug issues quickly
- Iterate rapidly
- Build with confidence

**Estimated Timeline**: 15-16 weeks (4 months) for MVP with Solana support

**Recommended Team**: 1-2 developers (with strong DX focus)

---

*Document Version: 2.0*
*Last Updated: 2025-11-19*
*Author: Claude (Anthropic)*
