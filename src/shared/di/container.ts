/**
 * Dependency Injection Container
 *
 * Central container for registering and resolving services.
 */

/**
 * Simple DI Container implementation
 */
class Container {
  private services = new Map<string, unknown>();

  register<T>(token: string, service: T): void {
    this.services.set(token, service);
  }

  resolve<T>(token: string): T {
    const service = this.services.get(token);
    if (!service) {
      throw new Error(`Service not found for token: ${token}`);
    }
    return service as T;
  }

  has(token: string): boolean {
    return this.services.has(token);
  }
}

// Create singleton container instance
export const container = new Container();

// Service tokens (used for registration and resolution)
export const SERVICE_TOKENS = {
  STORAGE: 'IStorageService',
  CRYPTO: 'ICryptoService',
  WALLET: 'IWalletService',
  VAULT: 'IVaultService',
  KEYRING: 'IKeyringService',
  SESSION: 'ISessionService',
  SIGNER: 'ISignerService',
  NETWORK: 'INetworkService',
  LOGGER: 'ILoggerService',
} as const;

export type ServiceToken = (typeof SERVICE_TOKENS)[keyof typeof SERVICE_TOKENS];
