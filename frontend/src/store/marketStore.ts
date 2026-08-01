/**
 * Store Zustand — données marché + analyse MTF + settings utilisateur.
 * currentSymbol et baseAmount sont persistés dans localStorage.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Tick {
  symbol: string
  price: number
  timestamp: number
}

export interface TFIndicators {
  ema20: number | null
  ema50: number | null
  rsi14: number | null
  macd_line: number | null
  macd_signal: number | null
  macd_histogram: number | null
  bb_upper: number | null
  bb_middle: number | null
  bb_lower: number | null
  support: number | null
  resistance: number | null
  atr: number | null
}

export interface TFAnalysis {
  label: string
  granularity: number
  candle_count: number
  indicators: TFIndicators
  trend: { direction: string; label: string; strength: number }
  volatility: { regime: string; label: string; atr_pct: number | null }
  signal: { direction: number; reasons: string[]; confidence: number }
}

export interface MTFData {
  bull: number
  bear: number
  neutral: number
  alignment: number
}

export interface Signal {
  type: 'BUY' | 'SELL' | 'NEUTRAL' | 'WAIT'
  label: string
  confidence: number
  reasons: string[]
  advice: string
  why: string
}

export interface Stake {
  amount: number
  pct_of_capital: number
  reason: string
  enter_now: boolean
}

export interface PositionPlan {
  entry_price: number
  direction: string
  take_profit: number
  stop_loss: number
  tp_pips: number
  sl_pips: number
  risk_reward: number
  lot_size: number
  nb_lots: number
  total_stake: number
  potential_gain: number
  potential_loss: number
  duration: { min_minutes: number; max_minutes: number; label: string }
  repeat: { max_repeats: number; advice: string }
  exit_message: string
  warning: string
  loss_alert_pct: number
  loss_alert_price: number
  buy_limit: number | null
  sell_limit: number | null
  early_exit_advice: string
}

export interface PendingOrder {
  direction: string
  target_price: number
  current_price: number
  distance_pct: number
  distance_abs: number
  estimated_confidence: number
  level_type: string
  level_label: string
  rationale: string
  proximity_alert: boolean
  conditions_at_target: string[]
}

export interface PriceActionResult {
  confirmed: boolean
  direction: string
  pattern: {
    pattern: string
    direction: string
    strength: string
    label: string
    body_ratio: number
    wick_ratio: number
  } | null
  pattern_label: string
  limit_price: number | null
  limit_type: string
  limit_label: string
  sl_price: number | null
  score: number
  rationale: string
}

export interface Analysis {
  indicators: any
  price: number
  timestamp: number
  symbol: string
  confirmation_ok: boolean        // True = signal confirmé sur N bougies
  price_action: PriceActionResult | null   // Confirmation Price Action M5
  timeframes: Record<string, TFAnalysis>
  mtf: MTFData
  volatility: { regime: string; label: string }
  signal: Signal
  signal_stability: {
    locked: boolean
    remaining_seconds: number
    remaining_label: string
    tick_count: number
  }
  stake: Stake
  position: PositionPlan | null
  pending_orders: PendingOrder[]
  strategies: unknown | null
  fvgs: FVGZone[]
  nearest_fvg_entry: FVGZone | null
}

export interface FVGZone {
  direction: 'bullish' | 'bearish'
  top: number
  bottom: number
  midpoint: number
  size: number
  filled: boolean
  strength: 'strong' | 'medium' | 'weak'
}

// ─── Bougies OHLC ───────────────────────────────────────────
export interface OHLCCandle {
  time: number   // epoch Unix
  open: number
  high: number
  low: number
  close: number
}

export type Timeframe = '1min' | '5min' | '15min' | '30min' | '1h'

export type AppView = 'home' | 'dashboard' | 'analysis' | 'positions'

interface MarketState {
  currentTick: Tick | null
  ticks: Tick[]
  analysis: Analysis | null
  isConnected: boolean
  isReady: boolean
  candlesLoaded: boolean
  error: string | null
  baseAmount: number
  currentSymbol: string
  currentView: AppView
  candles: Record<Timeframe, OHLCCandle[]>
  activeTimeframe: Timeframe

  setTick: (tick: Tick, analysis?: Analysis) => void
  setConnected: (v: boolean) => void
  setError: (e: string | null) => void
  setBaseAmount: (v: number) => void
  setCurrentSymbol: (s: string) => void
  setCurrentView: (v: AppView) => void
  setCandlesSnapshot: (data: Record<string, OHLCCandle[]>) => void
  updateCandle: (timeframe: Timeframe, candle: OHLCCandle) => void
  setActiveTimeframe: (tf: Timeframe) => void
}

export const useMarketStore = create<MarketState>()(
  persist(
    (set) => ({
      currentTick: null,
      ticks: [],
      analysis: null,
      isConnected: false,
      isReady: false,
      candlesLoaded: false,
      error: null,
      baseAmount: 100,
      currentSymbol: '1HZ50V',
      currentView: 'home' as AppView,
      candles: { '1min': [], '5min': [], '15min': [], '30min': [], '1h': [] },
      activeTimeframe: '5min',

  setTick: (tick, analysis) =>
    set((state) => {
      const last = state.ticks[state.ticks.length - 1]
      if (last && last.timestamp === tick.timestamp && last.price === tick.price) {
        return analysis ? { analysis } : {}
      }
      return {
        currentTick: tick,
        ticks: [...state.ticks.slice(-299), tick],
        analysis: analysis ?? state.analysis,
        // isReady devient true dès qu'on a un tick — ne repasse JAMAIS à false
        isReady: true,
      }
    }),
  setConnected: (v) => set({ isConnected: v }),
  setError: (e) => set({ error: e }),
  setBaseAmount: (v) => set({ baseAmount: v }),
  setCurrentView: (v) => set({ currentView: v }),
  setCurrentSymbol: (s) => set({
    currentSymbol: s,
    ticks: [],
    analysis: null,
    // isReady reste true — on garde l'app affichée pendant le changement d'actif
    candlesLoaded: false,
    candles: { '1min': [], '5min': [], '15min': [], '30min': [], '1h': [] },
  }),

  setCandlesSnapshot: (data) => set((state) => {
    const candles = { ...state.candles }
    for (const [tf, list] of Object.entries(data)) {
      if (tf in candles) {
        const seen = new Set<number>()
        candles[tf as Timeframe] = (list as OHLCCandle[])
          .sort((a, b) => a.time - b.time)
          .filter(c => {
            if (seen.has(c.time)) return false
            seen.add(c.time)
            return true
          })
      }
    }
    const candlesLoaded = Object.values(candles).some(c => c.length > 0)
    return {
      candles,
      candlesLoaded,
      ...(candlesLoaded && { isReady: true }),
    }
  }),

  updateCandle: (timeframe, candle) => set((state) => {
    const list = [...(state.candles[timeframe] ?? [])]
    const lastIdx = list.length - 1
    if (lastIdx >= 0 && list[lastIdx].time === candle.time) {
      // Mettre à jour la bougie existante
      list[lastIdx] = candle
    } else if (lastIdx >= 0 && candle.time <= list[lastIdx].time) {
      // Timestamp identique ou antérieur — ignorer pour éviter les doublons
      return {}
    } else {
      // Nouvelle bougie
      list.push(candle)
      if (list.length > 500) list.shift()
    }
    return { candles: { ...state.candles, [timeframe]: list } }
  }),

  setActiveTimeframe: (tf) => set({ activeTimeframe: tf }),
    }),
    {
      name: 'deriv-market-settings',  // clé localStorage
      // Ne persister QUE les préférences utilisateur — pas les données live
      partialize: (state) => ({
        currentSymbol:   state.currentSymbol,
        baseAmount:      state.baseAmount,
        activeTimeframe: state.activeTimeframe,
        currentView:     state.currentView,
      }),
    }
  )
)
