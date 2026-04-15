export const SESSION_STORAGE_KEY = "worldforge-session-token";

export function shouldAttemptWorldLoad(storedToken: string | null, hasSession: boolean): boolean {
  return Boolean(storedToken || hasSession);
}

export function nextStoredSessionToken(
  currentToken: string | null,
  responseStatus: number,
  responseToken: string | null,
): string | null {
  if (responseToken) {
    return responseToken;
  }

  if (responseStatus === 401) {
    return null;
  }

  return currentToken;
}
