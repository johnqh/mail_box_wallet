/**
 * Session Service Interface
 *
 * Manages wallet session state including active account and auto-lock.
 */

export interface SessionState {
  /** Currently active account address */
  activeAddress: string | null;

  /** Whether wallet is currently unlocked */
  isUnlocked: boolean;

  /** Last activity timestamp (for auto-lock) */
  lastActivityAt: number;

  /** Session start timestamp */
  sessionStartedAt: number;
}

export interface ISessionService {
  /**
   * Start a new session (called after vault unlock)
   * @param defaultAddress - Initial active address
   */
  startSession(defaultAddress?: string): Promise<void>;

  /**
   * End the current session (lock wallet)
   */
  endSession(): Promise<void>;

  /**
   * Get current session state
   */
  getSessionState(): Promise<SessionState>;

  /**
   * Check if wallet is unlocked
   */
  isUnlocked(): boolean;

  /**
   * Get active account address
   */
  getActiveAddress(): Promise<string | null>;

  /**
   * Set active account address
   * @param address - Account address to activate
   */
  setActiveAddress(address: string): Promise<void>;

  /**
   * Update last activity timestamp (resets auto-lock timer)
   */
  updateActivity(): Promise<void>;

  /**
   * Start auto-lock timer
   * @param timeoutMinutes - Timeout in minutes
   * @param onLock - Callback when auto-lock triggers
   */
  startAutoLock(timeoutMinutes: number, onLock: () => void): void;

  /**
   * Stop auto-lock timer
   */
  stopAutoLock(): void;

  /**
   * Get auto-lock timeout in minutes
   */
  getAutoLockTimeout(): Promise<number>;

  /**
   * Set auto-lock timeout in minutes
   * @param timeoutMinutes - Timeout in minutes (0 = disabled)
   */
  setAutoLockTimeout(timeoutMinutes: number): Promise<void>;
}
