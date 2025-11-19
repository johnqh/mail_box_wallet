/**
 * Dependency Injection Container
 *
 * Central container for registering and resolving services.
 * Uses @sudobility/di for dependency injection.
 */

import { Container } from '@sudobility/di';

// Create singleton container instance
export const container = new Container();

// Service tokens (used for registration and resolution)
export const SERVICE_TOKENS = {
  STORAGE: 'IStorageService',
  CRYPTO: 'ICryptoService',
  VAULT: 'IVaultService',
  KEYRING: 'IKeyringService',
  SIGNER: 'ISignerService',
  NETWORK: 'INetworkService',
  LOGGER: 'ILoggerService',
} as const;

export type ServiceToken = (typeof SERVICE_TOKENS)[keyof typeof SERVICE_TOKENS];
