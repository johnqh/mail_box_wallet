/**
 * Debug Logger
 *
 * A structured logging system that:
 * - Categorizes logs by context (background, popup, content, etc.)
 * - Supports different log levels (debug, info, warn, error)
 * - Can be enabled/disabled per category
 * - Persists logs for debugging (in dev mode)
 * - Filters sensitive data (private keys, passwords)
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export enum LogContext {
  BACKGROUND = 'background',
  POPUP = 'popup',
  CONTENT = 'content',
  INPAGE = 'inpage',
  CRYPTO = 'crypto',
  NETWORK = 'network',
  VAULT = 'vault',
  KEYRING = 'keyring',
  SIGNER = 'signer',
}

interface LogEntry {
  timestamp: number;
  level: LogLevel;
  context: LogContext;
  message: string;
  data?: unknown;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 logs
  private enabledContexts: Set<LogContext> = new Set();
  private isDev: boolean;

  constructor() {
    // Enable all contexts in development
    this.isDev = import.meta.env.DEV;

    if (this.isDev) {
      Object.values(LogContext).forEach((context) => {
        this.enabledContexts.add(context as LogContext);
      });
    }
  }

  /**
   * Enable logging for a specific context
   */
  enable(context: LogContext) {
    this.enabledContexts.add(context);
  }

  /**
   * Disable logging for a specific context
   */
  disable(context: LogContext) {
    this.enabledContexts.delete(context);
  }

  /**
   * Check if a context is enabled
   */
  isEnabled(context: LogContext): boolean {
    return this.enabledContexts.has(context);
  }

  /**
   * Filter sensitive data from logs
   */
  private filterSensitiveData(data: unknown): unknown {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sensitiveKeys = [
      'privateKey',
      'password',
      'seedPhrase',
      'mnemonic',
      'secret',
      'key',
    ];

    const filtered = { ...data } as Record<string, unknown>;

    for (const key of Object.keys(filtered)) {
      if (sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive.toLowerCase()))) {
        filtered[key] = '[REDACTED]';
      } else if (typeof filtered[key] === 'object' && filtered[key] !== null) {
        filtered[key] = this.filterSensitiveData(filtered[key]);
      }
    }

    return filtered;
  }

  /**
   * Add a log entry
   */
  private addLog(level: LogLevel, context: LogContext, message: string, data?: unknown) {
    if (!this.isEnabled(context)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      context,
      message,
      data: data ? this.filterSensitiveData(data) : undefined,
    };

    this.logs.push(entry);

    // Trim logs if exceeds max
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Also log to console in dev mode
    if (this.isDev) {
      const style = this.getConsoleStyle(level);
      const prefix = `[${context}]`;

      switch (level) {
        case LogLevel.DEBUG:
          console.debug(`%c${prefix}`, style, message, data || '');
          break;
        case LogLevel.INFO:
          console.info(`%c${prefix}`, style, message, data || '');
          break;
        case LogLevel.WARN:
          console.warn(`%c${prefix}`, style, message, data || '');
          break;
        case LogLevel.ERROR:
          console.error(`%c${prefix}`, style, message, data || '');
          break;
      }
    }
  }

  /**
   * Get console style for log level
   */
  private getConsoleStyle(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return 'color: #6B7280; font-weight: bold;';
      case LogLevel.INFO:
        return 'color: #3B82F6; font-weight: bold;';
      case LogLevel.WARN:
        return 'color: #F59E0B; font-weight: bold;';
      case LogLevel.ERROR:
        return 'color: #EF4444; font-weight: bold;';
    }
  }

  /**
   * Log methods
   */
  debug(context: LogContext, message: string, data?: unknown) {
    this.addLog(LogLevel.DEBUG, context, message, data);
  }

  info(context: LogContext, message: string, data?: unknown) {
    this.addLog(LogLevel.INFO, context, message, data);
  }

  warn(context: LogContext, message: string, data?: unknown) {
    this.addLog(LogLevel.WARN, context, message, data);
  }

  error(context: LogContext, message: string, data?: unknown) {
    this.addLog(LogLevel.ERROR, context, message, data);
  }

  /**
   * Get all logs
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Get logs for a specific context
   */
  getLogsByContext(context: LogContext): LogEntry[] {
    return this.logs.filter((log) => log.context === context);
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter((log) => log.level === level);
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.logs = [];
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Create singleton instance
export const logger = new Logger();

// Export convenience functions
export const createContextLogger = (context: LogContext) => ({
  debug: (message: string, data?: unknown) => logger.debug(context, message, data),
  info: (message: string, data?: unknown) => logger.info(context, message, data),
  warn: (message: string, data?: unknown) => logger.warn(context, message, data),
  error: (message: string, data?: unknown) => logger.error(context, message, data),
});
