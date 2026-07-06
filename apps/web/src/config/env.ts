/**
 * Empty in dev — Vite proxies /api to the local API. Set on Vercel.
 * Trailing slashes are stripped so a value like "https://api.example.com/"
 * doesn't produce a double slash ("//api/v1") that 404s on Express.
 */
export const API_BASE_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/+$/, '');
