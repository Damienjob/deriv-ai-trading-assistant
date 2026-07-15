/**
 * URLs backend — lues depuis les variables d'environnement Vite.
 * En production : VITE_WS_URL=wss://deriv-ai-trading-assistant-1.onrender.com
 * En local      : fallback sur localhost
 */
const BASE = import.meta.env.VITE_WS_URL
  ? import.meta.env.VITE_WS_URL.replace(/^wss?:\/\//, 'https://')
  : 'http://localhost:8000'

export const API_URL = BASE
export const WS_URL  = (import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000') + '/market/ws'
