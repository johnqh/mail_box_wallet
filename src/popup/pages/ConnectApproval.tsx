/**
 * Connect Approval Page
 *
 * Shows connection approval request from dApps
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import browser from 'webextension-polyfill';
import { Button, Card, CardContent, CardHeader } from '@sudobility/components';
import { Layout } from '../components';
import { useWalletStore } from '../store/walletStore';

interface PendingRequest {
  id: string;
  type: 'connect' | 'sign' | 'signTypedData';
  origin: string;
  timestamp: number;
  params?: any;
}

export function ConnectApproval() {
  const navigate = useNavigate();
  const { isUnlocked, accounts } = useWalletStore();
  const [request, setRequest] = useState<PendingRequest | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for pending request
  useEffect(() => {
    async function checkPendingRequest() {
      try {
        const response = await browser.runtime.sendMessage({
          type: 'GET_PENDING_REQUEST',
        });

        if (response.request) {
          setRequest(response.request);
        } else {
          // No pending request, go home
          navigate('/home');
        }
      } catch (error) {
        console.error('Failed to get pending request:', error);
        navigate('/home');
      } finally {
        setLoading(false);
      }
    }

    checkPendingRequest();
  }, [navigate]);

  // If wallet is locked, redirect to unlock
  useEffect(() => {
    if (!loading && !isUnlocked) {
      navigate('/unlock');
    }
  }, [isUnlocked, loading, navigate]);

  const handleApprove = async () => {
    if (!request) return;

    try {
      setLoading(true);
      await browser.runtime.sendMessage({
        type: 'APPROVE_REQUEST',
        payload: { requestId: request.id },
      });

      // Close the popup window
      window.close();
    } catch (error) {
      console.error('Failed to approve request:', error);
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

      // Close the popup window
      window.close();
    } catch (error) {
      console.error('Failed to reject request:', error);
      setLoading(false);
    }
  };

  if (loading || !request) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-primary-600 mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Extract domain from origin
  const getDomain = (origin: string) => {
    try {
      const url = new URL(origin);
      return url.hostname;
    } catch {
      return origin;
    }
  };

  return (
    <Layout>
      <div className="flex flex-col h-full p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
            <span className="text-3xl">🔗</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Connection Request</h1>
          <p className="text-gray-600">
            A dApp wants to connect to your wallet
          </p>
        </div>

        {/* Request Details */}
        <Card className="mb-6">
          <CardHeader>
            <h3 className="text-lg font-semibold">Request Details</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Website</p>
              <p className="font-medium text-gray-900 break-all">{getDomain(request.origin)}</p>
            </div>

            {accounts.length > 0 && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Account to Connect</p>
                <p className="font-mono text-sm text-gray-900 break-all">{accounts[0].address}</p>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Note:</strong> This site will be able to:
              </p>
              <ul className="mt-2 text-sm text-blue-800 space-y-1 ml-4 list-disc">
                <li>View your account address</li>
                <li>Request signatures for messages</li>
                <li>See your account balance</li>
              </ul>
              <p className="mt-2 text-sm text-blue-900">
                This site will <strong>NOT</strong> be able to send transactions on your behalf.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="mt-auto space-y-3">
          <Button
            onClick={handleApprove}
            disabled={loading}
            className="w-full"
          >
            Connect
          </Button>
          <Button
            onClick={handleReject}
            disabled={loading}
            variant="outline"
            className="w-full"
          >
            Cancel
          </Button>
        </div>
      </div>
    </Layout>
  );
}
