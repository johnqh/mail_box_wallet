/**
 * Change Password Page
 *
 * Allow users to change their wallet password
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardContent, Input, Label } from '@sudobility/components';
import { Layout } from '../../components';
import { getService, SERVICE_TOKENS } from '@/shared/di';
import type { IVaultService } from '@/shared/di';

export function ChangePassword() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    return null;
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    // Reset states
    setError('');
    setSuccess(false);

    // Validate current password
    if (!currentPassword) {
      setError('Please enter your current password');
      return;
    }

    // Validate new password
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    // Validate password match
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    // Check if new password is same as old
    if (currentPassword === newPassword) {
      setError('New password must be different from current password');
      return;
    }

    try {
      setLoading(true);

      const vaultService = getService<IVaultService>(SERVICE_TOKENS.VAULT);
      await vaultService.changePassword(currentPassword, newPassword);

      // Success
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Navigate back after a short delay
      setTimeout(() => {
        navigate('/settings');
      }, 2000);
    } catch (err) {
      console.error('Failed to change password:', err);
      setError(err instanceof Error ? err.message : 'Failed to change password');
      setCurrentPassword('');
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
          <h1 className="text-2xl font-bold text-gray-900">Change Password</h1>
          <p className="text-sm text-gray-600 mt-1">
            Update your wallet password
          </p>
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <span className="text-xl mr-2">ℹ️</span>
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Important</h3>
              <ul className="text-sm text-blue-800 space-y-1 list-disc ml-4">
                <li>Changing your password will not affect your seed phrase</li>
                <li>Make sure to remember your new password</li>
                <li>Your password must be at least 8 characters long</li>
                <li>You will remain logged in after changing your password</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardContent>
            {success ? (
              <div className="text-center py-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Password Changed Successfully!</h3>
                <p className="text-sm text-gray-600">
                  Redirecting to settings...
                </p>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-6">
                <div>
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      setError('');
                    }}
                    placeholder="Enter your current password"
                    className="w-full"
                    autoFocus
                    disabled={loading}
                  />
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          setError('');
                        }}
                        placeholder="Enter new password (min 8 characters)"
                        className="w-full"
                        disabled={loading}
                      />
                    </div>

                    <div>
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          setError('');
                        }}
                        placeholder="Confirm new password"
                        className="w-full"
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

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
                    disabled={
                      !currentPassword ||
                      !newPassword ||
                      !confirmPassword ||
                      loading
                    }
                  >
                    {loading ? 'Changing Password...' : 'Change Password'}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
