import { describe, it, expect, beforeEach } from 'vitest';
import { logger, LogContext, LogLevel } from '@/shared/logger';

describe('Logger', () => {
  beforeEach(() => {
    // Clear logs before each test
    logger.clearLogs();
  });

  it('should log messages', () => {
    logger.info(LogContext.BACKGROUND, 'Test message');

    const logs = logger.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].message).toBe('Test message');
    expect(logs[0].level).toBe(LogLevel.INFO);
    expect(logs[0].context).toBe(LogContext.BACKGROUND);
  });

  it('should log with data', () => {
    const testData = { foo: 'bar', count: 42 };
    logger.debug(LogContext.CRYPTO, 'Test with data', testData);

    const logs = logger.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].data).toEqual(testData);
  });

  it('should filter sensitive data', () => {
    const sensitiveData = {
      username: 'john',
      password: 'secret123',
      privateKey: '0xabcdef...',
      seedPhrase: 'test test test...',
    };

    logger.warn(LogContext.VAULT, 'Sensitive data test', sensitiveData);

    const logs = logger.getLogs();
    const logData = logs[0].data as Record<string, unknown>;

    expect(logData.username).toBe('john');
    expect(logData.password).toBe('[REDACTED]');
    expect(logData.privateKey).toBe('[REDACTED]');
    expect(logData.seedPhrase).toBe('[REDACTED]');
  });

  it('should filter logs by context', () => {
    logger.info(LogContext.BACKGROUND, 'Background message');
    logger.info(LogContext.POPUP, 'Popup message');
    logger.info(LogContext.BACKGROUND, 'Another background message');

    const backgroundLogs = logger.getLogsByContext(LogContext.BACKGROUND);
    expect(backgroundLogs).toHaveLength(2);
    expect(backgroundLogs.every((log) => log.context === LogContext.BACKGROUND)).toBe(true);
  });

  it('should filter logs by level', () => {
    logger.debug(LogContext.BACKGROUND, 'Debug message');
    logger.info(LogContext.BACKGROUND, 'Info message');
    logger.error(LogContext.BACKGROUND, 'Error message');
    logger.error(LogContext.BACKGROUND, 'Another error');

    const errorLogs = logger.getLogsByLevel(LogLevel.ERROR);
    expect(errorLogs).toHaveLength(2);
    expect(errorLogs.every((log) => log.level === LogLevel.ERROR)).toBe(true);
  });

  it('should enable and disable contexts', () => {
    // Disable a context
    logger.disable(LogContext.NETWORK);
    expect(logger.isEnabled(LogContext.NETWORK)).toBe(false);

    // Log to disabled context - should not be logged
    logger.info(LogContext.NETWORK, 'This should not appear');
    expect(logger.getLogs()).toHaveLength(0);

    // Re-enable
    logger.enable(LogContext.NETWORK);
    expect(logger.isEnabled(LogContext.NETWORK)).toBe(true);

    // Now it should log
    logger.info(LogContext.NETWORK, 'This should appear');
    expect(logger.getLogs()).toHaveLength(1);
  });

  it('should clear all logs', () => {
    logger.info(LogContext.BACKGROUND, 'Message 1');
    logger.info(LogContext.BACKGROUND, 'Message 2');
    expect(logger.getLogs()).toHaveLength(2);

    logger.clearLogs();
    expect(logger.getLogs()).toHaveLength(0);
  });

  it('should export logs as JSON', () => {
    logger.info(LogContext.BACKGROUND, 'Test message', { foo: 'bar' });

    const exported = logger.exportLogs();
    const parsed = JSON.parse(exported);

    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].message).toBe('Test message');
  });

  it('should include timestamp in logs', () => {
    const beforeTime = Date.now();
    logger.info(LogContext.BACKGROUND, 'Test');
    const afterTime = Date.now();

    const logs = logger.getLogs();
    expect(logs[0].timestamp).toBeGreaterThanOrEqual(beforeTime);
    expect(logs[0].timestamp).toBeLessThanOrEqual(afterTime);
  });
});
