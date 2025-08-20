/**
 * Frontend Logger Utility
 * Provides structured logging for the frontend application
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
  error?: Error;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private logLevel: LogLevel = this.isDevelopment ? 'debug' : 'warn';

  /**
   * Set the minimum log level
   */
  setLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * Check if a log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };

    return levels[level] >= levels[this.logLevel];
  }

  /**
   * Format log entry for output
   */
  private formatLog(entry: LogEntry): string {
    const { level, message, timestamp, data } = entry;
    let formatted = `[${timestamp}] ${level.toUpperCase()}: ${message}`;

    if (data && Object.keys(data).length > 0) {
      formatted += ` | Data: ${JSON.stringify(data)}`;
    }

    return formatted;
  }

  /**
   * Create log entry
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>,
    error?: Error
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      data,
      error,
    };
  }

  /**
   * Output log to console
   */
  private output(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    const formatted = this.formatLog(entry);

    switch (entry.level) {
      case 'debug':
        console.debug(formatted, entry.data);
        break;
      case 'info':
        console.info(formatted, entry.data);
        break;
      case 'warn':
        console.warn(formatted, entry.data);
        break;
      case 'error':
        console.error(formatted, entry.data, entry.error);
        break;
    }
  }

  /**
   * Log debug message
   */
  debug(message: string, data?: Record<string, unknown>): void {
    const entry = this.createLogEntry('debug', message, data);
    this.output(entry);
  }

  /**
   * Log info message
   */
  info(message: string, data?: Record<string, unknown>): void {
    const entry = this.createLogEntry('info', message, data);
    this.output(entry);
  }

  /**
   * Log warning message
   */
  warn(message: string, data?: Record<string, unknown>): void {
    const entry = this.createLogEntry('warn', message, data);
    this.output(entry);
  }

  /**
   * Log error message
   */
  error(message: string, data?: Record<string, unknown>, error?: Error): void {
    const entry = this.createLogEntry('error', message, data, error);
    this.output(entry);
  }

  /**
   * Log performance timing
   */
  time(label: string): void {
    if (this.isDevelopment) {
      console.time(label);
    }
  }

  /**
   * End performance timing
   */
  timeEnd(label: string): void {
    if (this.isDevelopment) {
      console.timeEnd(label);
    }
  }

  /**
   * Group related logs
   */
  group(label: string): void {
    if (this.isDevelopment) {
      console.group(label);
    }
  }

  /**
   * End log group
   */
  groupEnd(): void {
    if (this.isDevelopment) {
      console.groupEnd();
    }
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger();

/**
 * Create a scoped logger with a prefix
 */
export function createScopedLogger(scope: string): Logger {
  const scopedLogger = new Logger();

  // Override methods to add scope prefix
  const originalMethods = ['debug', 'info', 'warn', 'error'] as const;

  originalMethods.forEach(method => {
    const originalMethod = scopedLogger[method].bind(scopedLogger);
    scopedLogger[method] = (
      message: string,
      data?: Record<string, unknown>,
      error?: Error
    ): void => {
      originalMethod(`[${scope}] ${message}`, data, error);
    };
  });

  return scopedLogger;
}
