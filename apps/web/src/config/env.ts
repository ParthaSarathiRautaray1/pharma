/** Empty in dev — Vite proxies /api to the local API. Set on Vercel. */
export const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '';
