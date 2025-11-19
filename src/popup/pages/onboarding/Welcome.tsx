/**
 * Welcome Page
 *
 * First page of onboarding - choose to create new or import existing wallet
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardContent } from '@sudobility/components';
import { Layout } from '../../components';

export function Welcome() {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="max-w-md mx-auto mt-12">
        {/* Logo/Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
            <span className="text-3xl">🔐</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Identity Wallet</h1>
          <p className="text-gray-600">
            Secure crypto wallet for signing and authentication
          </p>
        </div>

        {/* Action Cards */}
        <div className="space-y-4">
          <Card>
            <CardContent>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Create New Wallet</h2>
              <p className="text-sm text-gray-600 mb-4">
                Generate a new wallet with a 12-word recovery phrase
              </p>
              <Button
                className="w-full"
                onClick={() => navigate('/onboarding/create')}
              >
                Create New Wallet
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Import Existing Wallet</h2>
              <p className="text-sm text-gray-600 mb-4">
                Restore your wallet using a recovery phrase
              </p>
              <Button
                className="w-full"
                variant="secondary"
                onClick={() => navigate('/onboarding/import')}
              >
                Import Wallet
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-500">
          <p>
            This is a signing-only wallet.
            <br />
            Transaction signing is not supported.
          </p>
        </div>
      </div>
    </Layout>
  );
}
