/**
 * Import Account Page
 *
 * Import an account from a private key
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardContent, Input, Label } from '@sudobility/components';
import { Layout } from '../../components';
import { getService, SERVICE_TOKENS } from '@/shared/di';
import type { IKeyringService } from '@/shared/di';

export function ImportAccount() {
  const navigate = useNavigate();
  const [privateKey, setPrivateKey] = useState('');
  const [accountName, setAccountName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!privateKey.trim()) {
      setError('Please enter a private key');
      return;
    }

    // Validate private key format (with or without 0x prefix)
    const cleanKey = privateKey.trim().startsWith('0x')
      ? privateKey.trim().slice(2)
      : privateKey.trim();

    if (!/^[0-9a-fA-F]{64}$/.test(cleanKey)) {
      setError('Invalid private key format. Must be 64 hexadecimal characters.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const keyringService = getService<IKeyringService>(SERVICE_TOKENS.KEYRING);
      await keyringService.importAccount(
        privateKey.trim(),
        accountName.trim() || undefined
      );

      // Navigate back to settings
      navigate('/settings');
    } catch (err) {
      console.error('Failed to import account:', err);
      setError(err instanceof Error ? err.message : 'Failed to import account');
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
          <h1 className="text-2xl font-bold text-gray-900">Import Account</h1>
          <p className="text-sm text-gray-600 mt-1">
            Import an account using a private key
          </p>
        </div>

        {/* Warning */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <span className="text-xl mr-2">⚠️</span>
            <div>
              <h3 className="font-semibold text-yellow-900 mb-1">Security Warning</h3>
              <ul className="text-sm text-yellow-800 space-y-1 list-disc ml-4">
                <li>Never share your private key with anyone</li>
                <li>Imported accounts are not derived from your seed phrase</li>
                <li>Make sure no one can see your screen</li>
                <li>Only import keys from trusted sources</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardContent>
            <form onSubmit={handleImport} className="space-y-6">
              <div>
                <Label htmlFor="privateKey">Private Key</Label>
                <Input
                  id="privateKey"
                  type="password"
                  value={privateKey}
                  onChange={(e) => {
                    setPrivateKey(e.target.value);
                    setError('');
                  }}
                  placeholder="Enter private key (with or without 0x prefix)"
                  className="w-full font-mono"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">
                  64 hexadecimal characters
                </p>
                {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
              </div>

              <div>
                <Label htmlFor="name">Account Name (Optional)</Label>
                <Input
                  id="name"
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="e.g., My Imported Account"
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty for default name
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>Note:</strong> Imported accounts are stored separately from your seed phrase
                  accounts. To back up an imported account, you must save its private key.
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
                  disabled={!privateKey.trim() || loading}
                >
                  {loading ? 'Importing...' : 'Import Account'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
