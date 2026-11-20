let csrf = '';
export function setCsrf(token: string) { csrf = token; }
export function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (init.method && !['GET', 'HEAD'].includes(init.method.toUpperCase())) headers.set('X-CSRF-Token', csrf);
  return fetch(input, { ...init, headers, credentials: 'same-origin' });
}
