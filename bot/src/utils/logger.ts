/**
 * Centralized logging utility
 * Provides structured logging with different levels
 */

export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG'
}

interface LogContext {
  userId?: number;
  ip?: string;
  path?: string;
  method?: string;
  duration?: number;
  error?: Error | unknown;
  [key: string]: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV !== 'production';
  private minLevel: LogLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level}] ${message}${contextStr}`;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG];
    return levels.indexOf(level) <= levels.indexOf(this.minLevel);
  }

  error(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage(LogLevel.ERROR, message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage(LogLevel.WARN, message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatMessage(LogLevel.INFO, message, context));
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage(LogLevel.DEBUG, message, context));
    }
  }

  // Audit logging for critical operations
  audit(action: string, context: LogContext): void {
    const auditMessage = `[AUDIT] ${action}`;
    console.log(this.formatMessage(LogLevel.INFO, auditMessage, {
      ...context,
      timestamp: new Date().toISOString()
    }));
  }

  // HTTP request logging
  http(method: string, path: string, statusCode: number, duration: number, context?: LogContext): void {
    const level = statusCode >= 500 ? LogLevel.ERROR : statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;
    const message = `${method} ${path} ${statusCode}`;
    
    if (this.shouldLog(level)) {
      const logMethod = level === LogLevel.ERROR ? console.error : level === LogLevel.WARN ? console.warn : console.log;
      logMethod(this.formatMessage(level, message, { ...context, durationMs: duration }));
    }
  }
}

export const logger = new Logger();
