/**
 * Unlock Page
 *
 * Unlock existing wallet with password
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Card, Layout } from '../components';
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

      // Navigate to home
      navigate('/home');
    } catch (err) {
      console.error('Failed to unlock wallet:', err);
      setError('Incorrect password. Please try again.');
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto mt-12">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
            <span className="text-3xl">🔐</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">
            Unlock your wallet to continue
          </p>
        </div>

        <Card>
          <form onSubmit={handleUnlock}>
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="Enter your password"
              fullWidth
              error={error}
              autoFocus
            />

            <div className="mt-6">
              <Button
                type="submit"
                fullWidth
                variant="primary"
                disabled={!password || loading}
                loading={loading}
              >
                Unlock Wallet
              </Button>
            </div>
          </form>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Forgot your password?{' '}
            <button
              onClick={() => navigate('/reset')}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Reset Wallet
            </button>
          </p>
        </div>
      </div>
    </Layout>
  );
}
