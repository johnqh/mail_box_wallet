/**
 * Service Registration
 *
 * Registers all application services in the DI container.
 * Call this function once during app initialization.
 */

import { container, SERVICE_TOKENS } from './container';
import { ChromeStorageService } from '../services/ChromeStorageService';
import { CryptoService } from '../services/CryptoService';
import { WalletService } from '../services/WalletService';
import { VaultService } from '../services/VaultService';
import { KeyringService } from '../services/KeyringService';
import { SessionService } from '../services/SessionService';
import { NetworkService } from '../services/NetworkService';
import { IStorageService } from './interfaces/IStorageService';
import { ICryptoService } from './interfaces/ICryptoService';
import { IWalletService } from './interfaces/IWalletService';
import { IVaultService } from './interfaces/IVaultService';
import { IKeyringService } from './interfaces/IKeyringService';
import { ISessionService } from './interfaces/ISessionService';
import { INetworkService } from './interfaces/INetworkService';
import { ISignerService } from './interfaces/ISignerService';
import { SignerService } from '../services/SignerService';

/**
 * Register all core services
 */
export function registerServices(): void {
  // Skip if already registered
  if (container.has(SERVICE_TOKENS.STORAGE)) {
    return;
  }

  // Storage Service - using Chrome extension storage
  container.register<IStorageService>(SERVICE_TOKENS.STORAGE, new ChromeStorageService());

  // Crypto Service - encryption/decryption and key derivation
  container.register<ICryptoService>(SERVICE_TOKENS.CRYPTO, new CryptoService());

  // Wallet Service - HD wallet operations (BIP-39/BIP-44)
  container.register<IWalletService>(SERVICE_TOKENS.WALLET, new WalletService());

  // Vault Service - secure storage of seed phrase
  const crypto = container.resolve<ICryptoService>(SERVICE_TOKENS.CRYPTO);
  const storage = container.resolve<IStorageService>(SERVICE_TOKENS.STORAGE);
  container.register<IVaultService>(SERVICE_TOKENS.VAULT, new VaultService(crypto, storage));

  // Keyring Service - account management
  const wallet = container.resolve<IWalletService>(SERVICE_TOKENS.WALLET);
  container.register<IKeyringService>(SERVICE_TOKENS.KEYRING, new KeyringService(wallet, storage));

  // Session Service - session state and auto-lock
  container.register<ISessionService>(SERVICE_TOKENS.SESSION, new SessionService(storage));

  // Network Service - blockchain network management
  const networkService = new NetworkService(storage);
  // Initialize immediately (async operation will complete in background)
  networkService.initialize().catch((error) => {
    console.error('Failed to initialize NetworkService:', error);
  });
  container.register<INetworkService>(SERVICE_TOKENS.NETWORK, networkService);

  // Signer Service - message signing (EIP-191, EIP-712, SIWE)
  container.register<ISignerService>(SERVICE_TOKENS.SIGNER, new SignerService());

  console.log('✓ Core services registered in DI container');
}

/**
 * Resolve a service from the container
 */
export function getService<T>(token: string): T {
  return container.resolve<T>(token);
}
