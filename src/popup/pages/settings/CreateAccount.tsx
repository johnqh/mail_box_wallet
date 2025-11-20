/**
 * Create Account Page
 *
 * Create a new account derived from the seed phrase
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardContent, Input, Label } from '@sudobility/components';
import { Layout } from '../../components';
import { getService, SERVICE_TOKENS } from '@/shared/di';
import type { IKeyringService } from '@/shared/di';

export function CreateAccount() {
  const navigate = useNavigate();
  const [accountName, setAccountName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accountName.trim()) {
      setError('Please enter an account name');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const keyringService = getService<IKeyringService>(SERVICE_TOKENS.KEYRING);
      await keyringService.createAccount(accountName.trim());

      // Navigate back to settings
      navigate('/settings');
    } catch (err) {
      console.error('Failed to create account:', err);
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto mt-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/settings')}
            className="text-gray-600 hover:text-gray-900 mb-2 flex items-center text-sm"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Settings
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
          <p className="text-sm text-gray-600 mt-1">
            Add a new account derived from your seed phrase
          </p>
        </div>

        {/* Form */}
        <Card>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-6">
              <div>
                <Label htmlFor="name">Account Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={accountName}
                  onChange={(e) => {
                    setAccountName(e.target.value);
                    setError('');
                  }}
                  placeholder="e.g., My New Account"
                  className="w-full"
                  autoFocus
                />
                {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>Note:</strong> This account will be derived from your existing seed phrase
                  using the BIP-44 derivation path. You can create multiple accounts from the same seed.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/settings')}
                  className="flex-1"
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={!accountName.trim() || loading}
                >
                  {loading ? 'Creating...' : 'Create Account'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
