export const ACCESS_COOKIE = 'rwhms_access';
export const REFRESH_COOKIE = 'rwhms_refresh';
export const CSRF_COOKIE = 'rwhms_csrf';
export const CSRF_HEADER = 'x-csrf-token';

/** The access and CSRF cookies are sent to every API route; the refresh cookie only to auth routes. */
export const API_COOKIE_PATH = '/api';
export const REFRESH_COOKIE_PATH = '/api/v1/auth';

export const MAX_FAILED_LOGINS = 5;
export const LOCKOUT_MINUTES = 15;
export const RESET_TOKEN_TTL_MINUTES = 30;

/**
 * Two tabs can refresh at the same moment with the same refresh token. A second use within this
 * window is treated as that race, not as token theft.
 */
export const REFRESH_REUSE_GRACE_SECONDS = 30;
