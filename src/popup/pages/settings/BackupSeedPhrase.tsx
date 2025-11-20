/**
 * Backup Seed Phrase Page
 *
 * Display and allow copying of the seed phrase for backup
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardContent, Input, Label } from '@sudobility/components';
import { Layout } from '../../components';
import { getService, SERVICE_TOKENS } from '@/shared/di';
import type { IVaultService } from '@/shared/di';

export function BackupSeedPhrase() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [seedPhrase, setSeedPhrase] = useState<string | null>(null);
  const [showSeed, setShowSeed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleRevealSeed = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password) {
      setError('Please enter your password');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const vaultService = getService<IVaultService>(SERVICE_TOKENS.VAULT);
      const unlockedSeed = await vaultService.unlock(password);

      setSeedPhrase(unlockedSeed);
      setShowSeed(true);
      setPassword(''); // Clear password after successful unlock
    } catch (err) {
      console.error('Failed to unlock vault:', err);
      setError('Incorrect password');
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (seedPhrase) {
      await navigator.clipboard.writeText(seedPhrase);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const words = seedPhrase ? seedPhrase.split(' ') : [];

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
          <h1 className="text-2xl font-bold text-gray-900">Backup Seed Phrase</h1>
          <p className="text-sm text-gray-600 mt-1">
            View your secret recovery phrase
          </p>
        </div>

        {/* Warning */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <span className="text-xl mr-2">⚠️</span>
            <div>
              <h3 className="font-semibold text-red-900 mb-1">Security Warning</h3>
              <ul className="text-sm text-red-800 space-y-1 list-disc ml-4">
                <li>Never share your seed phrase with anyone</li>
                <li>Store it safely offline</li>
                <li>Anyone with your seed phrase can access your wallet</li>
                <li>Make sure no one can see your screen</li>
              </ul>
            </div>
          </div>
        </div>

        {!showSeed ? (
          /* Password Verification */
          <Card>
            <CardContent>
              <form onSubmit={handleRevealSeed} className="space-y-6">
                <div>
                  <Label htmlFor="password">Confirm Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    placeholder="Enter your wallet password"
                    className="w-full"
                    autoFocus
                  />
                  {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
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
                    disabled={!password || loading}
                  >
                    {loading ? 'Verifying...' : 'Reveal Seed Phrase'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          /* Seed Phrase Display */
          <>
            <Card className="mb-4">
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 font-medium">
                    Your {words.length}-word recovery phrase:
                  </p>

                  {/* Seed Phrase Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    {words.map((word, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200"
                      >
                        <span className="text-xs text-gray-500 w-6">{index + 1}.</span>
                        <span className="font-mono text-sm text-gray-900">{word}</span>
                      </div>
                    ))}
                  </div>

                  {/* Copy Button */}
                  <Button
                    onClick={handleCopy}
                    variant="outline"
                    className="w-full"
                  >
                    {copied ? '✓ Copied!' : 'Copy to Clipboard'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setSeedPhrase(null);
                  setShowSeed(false);
                }}
                variant="outline"
                className="flex-1"
              >
                Hide
              </Button>
              <Button
                onClick={() => navigate('/settings')}
                className="flex-1"
              >
                Done
              </Button>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
