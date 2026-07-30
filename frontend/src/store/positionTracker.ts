/**
 * Store Zustand — Suivi des positions ouvertes (saisie manuelle style MT5).
 * Persisté dans localStorage pour survivre aux rechargements.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type TradeDirection = 'BUY' | 'SELL'

export interface OpenPosition {
  id: string              // uuid local
  symbol: string          // ex: "1HZ10V"
  direction: TradeDirection
  lot: number             // ex: 0.50
  entryPrice: number      // prix d'entrée saisi
  tpMT5: number | null    // TP que l'utilisateur a mis dans MT5 (optionnel)
  openedAt: number        // timestamp epoch (Date.now())
}

// Résultat d'analyse calculé live à partir de l'analyse MTF
export interface PositionAnalysis {
  id: string
  pnl: number             // P&L actuel en $ (live)
  pnlPips: number         // P&L en pips
  tpAnalysis: number      // TP calculé par notre analyse (depuis prix entrée)
  slAnalysis: number      // SL calculé par notre analyse (depuis prix entrée)
  recommendation: 'hold' | 'reduce' | 'close' | 'urgent'
  recommendationLabel: string
  recommendationColor: string
  exitPrice: number       // prix de sortie recommandé (TP si hold, prix actuel si urgent)
  exitReason: string      // explication courte
}

interface PositionTrackerState {
  positions: OpenPosition[]
  addPosition: (p: Omit<OpenPosition, 'id' | 'openedAt'>) => void
  removePosition: (id: string) => void
  clearAll: () => void
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10)
}

export const usePositionTracker = create<PositionTrackerState>()(
  persist(
    (set) => ({
      positions: [],

      addPosition: (p) =>
        set((state) => ({
          positions: [
            ...state.positions,
            {
              ...p,
              id: generateId(),
              openedAt: Date.now(),
            },
          ],
        })),

      removePosition: (id) =>
        set((state) => ({
          positions: state.positions.filter((p) => p.id !== id),
        })),

      clearAll: () => set({ positions: [] }),
    }),
    {
      name: 'deriv-open-positions',  // clé localStorage
    }
  )
)
