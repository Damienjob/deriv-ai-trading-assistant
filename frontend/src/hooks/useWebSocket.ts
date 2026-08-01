/**
 * Hook WebSocket — reçoit ticks, analyse, bougies OHLC, mises à jour bougies.
 */
import { useEffect, useRef } from 'react'
import { useMarketStore, type Analysis, type Timeframe, type OHLCCandle } from '../store/marketStore'
import { WS_URL, API_URL } from '../utils/api'

const RECONNECT_DELAY = 3000
const PING_INTERVAL   = 10_000  // envoie un ping toutes les 10s
const PONG_TIMEOUT    = 5_000   // si pas de pong dans 5s → connexion morte

console.info('[WS] VITE_WS_URL =', import.meta.env.VITE_WS_URL ?? '(non défini — fallback localhost)')
console.info('[WS] URL finale =', WS_URL)

export function useWebSocket() {
  const ws        = useRef<WebSocket | null>(null)
  const timer     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ping      = useRef<ReturnType<typeof setInterval> | null>(null)
  const pongTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dead      = useRef(false)

  useEffect(() => {
    dead.current = false

    function connect() {
      if (dead.current) return
      if (ws.current) {
        ws.current.onclose = null
        ws.current.close()
      }

      const socket = new WebSocket(WS_URL)
      ws.current = socket

      socket.onopen = () => {
        if (dead.current) { socket.close(); return }
        console.info('[WS] Connexion établie →', WS_URL)
        useMarketStore.getState().setConnected(true)
        useMarketStore.getState().setError(null)

        // Ping/pong actif : détecte une connexion morte en max 15s (10s + 5s timeout)
        if (ping.current) clearInterval(ping.current)
        ping.current = setInterval(() => {
          if (socket.readyState !== WebSocket.OPEN) return
          socket.send('ping')
          // Si pas de pong dans 5s → connexion zombie → forcer reconnexion
          pongTimer.current = setTimeout(() => {
            console.warn('[WS] Pong timeout — connexion zombie, reconnexion forcée')
            socket.onclose = null
            socket.close()
            if (ping.current) { clearInterval(ping.current); ping.current = null }
            useMarketStore.getState().setConnected(false)
            if (!dead.current) timer.current = setTimeout(connect, 500)
          }, PONG_TIMEOUT)
        }, PING_INTERVAL)

        // Synchroniser le symbole sauvegardé avec le backend au démarrage
        const savedSymbol = useMarketStore.getState().currentSymbol
        if (savedSymbol && savedSymbol !== '1HZ50V') {
          fetch(`${API_URL}/settings/symbol?symbol=${savedSymbol}`, { method: 'POST' })
            .catch(() => {/* silencieux si le backend n'est pas encore prêt */})
        }
      }

      socket.onclose = (e) => {
        console.warn('[WS] Connexion fermée — code:', e.code)
        if (pongTimer.current) { clearTimeout(pongTimer.current);  pongTimer.current = null }
        if (ping.current)      { clearInterval(ping.current);      ping.current      = null }
        useMarketStore.getState().setConnected(false)
        if (!dead.current) {
          timer.current = setTimeout(connect, RECONNECT_DELAY)
        }
      }

      socket.onerror = () => {
        useMarketStore.getState().setError('Connexion impossible')
      }

      socket.onmessage = (e) => {
        if (dead.current) return
        // Tout message reçu = connexion vivante → annuler le timeout pong
        if (pongTimer.current) { clearTimeout(pongTimer.current); pongTimer.current = null }
        if (e.data === 'pong') return
        try {
          const d = JSON.parse(e.data)
          const store = useMarketStore.getState()
          switch (d.type) {
            case 'tick':
              store.setTick(
                { symbol: d.symbol, price: d.price, timestamp: d.timestamp },
                d.analysis as Analysis | undefined
              )
              break
            case 'candles_snapshot':
              store.setCandlesSnapshot(d.data as Record<string, OHLCCandle[]>)
              break
            case 'candle_update':
              store.updateCandle(d.timeframe as Timeframe, d.candle as OHLCCandle)
              break
            case 'symbol_changed':
              store.setCurrentSymbol(d.symbol as string)
              break
          }
        } catch (err) {
          console.error('[WS] Parsing error:', err)
        }
      }
    }

    connect()

    // Reconnecter quand l'app revient au premier plan (iOS Safari tue les WS en arrière-plan)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const state = ws.current?.readyState
        if (state === WebSocket.CLOSED || state === WebSocket.CLOSING) {
          console.info('[WS] Reprise au premier plan — reconnexion')
          connect()
        }
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      dead.current = true
      document.removeEventListener('visibilitychange', onVisibilityChange)
      if (pongTimer.current) { clearTimeout(pongTimer.current);  pongTimer.current = null }
      if (ping.current)      { clearInterval(ping.current);      ping.current      = null }
      if (timer.current)     { clearTimeout(timer.current);      timer.current     = null }
      if (ws.current) {
        ws.current.onclose = null
        ws.current.close()
        ws.current = null
      }
    }
  }, [])
}
