/**
 * Wallet Store
 *
 * Zustand store for wallet state management
 */

import { create } from 'zustand';
import browser from 'webextension-polyfill';
import { getService, SERVICE_TOKENS } from '@/shared/di';
import type { IVaultService, IKeyringService, ISessionService, Account } from '@/shared/di';

interface WalletState {
  // Wallet initialization state
  isInitialized: boolean;
  isUnlocked: boolean;

  // Onboarding state
  onboardingStep: 'welcome' | 'create' | 'import' | 'password' | 'seedphrase' | 'confirm' | 'complete' | null;
  tempSeedPhrase: string | null;
  tempPassword: string | null;

  // Current wallet state
  currentAddress: string | null;
  accounts: Account[];

  // Actions
  checkInitialization: () => Promise<void>;
  createWallet: (password: string, seedPhrase: string) => Promise<void>;
  unlockWallet: (password: string) => Promise<void>;
  lockWallet: () => Promise<void>;
  switchAccount: (address: string) => void;
  setOnboardingStep: (step: WalletState['onboardingStep']) => void;
  setTempSeedPhrase: (seedPhrase: string | null) => void;
  setTempPassword: (password: string | null) => void;
  reset: () => void;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  isInitialized: false,
  isUnlocked: false,
  onboardingStep: null,
  tempSeedPhrase: null,
  tempPassword: null,
  currentAddress: null,
  accounts: [],

  checkInitialization: async () => {
    try {
      const vaultService = getService<IVaultService>(SERVICE_TOKENS.VAULT);
      const sessionService = getService<ISessionService>(SERVICE_TOKENS.SESSION);

      const hasVault = await vaultService.exists();
      const session = await sessionService.getSessionState();

      set({
        isInitialized: hasVault,
        isUnlocked: session.isUnlocked,
        onboardingStep: hasVault ? null : 'welcome',
      });
    } catch (error) {
      console.error('Failed to check initialization:', error);
      set({
        isInitialized: false,
        isUnlocked: false,
        onboardingStep: 'welcome',
      });
    }
  },

  createWallet: async (password: string, seedPhrase: string) => {
    try {
      const vaultService = getService<IVaultService>(SERVICE_TOKENS.VAULT);
      const keyringService = getService<IKeyringService>(SERVICE_TOKENS.KEYRING);
      const sessionService = getService<ISessionService>(SERVICE_TOKENS.SESSION);

      // Create vault with seed phrase
      await vaultService.create(password, seedPhrase);

      // Unlock vault
      const unlockedSeedPhrase = await vaultService.unlock(password);

      // Initialize keyring
      await keyringService.initialize(unlockedSeedPhrase);

      // Create first account
      const account = await keyringService.createAccount('Account 1');

      // Start session
      await sessionService.startSession();

      set({
        isInitialized: true,
        isUnlocked: true,
        onboardingStep: 'complete',
        currentAddress: account.address,
        tempSeedPhrase: null,
        tempPassword: null,
      });
    } catch (error) {
      console.error('Failed to create wallet:', error);
      throw error;
    }
  },

  unlockWallet: async (password: string) => {
    try {
      const vaultService = getService<IVaultService>(SERVICE_TOKENS.VAULT);
      const keyringService = getService<IKeyringService>(SERVICE_TOKENS.KEYRING);
      const sessionService = getService<ISessionService>(SERVICE_TOKENS.SESSION);

      // Unlock vault in popup context
      const seedPhrase = await vaultService.unlock(password);

      // Initialize keyring in popup context
      await keyringService.initialize(seedPhrase);

      // Get accounts
      const accounts = await keyringService.getAccounts();

      // Start session in popup context
      await sessionService.startSession();

      // Also unlock wallet in background context for signing operations
      try {
        await browser.runtime.sendMessage({
          type: 'UNLOCK_WALLET',
          payload: { password },
        });
      } catch (error) {
        console.error('Failed to unlock wallet in background:', error);
        // Don't fail the unlock if background unlock fails
        // The background can still derive keys from storage when needed
      }

      set({
        isUnlocked: true,
        currentAddress: accounts[0]?.address || null,
        accounts,
      });
    } catch (error) {
      console.error('Failed to unlock wallet:', error);
      throw error;
    }
  },

  lockWallet: async () => {
    try {
      const vaultService = getService<IVaultService>(SERVICE_TOKENS.VAULT);
      const keyringService = getService<IKeyringService>(SERVICE_TOKENS.KEYRING);
      const sessionService = getService<ISessionService>(SERVICE_TOKENS.SESSION);

      // Lock vault
      await vaultService.lock();

      // Lock keyring
      await keyringService.lock();

      // End session
      await sessionService.endSession();

      set({
        isUnlocked: false,
        currentAddress: null,
        accounts: [],
      });
    } catch (error) {
      console.error('Failed to lock wallet:', error);
      throw error;
    }
  },

  switchAccount: (address: string) => {
    const { accounts } = get();
    const account = accounts.find((a) => a.address.toLowerCase() === address.toLowerCase());
    if (account) {
      set({ currentAddress: account.address });
    }
  },

  setOnboardingStep: (step) => set({ onboardingStep: step }),

  setTempSeedPhrase: (seedPhrase) => set({ tempSeedPhrase: seedPhrase }),

  setTempPassword: (password) => set({ tempPassword: password }),

  reset: () => set({
    isInitialized: false,
    isUnlocked: false,
    onboardingStep: 'welcome',
    tempSeedPhrase: null,
    tempPassword: null,
    currentAddress: null,
    accounts: [],
  }),
}));
