/**
 * Unlock Page
 *
 * Unlock existing wallet with password
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import browser from 'webextension-polyfill';
import { Button, Input, Label, Card, CardContent } from '@sudobility/components';
import { Layout } from '../components';
import { useWalletStore } from '../store/walletStore';

export function Unlock() {
  const navigate = useNavigate();
  const { unlockWallet } = useWalletStore();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password) {
      setError('Please enter your password');
      return;
    }

    try {
      setLoading(true);
      setError('');

      await unlockWallet(password);

      // Check if there's a pending request
      try {
        const response = await browser.runtime.sendMessage({
          type: 'GET_PENDING_REQUEST',
        }) as { request?: { type: string } };

        if (response.request) {
          // Navigate to approval page
          navigate('/connect-approval');
        } else {
          // Navigate to home
          navigate('/home');
        }
      } catch {
        // If we can't check for pending requests, just go home
        navigate('/home');
      }
    } catch (err) {
      console.error('Failed to unlock wallet:', err);
      setError('Incorrect password. Please try again.');
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout
      title="Identity Wallet"
      subtitle="Unlock your wallet to continue"
      actions={
        <div className="space-y-2">
          <Button
            onClick={handleUnlock}
            className="w-full"
            disabled={!password || loading}
          >
            {loading ? 'Unlocking...' : 'Unlock Wallet'}
          </Button>
          <button
            onClick={() => navigate('/settings/reset-wallet')}
            className="w-full text-sm text-gray-600 hover:text-gray-900"
          >
            Forgot password? Reset wallet
          </button>
        </div>
      }
    >
      {/* Logo */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-3">
          <span className="text-3xl">🔐</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Welcome Back</h2>
      </div>

      {/* Password Form */}
      <Card>
        <CardContent>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleUnlock(e);
                }
              }}
              placeholder="Enter your password"
              className="w-full"
              autoFocus
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Info Message */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-900">
          Your wallet remains locked for security. Enter your password to access your accounts and sign messages.
        </p>
      </div>
    </Layout>
  );
}
