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
  // Storage Service - using Chrome extension storage
  container.register<IStorageService>(SERVICE_TOKENS.STORAGE, {
    useFactory: () => new ChromeStorageService(),
    lifecycle: 'singleton',
  });

  // Crypto Service - encryption/decryption and key derivation
  container.register<ICryptoService>(SERVICE_TOKENS.CRYPTO, {
    useFactory: () => new CryptoService(),
    lifecycle: 'singleton',
  });

  // Wallet Service - HD wallet operations (BIP-39/BIP-44)
  container.register<IWalletService>(SERVICE_TOKENS.WALLET, {
    useFactory: () => new WalletService(),
    lifecycle: 'singleton',
  });

  // Vault Service - secure storage of seed phrase
  container.register<IVaultService>(SERVICE_TOKENS.VAULT, {
    useFactory: () => {
      const crypto = container.resolve<ICryptoService>(SERVICE_TOKENS.CRYPTO);
      const storage = container.resolve<IStorageService>(SERVICE_TOKENS.STORAGE);
      return new VaultService(crypto, storage);
    },
    lifecycle: 'singleton',
  });

  // Keyring Service - account management
  container.register<IKeyringService>(SERVICE_TOKENS.KEYRING, {
    useFactory: () => {
      const wallet = container.resolve<IWalletService>(SERVICE_TOKENS.WALLET);
      const storage = container.resolve<IStorageService>(SERVICE_TOKENS.STORAGE);
      return new KeyringService(wallet, storage);
    },
    lifecycle: 'singleton',
  });

  // Session Service - session state and auto-lock
  container.register<ISessionService>(SERVICE_TOKENS.SESSION, {
    useFactory: () => {
      const storage = container.resolve<IStorageService>(SERVICE_TOKENS.STORAGE);
      return new SessionService(storage);
    },
    lifecycle: 'singleton',
  });

  // Network Service - blockchain network management
  container.register<INetworkService>(SERVICE_TOKENS.NETWORK, {
    useFactory: () => {
      const storage = container.resolve<IStorageService>(SERVICE_TOKENS.STORAGE);
      const networkService = new NetworkService(storage);
      // Initialize immediately (async operation will complete in background)
      networkService.initialize().catch((error) => {
        console.error('Failed to initialize NetworkService:', error);
      });
      return networkService;
    },
    lifecycle: 'singleton',
  });

  // Signer Service - message signing (EIP-191, EIP-712, SIWE)
  container.register<ISignerService>(SERVICE_TOKENS.SIGNER, {
    useFactory: () => new SignerService(),
    lifecycle: 'singleton',
  });

  console.log('✓ Core services registered in DI container');
}

/**
 * Resolve a service from the container
 */
export function getService<T>(token: string): T {
  return container.resolve<T>(token);
}
