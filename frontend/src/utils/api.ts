/**
 * URLs backend — lues depuis les variables d'environnement Vite.
 * En production : VITE_WS_URL=wss://deriv-ai-trading-assistant-1.onrender.com
 * En local      : fallback sur localhost
 */
const WS_BASE = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000'

// Convertir ws:// → http://, wss:// → https://
const HTTP_BASE = WS_BASE.replace(/^ws:\/\//, 'http://').replace(/^wss:\/\//, 'https://')

export const API_URL = HTTP_BASE
export const WS_URL  = WS_BASE + '/market/ws'
