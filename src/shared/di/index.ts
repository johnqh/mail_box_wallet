/**
 * DI Module Exports
 *
 * Central export point for dependency injection functionality.
 */

export { container, SERVICE_TOKENS } from './container';
export type { ServiceToken } from './container';
export { registerServices, getService } from './registerServices';

// Interface exports
export type { IStorageService } from './interfaces/IStorageService';
export type { ICryptoService } from './interfaces/ICryptoService';
export type { IWalletService } from './interfaces/IWalletService';
export type { IVaultService, VaultData } from './interfaces/IVaultService';
export type { IKeyringService, Account } from './interfaces/IKeyringService';
export type { ISessionService, SessionState } from './interfaces/ISessionService';
