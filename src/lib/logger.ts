/**
 * Structured JSON logger — outputs to stdout/stderr.
 * On Vercel, these go to the Function Logs panel.
 * Controlled by LOG_LEVEL env var (debug | info | warn | error). Default: info.
 */

type Level = "debug" | "info" | "warn" | "error";

const LEVELS: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };

const currentLevel: number =
  LEVELS[(process.env.LOG_LEVEL as Level) ?? "info"] ?? LEVELS.info;

function emit(
  level: Level,
  module: string,
  message: string,
  data?: Record<string, unknown>,
): void {
  if (LEVELS[level] < currentLevel) return;

  const entry = {
    ts: new Date().toISOString(),
    level,
    module,
    message,
    ...(data ?? {}),
  };

  const line = JSON.stringify(entry);

  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  // eslint-disable-next-line no-console
  else console.info(line);
}

export const logger = {
  debug: (module: string, message: string, data?: Record<string, unknown>) =>
    emit("debug", module, message, data),
  info: (module: string, message: string, data?: Record<string, unknown>) =>
    emit("info", module, message, data),
  warn: (module: string, message: string, data?: Record<string, unknown>) =>
    emit("warn", module, message, data),
  error: (module: string, message: string, data?: Record<string, unknown>) =>
    emit("error", module, message, data),
};
