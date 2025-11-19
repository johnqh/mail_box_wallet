/**
 * Storage Service Interface
 *
 * Abstraction for browser storage (chrome.storage.local).
 * Allows for easy testing with mock implementations.
 */

export interface IStorageService {
  /**
   * Get a value from storage
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set a value in storage
   */
  set<T>(key: string, value: T): Promise<void>;

  /**
   * Remove a value from storage
   */
  remove(key: string): Promise<void>;

  /**
   * Clear all storage
   */
  clear(): Promise<void>;

  /**
   * Get all keys
   */
  keys(): Promise<string[]>;
}
