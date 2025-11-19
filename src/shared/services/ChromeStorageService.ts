/**
 * Chrome Storage Service Implementation
 *
 * Wrapper around chrome.storage.local API for persistent storage.
 */

import { IStorageService } from '@/shared/di/interfaces/IStorageService';
import browser from 'webextension-polyfill';

export class ChromeStorageService implements IStorageService {
  /**
   * Get a value from storage
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const result = await browser.storage.local.get(key);
      return (result[key] as T) ?? null;
    } catch (error) {
      console.error(`Failed to get ${key} from storage:`, error);
      return null;
    }
  }

  /**
   * Set a value in storage
   */
  async set<T>(key: string, value: T): Promise<void> {
    try {
      await browser.storage.local.set({ [key]: value });
    } catch (error) {
      console.error(`Failed to set ${key} in storage:`, error);
      throw new Error(`Storage error: Failed to save ${key}`);
    }
  }

  /**
   * Remove a value from storage
   */
  async remove(key: string): Promise<void> {
    try {
      await browser.storage.local.remove(key);
    } catch (error) {
      console.error(`Failed to remove ${key} from storage:`, error);
      throw new Error(`Storage error: Failed to remove ${key}`);
    }
  }

  /**
   * Clear all storage
   */
  async clear(): Promise<void> {
    try {
      await browser.storage.local.clear();
    } catch (error) {
      console.error('Failed to clear storage:', error);
      throw new Error('Storage error: Failed to clear storage');
    }
  }

  /**
   * Get all keys
   */
  async keys(): Promise<string[]> {
    try {
      const result = await browser.storage.local.get(null);
      return Object.keys(result);
    } catch (error) {
      console.error('Failed to get storage keys:', error);
      return [];
    }
  }
}
