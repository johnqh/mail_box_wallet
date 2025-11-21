/**
 * Background Message Handler
 *
 * Routes provider requests to appropriate services and handles responses.
 */

import { RequestArguments, ProviderRpcErrorCode } from '../shared/types/eip1193';
import { IKeyringService, ISignerService, INetworkService, ISessionService } from '../shared/di';
import { getService, SERVICE_TOKENS } from '../shared/di';
import { pendingRequestsManager } from './pending-requests';

/**
 * Method categories for allow/blocklist
 */
const SIGNING_METHODS = new Set([
  'personal_sign',
  'eth_sign',
  'eth_signTypedData',
  'eth_signTypedData_v3',
  'eth_signTypedData_v4',
]);

const READ_ONLY_METHODS = new Set([
  'eth_accounts',
  'eth_requestAccounts',
  'eth_chainId',
  'net_version',
  'eth_blockNumber',
  'eth_getBalance',
  'eth_getCode',
  'eth_getTransactionCount',
  'eth_call',
  'eth_estimateGas',
  'eth_gasPrice',
  'eth_getBlockByNumber',
  'eth_getBlockByHash',
  'eth_getTransactionByHash',
  'eth_getTransactionReceipt',
]);

const TRANSACTION_METHODS = new Set([
  'eth_sendTransaction',
  'eth_sendRawTransaction',
  'eth_signTransaction',
]);

const BLOCKED_METHODS = new Set([
  ...TRANSACTION_METHODS,
]);

const CONNECTED_SITES_STORAGE_KEY = 'connectedSites';

/**
 * Message Handler Class
 */
export class MessageHandler {
  private keyringService: IKeyringService;
  private signerService: ISignerService;
  private networkService: INetworkService;
  private sessionService: ISessionService;

  // Track connected sites (loaded from storage)
  private connectedSites = new Map<string, boolean>();

  // Callback to trigger popup opening
  private onRequestApproval?: () => Promise<void>;

  constructor() {
    // Resolve services from DI container
    this.keyringService = getService<IKeyringService>(SERVICE_TOKENS.KEYRING);
    this.signerService = getService<ISignerService>(SERVICE_TOKENS.SIGNER);
    this.networkService = getService<INetworkService>(SERVICE_TOKENS.NETWORK);
    this.sessionService = getService<ISessionService>(SERVICE_TOKENS.SESSION);

    // Load connected sites from storage
    this.loadConnectedSites();
  }

  /**
   * Load connected sites from storage
   */
  private async loadConnectedSites(): Promise<void> {
    try {
      const stored = await chrome.storage.local.get(CONNECTED_SITES_STORAGE_KEY);
      if (stored[CONNECTED_SITES_STORAGE_KEY]) {
        const sites = stored[CONNECTED_SITES_STORAGE_KEY] as string[];
        sites.forEach(site => this.connectedSites.set(site, true));
      }
    } catch (error) {
      console.error('Failed to load connected sites:', error);
    }
  }

  /**
   * Save connected sites to storage
   */
  private async saveConnectedSites(): Promise<void> {
    try {
      const sites = Array.from(this.connectedSites.keys());
      await chrome.storage.local.set({ [CONNECTED_SITES_STORAGE_KEY]: sites });
    } catch (error) {
      console.error('Failed to save connected sites:', error);
    }
  }

  /**
   * Set callback for opening approval popup
   */
  setApprovalCallback(callback: () => Promise<void>): void {
    this.onRequestApproval = callback;
  }

  /**
   * Handle provider request
   */
  async handleRequest(
    args: RequestArguments,
    origin?: string
  ): Promise<{ result?: unknown; error?: { code: number; message: string; data?: unknown } }> {
    const { method, params } = args;

    try {
      // Check if method is blocked
      if (BLOCKED_METHODS.has(method)) {
        return {
          error: {
            code: ProviderRpcErrorCode.UNSUPPORTED_METHOD,
            message: `Identity Wallet does not support ${method}. This is a signing-only wallet. Please use a transaction wallet like MetaMask, Rainbow, or Coinbase Wallet for sending transactions.`,
          },
        };
      }

      // Check if method is supported
      if (!this.isSupportedMethod(method)) {
        return {
          error: {
            code: ProviderRpcErrorCode.UNSUPPORTED_METHOD,
            message: `Method ${method} is not supported`,
          },
        };
      }

      // Route to appropriate handler
      const result = await this.routeRequest(method, params, origin);

      return { result };
    } catch (error) {
      console.error('Error handling request:', error);

      // Handle known error types
      if (error && typeof error === 'object' && 'code' in error) {
        const errorObj = error as { code: number; message?: string; data?: unknown };
        return {
          error: {
            code: errorObj.code,
            message: errorObj.message || 'Unknown error',
            data: errorObj.data,
          },
        };
      }

      // Generic error
      return {
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal error',
        },
      };
    }
  }

  /**
   * Check if method is supported
   */
  private isSupportedMethod(method: string): boolean {
    return (
      SIGNING_METHODS.has(method) ||
      READ_ONLY_METHODS.has(method) ||
      method.startsWith('wallet_')
    );
  }

  /**
   * Route request to appropriate handler
   */
  private async routeRequest(
    method: string,
    params?: unknown[] | object,
    origin?: string
  ): Promise<unknown> {
    switch (method) {
      // Connection methods
      case 'eth_requestAccounts':
        return this.handleRequestAccounts(origin);

      case 'eth_accounts':
        return this.handleAccounts(origin);

      // Chain methods
      case 'eth_chainId':
        return this.handleChainId();

      case 'net_version':
        return this.handleNetVersion();

      // Signing methods
      case 'personal_sign':
        return this.handlePersonalSign(params as unknown[]);

      case 'eth_signTypedData_v4':
        return this.handleSignTypedData(params as unknown[]);

      // Wallet methods
      case 'wallet_switchEthereumChain':
        return this.handleSwitchChain(params as unknown[]);

      default:
        throw {
          code: ProviderRpcErrorCode.UNSUPPORTED_METHOD,
          message: `Method ${method} not implemented`,
        };
    }
  }

  /**
   * Handle eth_requestAccounts - request permission to access accounts
   */
  private async handleRequestAccounts(origin?: string): Promise<string[]> {
    // Check if session is locked or site not connected
    const session = await this.sessionService.getSessionState();
    const isConnected = origin ? this.connectedSites.get(origin) : false;

    // If locked or not connected, require user approval
    if (!session.isUnlocked || !isConnected) {
      // Create a promise that will be resolved when user approves
      return new Promise((resolve, reject) => {
        // Generate request ID
        const requestId = `connect_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        // Store pending request
        pendingRequestsManager.addRequest({
          id: requestId,
          type: 'connect',
          origin: origin || 'unknown',
          timestamp: Date.now(),
          params: {},
          resolve: async (approved: boolean) => {
            if (approved) {
              try {
                // Mark site as connected and save to storage
                if (origin) {
                  this.connectedSites.set(origin, true);
                  await this.saveConnectedSites();
                }

                // Check if session is now unlocked (user may have unlocked during approval)
                const currentSession = await this.sessionService.getSessionState();
                if (!currentSession.isUnlocked) {
                  reject({
                    code: ProviderRpcErrorCode.UNAUTHORIZED,
                    message: 'Wallet is locked. Please unlock to continue.',
                  });
                  return;
                }

                // Get current account
                const accounts = await this.keyringService.getAccounts();
                if (accounts.length === 0) {
                  reject({
                    code: ProviderRpcErrorCode.UNAUTHORIZED,
                    message: 'No accounts available. Please create or import a wallet first.',
                  });
                  return;
                }

                resolve([accounts[0].address]);
              } catch (error) {
                console.error('Error getting accounts after approval:', error);
                reject({
                  code: ProviderRpcErrorCode.INTERNAL_ERROR,
                  message: error instanceof Error ? error.message : 'Failed to get accounts',
                });
              }
            } else {
              reject({
                code: ProviderRpcErrorCode.UNAUTHORIZED,
                message: 'User rejected the request',
              });
            }
          },
          reject: (error: unknown) => {
            reject(error);
          },
        });

        // Trigger popup opening
        if (this.onRequestApproval) {
          this.onRequestApproval().catch((error) => {
            console.error('Failed to open approval popup:', error);
            pendingRequestsManager.removeRequest(requestId);
            reject({
              code: ProviderRpcErrorCode.INTERNAL_ERROR,
              message: 'Failed to open approval popup',
            });
          });
        } else {
          pendingRequestsManager.removeRequest(requestId);
          reject({
            code: ProviderRpcErrorCode.INTERNAL_ERROR,
            message: 'Approval callback not set',
          });
        }
      });
    }

    // If already unlocked and connected, return accounts immediately
    const accounts = await this.keyringService.getAccounts();
    if (accounts.length === 0) {
      throw {
        code: ProviderRpcErrorCode.UNAUTHORIZED,
        message: 'No accounts available',
      };
    }

    return [accounts[0].address];
  }

  /**
   * Handle eth_accounts - return connected accounts
   */
  private async handleAccounts(origin?: string): Promise<string[]> {
    // Check if site is connected
    if (origin && !this.connectedSites.get(origin)) {
      return []; // Return empty array if not connected
    }

    // Check if session is locked
    const session = await this.sessionService.getSessionState();
    if (!session.isUnlocked) {
      return []; // Return empty array if locked
    }

    // Get current account
    const accounts = await this.keyringService.getAccounts();
    if (accounts.length === 0) {
      return [];
    }

    return [accounts[0].address];
  }

  /**
   * Handle eth_chainId - return current chain ID
   */
  private async handleChainId(): Promise<string> {
    const network = await this.networkService.getCurrentNetwork();
    if (!network) {
      throw new Error('No network configured');
    }
    // chainId is already stored as hex string (e.g., '0x1')
    return network.chainId;
  }

  /**
   * Handle net_version - return current network version
   */
  private async handleNetVersion(): Promise<string> {
    const network = await this.networkService.getCurrentNetwork();
    if (!network) {
      throw new Error('No network configured');
    }
    return network.chainId.toString();
  }

  /**
   * Handle personal_sign - sign a message
   */
  private async handlePersonalSign(params: unknown[]): Promise<string> {
    if (!params || params.length < 2) {
      throw {
        code: -32602,
        message: 'Invalid params: expected [message, address]',
      };
    }

    const message = params[0] as string;
    const address = params[1] as string;

    // Verify account exists
    const account = await this.keyringService.getAccount(address);
    if (!account) {
      throw {
        code: ProviderRpcErrorCode.UNAUTHORIZED,
        message: 'Account not found',
      };
    }

    // Request user approval
    return new Promise((resolve, reject) => {
      // Generate request ID
      const requestId = `sign_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Store pending request
      pendingRequestsManager.addRequest({
        id: requestId,
        type: 'sign',
        origin: 'unknown', // Will be set by caller if available
        timestamp: Date.now(),
        params: { message, address },
        resolve: async (approved: boolean) => {
          if (approved) {
            try {
              // Get private key for address
              const privateKey = await this.keyringService.getPrivateKey(address);

              // Sign message
              const result = await this.signerService.personalSign(message, privateKey);

              resolve(result.signature);
            } catch (error) {
              console.error('Error signing message:', error);
              reject({
                code: ProviderRpcErrorCode.INTERNAL_ERROR,
                message: error instanceof Error ? error.message : 'Failed to sign message',
              });
            }
          } else {
            reject({
              code: ProviderRpcErrorCode.UNAUTHORIZED,
              message: 'User rejected the request',
            });
          }
        },
        reject: (error: unknown) => {
          reject(error);
        },
      });

      // Trigger popup opening
      if (this.onRequestApproval) {
        this.onRequestApproval().catch((error) => {
          console.error('Failed to open approval popup:', error);
          pendingRequestsManager.removeRequest(requestId);
          reject({
            code: ProviderRpcErrorCode.INTERNAL_ERROR,
            message: 'Failed to open approval popup',
          });
        });
      } else {
        pendingRequestsManager.removeRequest(requestId);
        reject({
          code: ProviderRpcErrorCode.INTERNAL_ERROR,
          message: 'Approval callback not set',
        });
      }
    });
  }

  /**
   * Handle eth_signTypedData_v4 - sign typed data
   */
  private async handleSignTypedData(params: unknown[]): Promise<string> {
    if (!params || params.length < 2) {
      throw {
        code: -32602,
        message: 'Invalid params: expected [address, typedData]',
      };
    }

    const address = params[0] as string;
    const typedData = JSON.parse(params[1] as string);

    // Verify account exists
    const account = await this.keyringService.getAccount(address);
    if (!account) {
      throw {
        code: ProviderRpcErrorCode.UNAUTHORIZED,
        message: 'Account not found',
      };
    }

    // Request user approval
    return new Promise((resolve, reject) => {
      // Generate request ID
      const requestId = `signTypedData_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Store pending request
      pendingRequestsManager.addRequest({
        id: requestId,
        type: 'signTypedData',
        origin: 'unknown', // Will be set by caller if available
        timestamp: Date.now(),
        params: { address, typedData },
        resolve: async (approved: boolean) => {
          if (approved) {
            try {
              // Get private key for address
              const privateKey = await this.keyringService.getPrivateKey(address);

              // Sign typed data
              const result = await this.signerService.signTypedData(typedData, privateKey);

              resolve(result.signature);
            } catch (error) {
              console.error('Error signing typed data:', error);
              reject({
                code: ProviderRpcErrorCode.INTERNAL_ERROR,
                message: error instanceof Error ? error.message : 'Failed to sign typed data',
              });
            }
          } else {
            reject({
              code: ProviderRpcErrorCode.UNAUTHORIZED,
              message: 'User rejected the request',
            });
          }
        },
        reject: (error: unknown) => {
          reject(error);
        },
      });

      // Trigger popup opening
      if (this.onRequestApproval) {
        this.onRequestApproval().catch((error) => {
          console.error('Failed to open approval popup:', error);
          pendingRequestsManager.removeRequest(requestId);
          reject({
            code: ProviderRpcErrorCode.INTERNAL_ERROR,
            message: 'Failed to open approval popup',
          });
        });
      } else {
        pendingRequestsManager.removeRequest(requestId);
        reject({
          code: ProviderRpcErrorCode.INTERNAL_ERROR,
          message: 'Approval callback not set',
        });
      }
    });
  }

  /**
   * Handle wallet_switchEthereumChain - switch to different chain
   */
  private async handleSwitchChain(params: unknown[]): Promise<null> {
    if (!params || params.length < 1 || typeof params[0] !== 'object' || !params[0]) {
      throw {
        code: -32602,
        message: 'Invalid params: expected [{ chainId }]',
      };
    }

    const chainIdHex = (params[0] as { chainId: string }).chainId;

    // Find network by chain ID
    const network = await this.networkService.getNetworkByChainId(chainIdHex);
    if (!network) {
      throw {
        code: 4902,
        message: `Unrecognized chain ID: ${chainIdHex}`,
      };
    }

    // Switch network
    await this.networkService.setCurrentNetwork(network.id);

    return null;
  }
}
