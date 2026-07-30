/**
 * Hook WebSocket — reçoit ticks, analyse, bougies OHLC, mises à jour bougies.
 */
import { useEffect, useRef } from 'react'
import { useMarketStore, type Analysis, type Timeframe, type OHLCCandle } from '../store/marketStore'
import { WS_URL, API_URL } from '../utils/api'

const RECONNECT_DELAY = 3000

console.info('[WS] VITE_WS_URL =', import.meta.env.VITE_WS_URL ?? '(non défini — fallback localhost)')
console.info('[WS] URL finale =', WS_URL)

export function useWebSocket() {
  const ws      = useRef<WebSocket | null>(null)
  const timer   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dead    = useRef(false)   // true quand le composant est démonté

  useEffect(() => {
    dead.current = false

    function connect() {
      if (dead.current) return
      if (ws.current) {
        ws.current.onclose = null  // éviter le re-schedule du cleanup
        ws.current.close()
      }

      const socket = new WebSocket(WS_URL)
      ws.current = socket

      socket.onopen = () => {
        if (dead.current) { socket.close(); return }
        console.info('[WS] Connexion établie →', WS_URL)
        useMarketStore.getState().setConnected(true)
        useMarketStore.getState().setError(null)

        // Synchroniser le symbole sauvegardé avec le backend au démarrage
        const savedSymbol = useMarketStore.getState().currentSymbol
        if (savedSymbol && savedSymbol !== '1HZ50V') {
          fetch(`${API_URL}/settings/symbol?symbol=${savedSymbol}`, { method: 'POST' })
            .catch(() => {/* silencieux si le backend n'est pas encore prêt */})
        }
      }

      socket.onclose = (e) => {
        console.warn('[WS] Connexion fermée — code:', e.code)
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
              // Le backend a changé d'actif — on réinitialise l'état local
              store.setCurrentSymbol(d.symbol as string)
              break
          }
        } catch (err) {
          console.error('[WS] Parsing error:', err)
        }
      }
    }

    connect()

    return () => {
      dead.current = true
      if (timer.current) clearTimeout(timer.current)
      if (ws.current) {
        ws.current.onclose = null
        ws.current.close()
        ws.current = null
      }
    }
  }, [])  // pas de dépendances — se monte une seule fois
}
