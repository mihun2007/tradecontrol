export function logError(message: string, error?: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.error(message, error);
  }
}

export function logWarn(message: string, details?: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.warn(message, details);
  }
}
