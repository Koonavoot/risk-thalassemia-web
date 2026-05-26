/**
 * Auth helper utilities for JWT token management.
 * Uses localStorage for storing the access token (and a cookie for middleware).
 */

const TOKEN_KEY = "thal_access_token";

export function getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    // Also set a cookie so Next.js middleware can read it (middleware can't access localStorage)
    document.cookie = `${TOKEN_KEY}=${token}; path=/; SameSite=Lax; max-age=${60 * 60 * 8}`;
}

/**
 * Set token then navigate — delays navigation by one event-loop tick so the
 * browser has time to flush the cookie before the page unloads.
 * This prevents the race condition where middleware reads the cookie before
 * it has been committed, causing a redirect back to /login.
 */
export function setTokenAndNavigate(token: string, destination: string): void {
    setToken(token);
    // Use setTimeout(0) to yield control back to the browser so it can
    // commit localStorage + cookie writes before the hard navigation fires.
    setTimeout(() => {
        window.location.href = destination;
    }, 0);
}

export function removeToken(): void {
    localStorage.removeItem(TOKEN_KEY);
    // Expire the cookie
    document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
}

export function isLoggedIn(): boolean {
    return Boolean(getToken());
}

export function authHeaders(): Record<string, string> {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}
