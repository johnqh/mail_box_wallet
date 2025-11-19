/**
 * Message types for communication between inpage, content script, and background
 */

import { RequestArguments } from './eip1193';

/**
 * Message direction
 */
export enum MessageTarget {
  INPAGE = 'IDENTITY_WALLET_INPAGE',
  CONTENT_SCRIPT = 'IDENTITY_WALLET_CONTENT',
  BACKGROUND = 'IDENTITY_WALLET_BACKGROUND',
}

/**
 * Message types
 */
export enum MessageType {
  // Provider requests
  PROVIDER_REQUEST = 'PROVIDER_REQUEST',
  PROVIDER_RESPONSE = 'PROVIDER_RESPONSE',
  PROVIDER_ERROR = 'PROVIDER_ERROR',

  // Provider events
  PROVIDER_EVENT = 'PROVIDER_EVENT',

  // Connection management
  CONNECT = 'CONNECT',
  DISCONNECT = 'DISCONNECT',
}

/**
 * Base message structure
 */
export interface BaseMessage {
  id: string;
  target: MessageTarget;
  type: MessageType;
}

/**
 * Provider request message (inpage → content → background)
 */
export interface ProviderRequestMessage extends BaseMessage {
  type: MessageType.PROVIDER_REQUEST;
  payload: RequestArguments;
}

/**
 * Provider response message (background → content → inpage)
 */
export interface ProviderResponseMessage extends BaseMessage {
  type: MessageType.PROVIDER_RESPONSE;
  payload: unknown;
}

/**
 * Provider error message (background → content → inpage)
 */
export interface ProviderErrorMessage extends BaseMessage {
  type: MessageType.PROVIDER_ERROR;
  payload: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * Provider event message (background → content → inpage)
 */
export interface ProviderEventMessage extends BaseMessage {
  type: MessageType.PROVIDER_EVENT;
  payload: {
    event: string;
    data: unknown;
  };
}

/**
 * All message types
 */
export type Message =
  | ProviderRequestMessage
  | ProviderResponseMessage
  | ProviderErrorMessage
  | ProviderEventMessage;
