/**
 * Background Message Handler
 *
 * Routes provider requests to appropriate services and handles responses.
 */

import { RequestArguments, ProviderRpcErrorCode } from '../shared/types/eip1193';
import { IKeyringService, ISignerService, INetworkService, ISessionService } from '../shared/di';
import { getService, SERVICE_TOKENS } from '../shared/di';

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

/**
 * Message Handler Class
 */
export class MessageHandler {
  private keyringService: IKeyringService;
  private signerService: ISignerService;
  private networkService: INetworkService;
  private sessionService: ISessionService;

  // Track connected sites
  private connectedSites = new Map<string, boolean>();

  constructor() {
    // Resolve services from DI container
    this.keyringService = getService<IKeyringService>(SERVICE_TOKENS.KEYRING);
    this.signerService = getService<ISignerService>(SERVICE_TOKENS.SIGNER);
    this.networkService = getService<INetworkService>(SERVICE_TOKENS.NETWORK);
    this.sessionService = getService<ISessionService>(SERVICE_TOKENS.SESSION);
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
        return {
          error: {
            code: (error as any).code,
            message: (error as any).message || 'Unknown error',
            data: (error as any).data,
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
        return this.handleSwitchChain(params as any[]);

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
    // Check if session is locked
    const session = await this.sessionService.getSession();
    if (!session.isUnlocked) {
      throw {
        code: ProviderRpcErrorCode.UNAUTHORIZED,
        message: 'Wallet is locked. Please unlock to continue.',
      };
    }

    // TODO: Show connection approval popup in Phase 7
    // For now, auto-approve for development

    // Mark site as connected
    if (origin) {
      this.connectedSites.set(origin, true);
    }

    // Get current account
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
    const session = await this.sessionService.getSession();
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
    return `0x${network.chainId.toString(16)}`;
  }

  /**
   * Handle net_version - return current network version
   */
  private async handleNetVersion(): Promise<string> {
    const network = await this.networkService.getCurrentNetwork();
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

    // Get private key for address
    const privateKey = await this.keyringService.getPrivateKey(address);

    // TODO: Show signing approval popup in Phase 7
    // For now, auto-approve for development

    // Sign message
    const result = await this.signerService.personalSign(message, privateKey);

    return result.signature;
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

    // Get private key for address
    const privateKey = await this.keyringService.getPrivateKey(address);

    // TODO: Show signing approval popup in Phase 7
    // For now, auto-approve for development

    // Sign typed data
    const result = await this.signerService.signTypedData(typedData, privateKey);

    return result.signature;
  }

  /**
   * Handle wallet_switchEthereumChain - switch to different chain
   */
  private async handleSwitchChain(params: any[]): Promise<null> {
    if (!params || params.length < 1) {
      throw {
        code: -32602,
        message: 'Invalid params: expected [{ chainId }]',
      };
    }

    const chainIdHex = params[0].chainId as string;
    const chainId = parseInt(chainIdHex, 16);

    // Validate network exists
    const validation = await this.networkService.validateNetwork(chainId);
    if (!validation.isValid) {
      throw {
        code: 4902,
        message: `Unrecognized chain ID: ${chainId}`,
      };
    }

    // Switch network
    await this.networkService.switchNetwork(chainId);

    return null;
  }
}
