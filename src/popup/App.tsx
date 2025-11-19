import React, { useState } from 'react';
import browser from 'webextension-polyfill';
import Debug from './pages/Debug';

function App() {
  const [message, setMessage] = useState('');
  const [showDebug, setShowDebug] = useState(false);

  const handleTestMessage = async () => {
    try {
      const response = await browser.runtime.sendMessage({
        type: 'TEST',
        payload: 'Hello from popup',
      });
      setMessage(JSON.stringify(response));
    } catch (error) {
      setMessage(`Error: ${error}`);
    }
  };

  if (showDebug) {
    return (
      <div style={{ padding: '20px', width: '600px', minHeight: '600px' }}>
        <button
          onClick={() => setShowDebug(false)}
          style={{
            marginBottom: '16px',
            padding: '8px 12px',
            backgroundColor: '#6B7280',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          ← Back
        </button>
        <Debug />
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', width: '360px', minHeight: '600px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '24px' }}>Identity Wallet</h1>
        <button
          onClick={() => setShowDebug(true)}
          style={{
            padding: '6px 10px',
            backgroundColor: '#F3F4F6',
            color: '#374151',
            border: '1px solid #D1D5DB',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Debug
        </button>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <p style={{ color: '#666', fontSize: '14px' }}>
          Secure identity-focused crypto wallet
        </p>
      </div>

      <div style={{ marginTop: '20px' }}>
        <button
          onClick={handleTestMessage}
          style={{
            padding: '10px 16px',
            backgroundColor: '#4F46E5',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Test Background Connection
        </button>

        {message && (
          <div
            style={{
              marginTop: '12px',
              padding: '12px',
              backgroundColor: '#F3F4F6',
              borderRadius: '6px',
              fontSize: '12px',
              fontFamily: 'monospace',
            }}
          >
            {message}
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: '24px',
          padding: '12px',
          backgroundColor: '#EFF6FF',
          border: '1px solid #BFDBFE',
          borderRadius: '6px',
        }}
      >
        <h3 style={{ fontSize: '14px', marginBottom: '8px' }}>Phase 1: Development Setup</h3>
        <ul style={{ fontSize: '12px', color: '#1E40AF', paddingLeft: '20px' }}>
          <li>✅ Vite + React + TypeScript</li>
          <li>✅ Extension manifest configured</li>
          <li>✅ Background worker running</li>
          <li>✅ Popup UI displaying</li>
          <li>⏳ Debug tools (next step)</li>
        </ul>
      </div>
    </div>
  );
}

export default App;
