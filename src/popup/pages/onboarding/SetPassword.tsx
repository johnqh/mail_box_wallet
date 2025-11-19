/**
 * Set Password Page
 *
 * Create a password to encrypt the wallet
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Label, Card, CardContent } from '@sudobility/components';
import { Layout } from '../../components';
import { useWalletStore } from '../../store/walletStore';

export function SetPassword() {
  const navigate = useNavigate();
  const { tempSeedPhrase, createWallet } = useWalletStore();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Password strength calculation
  const getPasswordStrength = (pwd: string): { score: number; label: string; color: string } => {
    if (!pwd) return { score: 0, label: '', color: '' };

    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;

    if (score <= 1) return { score: 1, label: 'Weak', color: 'red' };
    if (score <= 3) return { score: 2, label: 'Fair', color: 'yellow' };
    if (score <= 4) return { score: 3, label: 'Good', color: 'blue' };
    return { score: 4, label: 'Strong', color: 'green' };
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async () => {
    // Validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!tempSeedPhrase) {
      setError('No seed phrase found. Please restart onboarding.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Create wallet
      await createWallet(password, tempSeedPhrase);

      // Navigate to complete page
      navigate('/onboarding/complete');
    } catch (err) {
      console.error('Failed to create wallet:', err);
      setError(err instanceof Error ? err.message : 'Failed to create wallet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout
      title="Create Password"
      subtitle="Secure your wallet with a strong password"
      showBack
      onBack={() => navigate(-1)}
    >
      <div className="max-w-md mx-auto">
        <Card>
          <CardContent>
            <div className="space-y-4">
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
                  placeholder="Enter password"
                  className="w-full"
                />

                {/* Password Strength Indicator */}
                {password && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-600">Password Strength:</span>
                      <span className={`font-medium text-${strength.color}-600`}>
                        {strength.label}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-${strength.color}-500 transition-all duration-300`}
                        style={{ width: `${(strength.score / 4) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="Re-enter password"
                  className="w-full"
                />
                {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
              </div>

              <div className="pt-2">
                <Button
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={!password || !confirmPassword || password !== confirmPassword || loading}
                >
                  {loading ? 'Creating...' : 'Create Wallet'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Password Requirements */}
        <Card className="mt-4 bg-gray-50">
          <CardContent className="py-3">
            <p className="text-sm font-medium text-gray-900 mb-2">Password Requirements:</p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li className={password.length >= 8 ? 'text-green-600' : ''}>
                {password.length >= 8 ? '✓' : '○'} At least 8 characters
              </li>
              <li className={password.length >= 12 ? 'text-green-600' : ''}>
                {password.length >= 12 ? '✓' : '○'} 12+ characters recommended
              </li>
              <li className={/[a-z]/.test(password) && /[A-Z]/.test(password) ? 'text-green-600' : ''}>
                {/[a-z]/.test(password) && /[A-Z]/.test(password) ? '✓' : '○'} Mix of uppercase and lowercase
              </li>
              <li className={/\d/.test(password) ? 'text-green-600' : ''}>
                {/\d/.test(password) ? '✓' : '○'} Include numbers
              </li>
              <li className={/[^a-zA-Z0-9]/.test(password) ? 'text-green-600' : ''}>
                {/[^a-zA-Z0-9]/.test(password) ? '✓' : '○'} Special characters (!@#$%^&*)
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
