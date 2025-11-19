/**
 * Session Service Implementation
 *
 * Manages wallet session state including active account and auto-lock timer.
 */

import { ISessionService, SessionState } from '@/shared/di/interfaces/ISessionService';
import { IStorageService } from '@/shared/di/interfaces/IStorageService';

const SESSION_STORAGE_KEY = 'session';
const AUTO_LOCK_TIMEOUT_KEY = 'auto_lock_timeout';
const DEFAULT_AUTO_LOCK_MINUTES = 5;

export class SessionService implements ISessionService {
  private sessionState: SessionState = {
    activeAddress: null,
    isUnlocked: false,
    lastActivityAt: 0,
    sessionStartedAt: 0,
  };

  private autoLockTimer: NodeJS.Timeout | null = null;
  private autoLockCallback: (() => void) | null = null;
  private currentAutoLockTimeout: number = 0; // Current timer timeout in minutes

  constructor(private storage: IStorageService) {}

  /**
   * Start a new session
   */
  async startSession(defaultAddress?: string): Promise<void> {
    this.sessionState = {
      activeAddress: defaultAddress || null,
      isUnlocked: true,
      lastActivityAt: Date.now(),
      sessionStartedAt: Date.now(),
    };

    await this.saveSession();
  }

  /**
   * End the current session
   */
  async endSession(): Promise<void> {
    this.sessionState = {
      activeAddress: null,
      isUnlocked: false,
      lastActivityAt: 0,
      sessionStartedAt: 0,
    };

    await this.saveSession();
    this.stopAutoLock();
  }

  /**
   * Get current session state
   */
  async getSessionState(): Promise<SessionState> {
    return { ...this.sessionState };
  }

  /**
   * Check if wallet is unlocked
   */
  isUnlocked(): boolean {
    return this.sessionState.isUnlocked;
  }

  /**
   * Get active account address
   */
  async getActiveAddress(): Promise<string | null> {
    return this.sessionState.activeAddress;
  }

  /**
   * Set active account address
   */
  async setActiveAddress(address: string): Promise<void> {
    if (!this.sessionState.isUnlocked) {
      throw new Error('Session not active');
    }

    this.sessionState.activeAddress = address;
    await this.updateActivity();
    await this.saveSession();
  }

  /**
   * Update last activity timestamp
   */
  async updateActivity(): Promise<void> {
    this.sessionState.lastActivityAt = Date.now();
    await this.saveSession();

    // Reset auto-lock timer with current timeout
    if (this.autoLockTimer && this.autoLockCallback) {
      const callback = this.autoLockCallback; // Store callback before stopping
      const timeout = this.currentAutoLockTimeout; // Use current timer's timeout
      this.stopAutoLock();
      if (timeout > 0) {
        this.startAutoLock(timeout, callback);
      }
    }
  }

  /**
   * Start auto-lock timer
   */
  startAutoLock(timeoutMinutes: number, onLock: () => void): void {
    // Clear existing timer
    this.stopAutoLock();

    if (timeoutMinutes <= 0) {
      return;
    }

    this.currentAutoLockTimeout = timeoutMinutes;
    this.autoLockCallback = onLock;
    this.autoLockTimer = setTimeout(() => {
      if (this.sessionState.isUnlocked) {
        onLock();
      }
    }, timeoutMinutes * 60 * 1000);
  }

  /**
   * Stop auto-lock timer
   */
  stopAutoLock(): void {
    if (this.autoLockTimer) {
      clearTimeout(this.autoLockTimer);
      this.autoLockTimer = null;
    }
    this.autoLockCallback = null;
    this.currentAutoLockTimeout = 0;
  }

  /**
   * Get auto-lock timeout in minutes
   */
  async getAutoLockTimeout(): Promise<number> {
    const timeout = await this.storage.get<number>(AUTO_LOCK_TIMEOUT_KEY);
    return timeout ?? DEFAULT_AUTO_LOCK_MINUTES;
  }

  /**
   * Set auto-lock timeout in minutes
   */
  async setAutoLockTimeout(timeoutMinutes: number): Promise<void> {
    if (timeoutMinutes < 0) {
      throw new Error('Timeout must be non-negative');
    }

    await this.storage.set(AUTO_LOCK_TIMEOUT_KEY, timeoutMinutes);

    // Restart auto-lock with new timeout
    if (this.sessionState.isUnlocked && this.autoLockCallback) {
      const callback = this.autoLockCallback; // Store callback before stopping
      this.stopAutoLock();
      if (timeoutMinutes > 0) {
        this.startAutoLock(timeoutMinutes, callback);
      }
    }
  }

  // ========== Private Methods ==========

  private async saveSession(): Promise<void> {
    await this.storage.set(SESSION_STORAGE_KEY, this.sessionState);
  }
}
