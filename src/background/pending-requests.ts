/**
 * Pending Requests Manager
 *
 * Manages requests that require user approval (connections, signatures, etc.)
 */

export interface PendingRequest {
  id: string;
  type: 'connect' | 'sign' | 'signTypedData';
  origin: string;
  timestamp: number;
  params?: unknown;
  resolve: (result: boolean) => void;
  reject: (error: unknown) => void;
}

class PendingRequestsManager {
  private requests = new Map<string, PendingRequest>();

  /**
   * Add a pending request
   */
  addRequest(request: PendingRequest): void {
    this.requests.set(request.id, request);
  }

  /**
   * Get a pending request by ID
   */
  getRequest(id: string): PendingRequest | undefined {
    return this.requests.get(id);
  }

  /**
   * Get all pending requests
   */
  getAllRequests(): PendingRequest[] {
    return Array.from(this.requests.values());
  }

  /**
   * Get the first pending request (oldest)
   */
  getFirstRequest(): PendingRequest | undefined {
    const requests = this.getAllRequests();
    if (requests.length === 0) return undefined;
    return requests.sort((a, b) => a.timestamp - b.timestamp)[0];
  }

  /**
   * Remove a request after it's been handled
   */
  removeRequest(id: string): void {
    this.requests.delete(id);
  }

  /**
   * Clear all pending requests
   */
  clear(): void {
    this.requests.clear();
  }

  /**
   * Check if there are any pending requests
   */
  hasPending(): boolean {
    return this.requests.size > 0;
  }
}

// Singleton instance
export const pendingRequestsManager = new PendingRequestsManager();
