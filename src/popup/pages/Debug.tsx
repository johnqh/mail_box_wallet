import { useState, useEffect } from 'react';
import { logger, LogContext, LogLevel } from '@/shared/logger';
import browser from 'webextension-polyfill';

function Debug() {
  const [logs, setLogs] = useState(logger.getLogs());
  const [selectedContext, setSelectedContext] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Refresh logs periodically
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setLogs(logger.getLogs());
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const filteredLogs = logs.filter((log) => {
    if (selectedContext !== 'all' && log.context !== selectedContext) {
      return false;
    }
    if (selectedLevel !== 'all' && log.level !== selectedLevel) {
      return false;
    }
    return true;
  });

  const clearLogs = () => {
    logger.clearLogs();
    setLogs([]);
  };

  const exportLogs = () => {
    const exported = logger.exportLogs();
    const blob = new Blob([exported], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wallet-logs-${Date.now()}.json`;
    a.click();
  };

  const clearStorage = async () => {
    if (confirm('Clear all extension storage? This will reset the wallet!')) {
      await browser.storage.local.clear();
      alert('Storage cleared!');
    }
  };

  const testBackgroundMessage = async () => {
    try {
      const response = await browser.runtime.sendMessage({
        type: 'TEST_DEBUG',
        payload: { timestamp: Date.now() },
      });
      logger.info(LogContext.POPUP, 'Background response', response);
      setLogs(logger.getLogs());
    } catch (error) {
      logger.error(LogContext.POPUP, 'Background test failed', error);
      setLogs(logger.getLogs());
    }
  };

  return (
    <div style={{ padding: '16px', width: '100%', maxWidth: '800px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>
          Debug Panel
        </h2>
        <p style={{ fontSize: '12px', color: '#666' }}>
          Development and debugging tools
        </p>
      </div>

      {/* Controls */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '8px',
          marginBottom: '16px',
        }}
      >
        <button
          onClick={testBackgroundMessage}
          style={{
            padding: '8px 12px',
            backgroundColor: '#3B82F6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          Test Background
        </button>
        <button
          onClick={clearLogs}
          style={{
            padding: '8px 12px',
            backgroundColor: '#6B7280',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          Clear Logs
        </button>
        <button
          onClick={exportLogs}
          style={{
            padding: '8px 12px',
            backgroundColor: '#10B981',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          Export Logs
        </button>
        <button
          onClick={clearStorage}
          style={{
            padding: '8px 12px',
            backgroundColor: '#EF4444',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          Clear Storage
        </button>
      </div>

      {/* Filters */}
      <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <select
          value={selectedContext}
          onChange={(e) => setSelectedContext(e.target.value)}
          style={{
            padding: '6px 8px',
            border: '1px solid #D1D5DB',
            borderRadius: '4px',
            fontSize: '12px',
          }}
        >
          <option value="all">All Contexts</option>
          {Object.values(LogContext).map((context) => (
            <option key={context} value={context}>
              {context}
            </option>
          ))}
        </select>

        <select
          value={selectedLevel}
          onChange={(e) => setSelectedLevel(e.target.value)}
          style={{
            padding: '6px 8px',
            border: '1px solid #D1D5DB',
            borderRadius: '4px',
            fontSize: '12px',
          }}
        >
          <option value="all">All Levels</option>
          {Object.values(LogLevel).map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>

        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
          />
          Auto-refresh
        </label>

        <span style={{ fontSize: '12px', color: '#666', marginLeft: 'auto' }}>
          {filteredLogs.length} log{filteredLogs.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Logs */}
      <div
        style={{
          border: '1px solid #D1D5DB',
          borderRadius: '6px',
          maxHeight: '400px',
          overflowY: 'auto',
        }}
      >
        {filteredLogs.length === 0 ? (
          <div
            style={{
              padding: '32px',
              textAlign: 'center',
              color: '#9CA3AF',
              fontSize: '14px',
            }}
          >
            No logs to display
          </div>
        ) : (
          <div>
            {filteredLogs.map((log, index) => {
              const levelColor =
                log.level === LogLevel.ERROR
                  ? '#EF4444'
                  : log.level === LogLevel.WARN
                    ? '#F59E0B'
                    : log.level === LogLevel.INFO
                      ? '#3B82F6'
                      : '#6B7280';

              return (
                <div
                  key={index}
                  style={{
                    padding: '8px 12px',
                    borderBottom: index < filteredLogs.length - 1 ? '1px solid #E5E7EB' : 'none',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                  }}
                >
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ color: '#9CA3AF' }}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span style={{ color: levelColor, fontWeight: 'bold' }}>
                      [{log.level.toUpperCase()}]
                    </span>
                    <span style={{ color: '#6B7280' }}>[{log.context}]</span>
                  </div>
                  <div style={{ marginLeft: '8px' }}>
                    <div>{log.message}</div>
                    {log.data !== undefined && log.data !== null && (
                      <pre
                        style={{
                          marginTop: '4px',
                          padding: '6px',
                          backgroundColor: '#F3F4F6',
                          borderRadius: '3px',
                          overflow: 'auto',
                          fontSize: '11px',
                        }}
                      >
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Debug;
