import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SessionService } from '@/shared/services/SessionService';
import { IStorageService } from '@/shared/di/interfaces/IStorageService';

// Mock Storage Service
class MockStorageService implements IStorageService {
  private storage: Map<string, unknown> = new Map();

  async get<T>(key: string): Promise<T | null> {
    return (this.storage.get(key) as T) ?? null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.storage.set(key, value);
  }

  async remove(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }

  async keys(): Promise<string[]> {
    return Array.from(this.storage.keys());
  }
}

describe('SessionService', () => {
  let sessionService: SessionService;
  let storageService: MockStorageService;

  const TEST_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

  beforeEach(() => {
    storageService = new MockStorageService();
    sessionService = new SessionService(storageService);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('startSession', () => {
    it('should start a new session', async () => {
      await sessionService.startSession(TEST_ADDRESS);

      const state = await sessionService.getSessionState();
      expect(state.isUnlocked).toBe(true);
      expect(state.activeAddress).toBe(TEST_ADDRESS);
      expect(state.sessionStartedAt).toBeGreaterThan(0);
      expect(state.lastActivityAt).toBeGreaterThan(0);
    });

    it('should start session without default address', async () => {
      await sessionService.startSession();

      const state = await sessionService.getSessionState();
      expect(state.isUnlocked).toBe(true);
      expect(state.activeAddress).toBeNull();
    });

    it('should update session timestamps', async () => {
      const startTime = Date.now();
      await sessionService.startSession(TEST_ADDRESS);

      const state = await sessionService.getSessionState();
      expect(state.sessionStartedAt).toBeGreaterThanOrEqual(startTime);
      expect(state.lastActivityAt).toBeGreaterThanOrEqual(startTime);
    });
  });

  describe('endSession', () => {
    beforeEach(async () => {
      await sessionService.startSession(TEST_ADDRESS);
    });

    it('should end the session', async () => {
      await sessionService.endSession();

      const state = await sessionService.getSessionState();
      expect(state.isUnlocked).toBe(false);
      expect(state.activeAddress).toBeNull();
      expect(state.sessionStartedAt).toBe(0);
      expect(state.lastActivityAt).toBe(0);
    });

    it('should stop auto-lock timer', async () => {
      const lockCallback = vi.fn();
      sessionService.startAutoLock(1, lockCallback);

      await sessionService.endSession();

      // Fast-forward past auto-lock timeout
      vi.advanceTimersByTime(2 * 60 * 1000);

      expect(lockCallback).not.toHaveBeenCalled();
    });
  });

  describe('getSessionState', () => {
    it('should return session state', async () => {
      await sessionService.startSession(TEST_ADDRESS);

      const state = await sessionService.getSessionState();

      expect(state).toHaveProperty('activeAddress');
      expect(state).toHaveProperty('isUnlocked');
      expect(state).toHaveProperty('lastActivityAt');
      expect(state).toHaveProperty('sessionStartedAt');
    });

    it('should return copy of session state', async () => {
      await sessionService.startSession(TEST_ADDRESS);

      const state1 = await sessionService.getSessionState();
      const state2 = await sessionService.getSessionState();

      expect(state1).not.toBe(state2); // Different objects
      expect(state1).toEqual(state2); // Same content
    });
  });

  describe('isUnlocked', () => {
    it('should return false initially', () => {
      expect(sessionService.isUnlocked()).toBe(false);
    });

    it('should return true after starting session', async () => {
      await sessionService.startSession(TEST_ADDRESS);

      expect(sessionService.isUnlocked()).toBe(true);
    });

    it('should return false after ending session', async () => {
      await sessionService.startSession(TEST_ADDRESS);
      await sessionService.endSession();

      expect(sessionService.isUnlocked()).toBe(false);
    });
  });

  describe('getActiveAddress', () => {
    it('should return null initially', async () => {
      const address = await sessionService.getActiveAddress();

      expect(address).toBeNull();
    });

    it('should return active address', async () => {
      await sessionService.startSession(TEST_ADDRESS);

      const address = await sessionService.getActiveAddress();

      expect(address).toBe(TEST_ADDRESS);
    });

    it('should return null after session ends', async () => {
      await sessionService.startSession(TEST_ADDRESS);
      await sessionService.endSession();

      const address = await sessionService.getActiveAddress();

      expect(address).toBeNull();
    });
  });

  describe('setActiveAddress', () => {
    beforeEach(async () => {
      await sessionService.startSession(TEST_ADDRESS);
    });

    it('should set active address', async () => {
      const newAddress = '0x1234567890123456789012345678901234567890';

      await sessionService.setActiveAddress(newAddress);

      const address = await sessionService.getActiveAddress();
      expect(address).toBe(newAddress);
    });

    it('should update last activity timestamp', async () => {
      const stateBefore = await sessionService.getSessionState();

      // Wait a bit
      vi.advanceTimersByTime(1000);

      await sessionService.setActiveAddress('0x1234567890123456789012345678901234567890');

      const stateAfter = await sessionService.getSessionState();
      expect(stateAfter.lastActivityAt).toBeGreaterThan(stateBefore.lastActivityAt);
    });

    it('should throw error if session not active', async () => {
      await sessionService.endSession();

      await expect(
        sessionService.setActiveAddress('0x1234567890123456789012345678901234567890')
      ).rejects.toThrow('Session not active');
    });
  });

  describe('updateActivity', () => {
    beforeEach(async () => {
      await sessionService.startSession(TEST_ADDRESS);
    });

    it('should update last activity timestamp', async () => {
      const stateBefore = await sessionService.getSessionState();

      vi.advanceTimersByTime(1000);
      await sessionService.updateActivity();

      const stateAfter = await sessionService.getSessionState();
      expect(stateAfter.lastActivityAt).toBeGreaterThan(stateBefore.lastActivityAt);
    });

    it('should reset auto-lock timer', async () => {
      const lockCallback = vi.fn();
      sessionService.startAutoLock(1, lockCallback);

      // Wait 50 seconds (almost timeout)
      vi.advanceTimersByTime(50 * 1000);

      // Update activity (should reset timer)
      await sessionService.updateActivity();

      // Wait another 50 seconds (would timeout if not reset)
      vi.advanceTimersByTime(50 * 1000);

      // Should not have locked yet
      expect(lockCallback).not.toHaveBeenCalled();

      // Wait remaining 10 seconds (total 60 from reset)
      vi.advanceTimersByTime(10 * 1000);

      // Should lock now
      expect(lockCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('Auto-lock functionality', () => {
    beforeEach(async () => {
      await sessionService.startSession(TEST_ADDRESS);
    });

    describe('startAutoLock', () => {
      it('should trigger callback after timeout', async () => {
        const lockCallback = vi.fn();

        sessionService.startAutoLock(1, lockCallback); // 1 minute

        // Fast-forward time
        vi.advanceTimersByTime(60 * 1000);

        expect(lockCallback).toHaveBeenCalledTimes(1);
      });

      it('should not trigger callback before timeout', async () => {
        const lockCallback = vi.fn();

        sessionService.startAutoLock(5, lockCallback); // 5 minutes

        // Fast-forward 4 minutes
        vi.advanceTimersByTime(4 * 60 * 1000);

        expect(lockCallback).not.toHaveBeenCalled();
      });

      it('should not trigger callback if timeout is 0', async () => {
        const lockCallback = vi.fn();

        sessionService.startAutoLock(0, lockCallback); // Disabled

        vi.advanceTimersByTime(10 * 60 * 1000);

        expect(lockCallback).not.toHaveBeenCalled();
      });

      it('should replace existing timer', async () => {
        const callback1 = vi.fn();
        const callback2 = vi.fn();

        sessionService.startAutoLock(1, callback1);
        sessionService.startAutoLock(2, callback2); // Replace

        // Fast-forward 1 minute
        vi.advanceTimersByTime(60 * 1000);

        expect(callback1).not.toHaveBeenCalled();
        expect(callback2).not.toHaveBeenCalled();

        // Fast-forward another minute (2 minutes total)
        vi.advanceTimersByTime(60 * 1000);

        expect(callback1).not.toHaveBeenCalled();
        expect(callback2).toHaveBeenCalledTimes(1);
      });

      it('should only trigger if session is unlocked', async () => {
        const lockCallback = vi.fn();

        sessionService.startAutoLock(1, lockCallback);

        // Manually end session before timeout
        await sessionService.endSession();

        // Fast-forward past timeout
        vi.advanceTimersByTime(2 * 60 * 1000);

        expect(lockCallback).not.toHaveBeenCalled();
      });
    });

    describe('stopAutoLock', () => {
      it('should stop auto-lock timer', async () => {
        const lockCallback = vi.fn();

        sessionService.startAutoLock(1, lockCallback);
        sessionService.stopAutoLock();

        // Fast-forward past timeout
        vi.advanceTimersByTime(2 * 60 * 1000);

        expect(lockCallback).not.toHaveBeenCalled();
      });

      it('should be safe to call multiple times', () => {
        sessionService.stopAutoLock();
        sessionService.stopAutoLock();

        // Should not throw
        expect(sessionService.isUnlocked()).toBe(true);
      });
    });

    describe('getAutoLockTimeout', () => {
      it('should return default timeout', async () => {
        const timeout = await sessionService.getAutoLockTimeout();

        expect(timeout).toBe(5); // Default 5 minutes
      });

      it('should return custom timeout', async () => {
        await sessionService.setAutoLockTimeout(10);

        const timeout = await sessionService.getAutoLockTimeout();

        expect(timeout).toBe(10);
      });
    });

    describe('setAutoLockTimeout', () => {
      it('should set timeout', async () => {
        await sessionService.setAutoLockTimeout(15);

        const timeout = await sessionService.getAutoLockTimeout();

        expect(timeout).toBe(15);
      });

      it('should allow disabling auto-lock (0 minutes)', async () => {
        await sessionService.setAutoLockTimeout(0);

        const timeout = await sessionService.getAutoLockTimeout();

        expect(timeout).toBe(0);
      });

      it('should reject negative timeout', async () => {
        await expect(sessionService.setAutoLockTimeout(-1)).rejects.toThrow(
          'Timeout must be non-negative'
        );
      });

      it('should restart timer with new timeout', async () => {
        const lockCallback = vi.fn();

        sessionService.startAutoLock(5, lockCallback);

        // Change timeout to 1 minute
        await sessionService.setAutoLockTimeout(1);

        // Fast-forward 1 minute
        vi.advanceTimersByTime(60 * 1000);

        expect(lockCallback).toHaveBeenCalledTimes(1);
      });

      it('should persist timeout', async () => {
        await sessionService.setAutoLockTimeout(20);

        // Create new session service with same storage
        const newSessionService = new SessionService(storageService);
        const timeout = await newSessionService.getAutoLockTimeout();

        expect(timeout).toBe(20);
      });
    });
  });

  describe('Full workflow', () => {
    it('should handle complete session lifecycle', async () => {
      // Start session
      await sessionService.startSession(TEST_ADDRESS);
      expect(sessionService.isUnlocked()).toBe(true);

      // Switch active account
      const newAddress = '0x9999999999999999999999999999999999999999';
      await sessionService.setActiveAddress(newAddress);
      expect(await sessionService.getActiveAddress()).toBe(newAddress);

      // Set custom auto-lock timeout
      await sessionService.setAutoLockTimeout(2);
      expect(await sessionService.getAutoLockTimeout()).toBe(2);

      // Start auto-lock
      const lockCallback = vi.fn();
      sessionService.startAutoLock(2, lockCallback);

      // Activity before timeout
      vi.advanceTimersByTime(60 * 1000); // 1 minute
      await sessionService.updateActivity();

      // Wait for timeout from last activity
      vi.advanceTimersByTime(2 * 60 * 1000); // 2 minutes

      // Should have locked
      expect(lockCallback).toHaveBeenCalledTimes(1);

      // End session
      await sessionService.endSession();
      expect(sessionService.isUnlocked()).toBe(false);
      expect(await sessionService.getActiveAddress()).toBeNull();
    });
  });
});
