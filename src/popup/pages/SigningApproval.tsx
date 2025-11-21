/**
 * Signing Approval Page
 *
 * Displays pending signature requests and allows user to approve or reject.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import browser from 'webextension-polyfill';
import { Button, Card, CardContent, CardHeader } from '@sudobility/components';

interface PendingRequest {
  id: string;
  type: 'connect' | 'sign' | 'signTypedData';
  origin: string;
  timestamp: number;
  params?: unknown;
}

export function SigningApproval() {
  const navigate = useNavigate();
  const [request, setRequest] = useState<PendingRequest | null>(null);
  const [account, setAccount] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkPendingRequest() {
      try {
        // Get pending request
        const response = await browser.runtime.sendMessage({
          type: 'GET_PENDING_REQUEST',
        }) as { request?: PendingRequest };

        if (response.request && response.request.type !== 'connect') {
          setRequest(response.request);

          // Get current account
          const accountResponse = await browser.runtime.sendMessage({
            type: 'GET_ACTIVE_ACCOUNT',
          }) as { address?: string };
          if (accountResponse.address) {
            setAccount(accountResponse.address);
          }
        } else {
          // No signing request pending, go home
          navigate('/home');
        }
      } catch (error) {
        console.error('Error checking pending request:', error);
        navigate('/home');
      } finally {
        setLoading(false);
      }
    }

    checkPendingRequest();
  }, [navigate]);

  const handleApprove = async () => {
    if (!request) return;

    try {
      setLoading(true);
      await browser.runtime.sendMessage({
        type: 'APPROVE_REQUEST',
        payload: { requestId: request.id },
      });
      window.close();
    } catch (error) {
      console.error('Error approving request:', error);
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!request) return;

    try {
      setLoading(true);
      await browser.runtime.sendMessage({
        type: 'REJECT_REQUEST',
        payload: { requestId: request.id },
      });
      window.close();
    } catch (error) {
      console.error('Error rejecting request:', error);
      setLoading(false);
    }
  };

  const decodeMessage = (message: string): string => {
    try {
      // Remove 0x prefix if present
      const hex = message.startsWith('0x') ? message.slice(2) : message;

      // Try to decode as UTF-8
      const bytes = new Uint8Array(hex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
      const decoded = new TextDecoder().decode(bytes);

      // Check if it looks like valid text
      if (decoded.match(/^[\x20-\x7E\s]+$/)) {
        return decoded;
      }

      return message;
    } catch {
      return message;
    }
  };

  const formatTypedData = (typedData: unknown): string => {
    try {
      return JSON.stringify(typedData, null, 2);
    } catch {
      return String(typedData);
    }
  };

  const isSIWEMessage = (message: string): boolean => {
    const decoded = decodeMessage(message);
    return decoded.includes('wants you to sign in with your Ethereum account') ||
           decoded.match(/^[\w\s.]+ wants you to sign in/i) !== null;
  };

  const getDomain = (origin: string) => {
    try {
      const url = new URL(origin);
      return url.hostname;
    } catch {
      return origin;
    }
  };

  const renderMessageContent = () => {
    if (!request) return null;

    if (request.type === 'sign') {
      const params = request.params as { message?: string; [key: number]: unknown } | undefined;
      const message = (params?.message || params?.[0] || '') as string;
      const decoded = decodeMessage(message);
      const isSignInWithEthereum = isSIWEMessage(message);

      return (
        <div className="space-y-4">
          {isSignInWithEthereum && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900 font-medium">
                This is a Sign-In with Ethereum (SIWE) request
              </p>
            </div>
          )}

          <div>
            <p className="text-sm text-gray-600 mb-2 font-semibold">Message to sign:</p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <pre className="text-sm text-gray-900 whitespace-pre-wrap break-words font-mono">
                {decoded}
              </pre>
            </div>
          </div>

          {decoded !== message && (
            <div>
              <p className="text-sm text-gray-600 mb-2 font-semibold">Raw (hex):</p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-600 break-all font-mono">
                  {message}
                </p>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (request.type === 'signTypedData') {
      const params = request.params as { typedData?: unknown; [key: number]: unknown } | undefined;
      const typedData = params?.typedData || params?.[1];

      return (
        <div>
          <p className="text-sm text-gray-600 mb-2 font-semibold">Typed data to sign:</p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 max-h-64 overflow-y-auto">
            <pre className="text-xs text-gray-900 whitespace-pre-wrap break-words font-mono">
              {formatTypedData(typedData)}
            </pre>
          </div>
        </div>
      );
    }

    return null;
  };

  const getRequestTitle = (): string => {
    if (!request) return 'Signature Request';

    if (request.type === 'sign') {
      const params = request.params as { message?: string; [key: number]: unknown } | undefined;
      const message = (params?.message || params?.[0] || '') as string;
      if (isSIWEMessage(message)) {
        return 'Sign-In Request';
      }
      return 'Signature Request';
    }

    if (request.type === 'signTypedData') {
      return 'Typed Data Signature Request';
    }

    return 'Signature Request';
  };

  if (loading || !request) {
    return (
      <div className="w-[400px] h-[600px] bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-primary-600 mb-4"></div>
          <p className="text-gray-600">Loading request...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[400px] h-[600px] bg-gray-50 flex flex-col">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 text-center p-6 pb-3 bg-gray-50">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mb-3">
          <span className="text-2xl">✍️</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-1">{getRequestTitle()}</h1>
        <p className="text-sm text-gray-600">
          Review carefully before signing
        </p>
      </div>

      {/* Warning - Fixed */}
      <div className="flex-shrink-0 px-6 pb-3 bg-gray-50">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-xs text-yellow-900 font-medium">
            ⚠️ Only sign if you trust this site
          </p>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-3 bg-gray-50" style={{ minHeight: 0 }}>
        <Card>
          <CardHeader>
            <h3 className="text-base font-semibold">Request Details</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Requesting Site</p>
              <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                {getDomain(request.origin)}
              </span>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-1">Account</p>
              <p className="font-mono text-sm text-gray-900 break-all">{account}</p>
            </div>

            {renderMessageContent()}
          </CardContent>
        </Card>
      </div>

      {/* Actions - Fixed at bottom */}
      <div className="flex-shrink-0 p-6 pt-3 space-y-3 border-t border-gray-200 bg-white">
        <Button
          onClick={handleApprove}
          disabled={loading}
          className="w-full"
        >
          Sign
        </Button>
        <Button
          onClick={handleReject}
          disabled={loading}
          variant="outline"
          className="w-full"
        >
          Reject
        </Button>
      </div>
    </div>
  );
}
