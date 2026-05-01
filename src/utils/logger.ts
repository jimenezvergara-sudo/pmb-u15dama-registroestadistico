/**
 * Logger condicional para BASQUEST+.
 *
 * - `log`, `info`, `debug`, `warn`: solo emiten en modo desarrollo (`import.meta.env.DEV`).
 * - `error`: SIEMPRE emite, incluso en producción. Los errores reales son
 *   críticos para diagnosticar problemas post-mortem (especialmente durante
 *   un partido en vivo).
 *
 * Uso:
 *   import { logger } from '@/utils/logger';
 *   logger.warn('[startGame] read-only category, blocked');
 *   logger.error('[syncQueue] failed op', op.kind, err);
 */

const isDev = import.meta.env.DEV;

type LogFn = (...args: unknown[]) => void;

interface Logger {
  log: LogFn;
  info: LogFn;
  debug: LogFn;
  warn: LogFn;
  error: LogFn;
}

const noop: LogFn = () => {};

export const logger: Logger = {
  log: isDev ? console.log.bind(console) : noop,
  info: isDev ? console.info.bind(console) : noop,
  debug: isDev ? console.debug.bind(console) : noop,
  warn: isDev ? console.warn.bind(console) : noop,
  // Errors always go through — never silenced in production.
  error: console.error.bind(console),
};
