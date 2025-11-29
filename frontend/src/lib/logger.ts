/**
 * Frontend logger for BabyFae Mini App
 * Mirrors backend logger API with the most commonly used methods
 */
export type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
const LOG_LEVELS = ['ERROR', 'WARN', 'INFO', 'DEBUG'] as const;

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private minLevel: LogLevel = this.isDevelopment ? 'DEBUG' : 'INFO';

  private shouldLog(level: LogLevel): boolean {
    const levels = LOG_LEVELS as readonly LogLevel[];
    return levels.indexOf(level) <= levels.indexOf(this.minLevel);
  }

  private format(level: LogLevel, msg: string, ctx?: Record<string, unknown>) {
    const ts = new Date().toISOString();
    let ctxStr = '';
    if (ctx) {
      try {
        ctxStr = ` ${JSON.stringify(ctx)}`;
      } catch {
        // Fallback to a safer representation if JSON stringify fails
        try {
          ctxStr = ` ${String(ctx)}`;
        } catch {
          ctxStr = ' [unserializable-context]';
        }
      }
    }
    return `[${ts}] [${level}] ${msg}${ctxStr}`;
  }

  error(msg: string, ctx?: Record<string, unknown>) {
    if (this.shouldLog('ERROR')) console.error(this.format('ERROR', msg, ctx));
  }
  warn(msg: string, ctx?: Record<string, unknown>) {
    if (this.shouldLog('WARN')) console.warn(this.format('WARN', msg, ctx));
  }
  info(msg: string, ctx?: Record<string, unknown>) {
    if (this.shouldLog('INFO')) console.log(this.format('INFO', msg, ctx));
  }
  debug(msg: string, ctx?: Record<string, unknown>) {
    if (this.shouldLog('DEBUG')) console.debug(this.format('DEBUG', msg, ctx));
  }

  http(method: string, path: string, statusCode: number, durationMs?: number) {
    const level: LogLevel = statusCode >= 500 ? 'ERROR' : statusCode >= 400 ? 'WARN' : 'INFO';
    if (level === 'ERROR') {
      this.error(`${method} ${path} ${statusCode}`, { durationMs });
    } else if (level === 'WARN') {
      this.warn(`${method} ${path} ${statusCode}`, { durationMs });
    } else {
      this.info(`${method} ${path} ${statusCode}`, { durationMs });
    }
  }
}

export const logger = new Logger();
