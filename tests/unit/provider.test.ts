/**
 * Provider Unit Tests
 *
 * Tests for the EIP-1193 provider implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IdentityWalletProvider } from '@/inpage/provider';
import {
  MessageType,
  MessageTarget,
  ProviderResponseMessage,
  ProviderErrorMessage,
  ProviderEventMessage,
} from '@/shared/types/messaging';
import { ProviderRpcErrorCode } from '@/shared/types/eip1193';

describe('IdentityWalletProvider', () => {
  let provider: IdentityWalletProvider;
  let postMessageSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Setup window.postMessage spy
    postMessageSpy = vi.spyOn(window, 'postMessage');

    // Create provider instance
    provider = new IdentityWalletProvider();
  });

  describe('Provider Identification', () => {
    it('should identify as Identity Wallet', () => {
      expect(provider.isIdentityWallet).toBe(true);
    });

    it('should not impersonate MetaMask', () => {
      expect(provider.isMetaMask).toBe(false);
    });
  });

  describe('Request Method', () => {
    it('should send request via postMessage', () => {
      provider.request({
        method: 'eth_accounts',
        params: [],
      });

      // Verify postMessage was called with correct structure
      expect(postMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          target: MessageTarget.CONTENT_SCRIPT,
          type: MessageType.PROVIDER_REQUEST,
          payload: {
            method: 'eth_accounts',
            params: [],
          },
          id: expect.any(String),
        }),
        '*'
      );
    });

    it('should reject invalid request without method', async () => {
      await expect(provider.request({} as any)).rejects.toThrow(
        'Invalid request: method must be a string'
      );
    });

    it('should generate unique request IDs', () => {
      provider.request({ method: 'test1' });
      provider.request({ method: 'test2' });

      const call1 = postMessageSpy.mock.calls[postMessageSpy.mock.calls.length - 2];
      const call2 = postMessageSpy.mock.calls[postMessageSpy.mock.calls.length - 1];

      const id1 = (call1[0] as any).id;
      const id2 = (call2[0] as any).id;

      expect(id1).not.toBe(id2);
    });
  });

  describe('Event Handling', () => {
    it('should add event listener', () => {
      const listener = vi.fn();
      provider.on('accountsChanged', listener);

      // Simulate event
      const event: ProviderEventMessage = {
        id: '123',
        target: MessageTarget.INPAGE,
        type: MessageType.PROVIDER_EVENT,
        payload: {
          event: 'accountsChanged',
          data: ['0xNewAddress'],
        },
      };

      window.dispatchEvent(new MessageEvent('message', { data: event, source: window }));

      expect(listener).toHaveBeenCalledWith(['0xNewAddress']);
    });

    it('should remove event listener', () => {
      const listener = vi.fn();

      provider.on('accountsChanged', listener);
      provider.removeListener('accountsChanged', listener);

      // Simulate event
      const event: ProviderEventMessage = {
        id: '123',
        target: MessageTarget.INPAGE,
        type: MessageType.PROVIDER_EVENT,
        payload: {
          event: 'accountsChanged',
          data: ['0xNewAddress'],
        },
      };

      window.dispatchEvent(new MessageEvent('message', { data: event, source: window }));

      expect(listener).not.toHaveBeenCalled();
    });

    it('should update selectedAddress on accountsChanged event', () => {
      const event: ProviderEventMessage = {
        id: '123',
        target: MessageTarget.INPAGE,
        type: MessageType.PROVIDER_EVENT,
        payload: {
          event: 'accountsChanged',
          data: ['0xNewAddress'],
        },
      };

      window.dispatchEvent(new MessageEvent('message', { data: event, source: window }));

      expect(provider.selectedAddress).toBe('0xNewAddress');
    });

    it('should update chainId on chainChanged event', () => {
      const event: ProviderEventMessage = {
        id: '123',
        target: MessageTarget.INPAGE,
        type: MessageType.PROVIDER_EVENT,
        payload: {
          event: 'chainChanged',
          data: '0x89',
        },
      };

      window.dispatchEvent(new MessageEvent('message', { data: event, source: window }));

      expect(provider.chainId).toBe('0x89');
    });

    it('should update connection state on connect event', () => {
      const event: ProviderEventMessage = {
        id: '123',
        target: MessageTarget.INPAGE,
        type: MessageType.PROVIDER_EVENT,
        payload: {
          event: 'connect',
          data: { chainId: '0x1' },
        },
      };

      window.dispatchEvent(new MessageEvent('message', { data: event, source: window }));

      expect(provider.isConnected).toBe(true);
      expect(provider.chainId).toBe('0x1');
    });

    it('should clear state on disconnect event', () => {
      // First connect
      const connectEvent: ProviderEventMessage = {
        id: '123',
        target: MessageTarget.INPAGE,
        type: MessageType.PROVIDER_EVENT,
        payload: {
          event: 'connect',
          data: { chainId: '0x1' },
        },
      };

      window.dispatchEvent(new MessageEvent('message', { data: connectEvent, source: window }));

      // Then disconnect
      const disconnectEvent: ProviderEventMessage = {
        id: '124',
        target: MessageTarget.INPAGE,
        type: MessageType.PROVIDER_EVENT,
        payload: {
          event: 'disconnect',
          data: { code: 1000, message: 'User disconnected' },
        },
      };

      window.dispatchEvent(
        new MessageEvent('message', { data: disconnectEvent, source: window })
      );

      expect(provider.isConnected).toBe(false);
      expect(provider.selectedAddress).toBe(null);
    });
  });

  describe('Message Filtering', () => {
    it('should ignore messages from different sources', () => {
      const listener = vi.fn();
      provider.on('accountsChanged', listener);

      const event: ProviderEventMessage = {
        id: '123',
        target: MessageTarget.INPAGE,
        type: MessageType.PROVIDER_EVENT,
        payload: {
          event: 'accountsChanged',
          data: ['0xNewAddress'],
        },
      };

      // Message from different source
      window.dispatchEvent(
        new MessageEvent('message', {
          data: event,
          source: {} as Window, // Different source
        })
      );

      expect(listener).not.toHaveBeenCalled();
    });

    it('should ignore messages not targeted at inpage', () => {
      const listener = vi.fn();
      provider.on('accountsChanged', listener);

      const event = {
        id: '123',
        target: MessageTarget.CONTENT_SCRIPT, // Wrong target
        type: MessageType.PROVIDER_EVENT,
        payload: {
          event: 'accountsChanged',
          data: ['0xNewAddress'],
        },
      };

      window.dispatchEvent(new MessageEvent('message', { data: event, source: window }));

      expect(listener).not.toHaveBeenCalled();
    });
  });
});
