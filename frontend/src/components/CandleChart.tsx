/**
 * Graphique en bougies japonaises — Lightweight Charts (TradingView)
 *
 * Affiche :
 *   - Bougies OHLC temps réel (mise à jour tick par tick)
 *   - EMA 20 (bleu) et EMA 50 (orange) — calculées sur la série complète
 *   - Bandes de Bollinger (rouge/vert en pointillés)
 *   - Zones FVG en price lines (violet)
 *   - Support / Résistance (lignes horizontales)
 *   - Marqueurs BUY/SELL/FVG sur les bougies
 */
import { useEffect, useRef, useState } from 'react'
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type Time,
  type SeriesMarker,
  type IPriceLine,
} from 'lightweight-charts'
import { useMarketStore, type Timeframe, type OHLCCandle } from '../store/marketStore'

// ─── Calculs d'indicateurs côté frontend ─────────────────────────────────────

// ─── Calculs d'indicateurs côté frontend ─────────────────────────────────────

function calcEMA(data: OHLCCandle[], period: number): { time: Time; value: number }[] {
  if (data.length < period) return []
  const k = 2 / (period + 1)
  let ema = data.slice(0, period).reduce((s, c) => s + c.close, 0) / period
  const result: { time: Time; value: number }[] = [
    { time: data[period - 1].time as Time, value: round(ema) },
  ]
  for (let i = period; i < data.length; i++) {
    ema = data[i].close * k + ema * (1 - k)
    result.push({ time: data[i].time as Time, value: round(ema) })
  }
  return result
}

function calcBollinger(data: OHLCCandle[], period = 20, mult = 2) {
  const upper: { time: Time; value: number }[] = []
  const lower: { time: Time; value: number }[] = []
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1).map(c => c.close)
    const mean = slice.reduce((a, b) => a + b, 0) / period
    const std = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period)
    upper.push({ time: data[i].time as Time, value: round(mean + mult * std) })
    lower.push({ time: data[i].time as Time, value: round(mean - mult * std) })
  }
  return { upper, lower }
}

function round(v: number) { return Math.round(v * 10000) / 10000 }

// ─── Timeframes ──────────────────────────────────────────────────────────────

const TIMEFRAMES: Timeframe[] = ['1min', '5min', '15min', '30min', '1h']
const TF_LABEL: Record<Timeframe, string> = {
  '1min': '1 min', '5min': '5 min', '15min': '15 min', '30min': '30 min', '1h': '1h',
}

// ─── Composant ───────────────────────────────────────────────────────────────

export function CandleChart() {
  const { candles, activeTimeframe, setActiveTimeframe, analysis, currentTick } = useMarketStore()

  const containerRef   = useRef<HTMLDivElement>(null)
  const chartRef       = useRef<IChartApi | null>(null)
  const candleSerieRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const ema20Ref       = useRef<ISeriesApi<'Line'> | null>(null)
  const ema50Ref       = useRef<ISeriesApi<'Line'> | null>(null)
  const bbUpRef        = useRef<ISeriesApi<'Line'> | null>(null)
  const bbLoRef        = useRef<ISeriesApi<'Line'> | null>(null)
  const priceLines     = useRef<IPriceLine[]>([])
  const [showEMA, setShowEMA]         = useState(true)
  const [showBB, setShowBB]           = useState(true)
  const [showFVG, setShowFVG]         = useState(true)
  const [showSR, setShowSR]           = useState(true)

  // ── Créer le graphique une seule fois par TF ──────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      width:  containerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { type: ColorType.Solid, color: '#111827' },
        textColor: '#9ca3af',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: '#1f2937' },
        horzLines: { color: '#1f2937' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: {
        borderColor: '#374151',
        scaleMargins: { top: 0.08, bottom: 0.08 },
      },
      timeScale: {
        borderColor: '#374151',
        timeVisible: true,
        secondsVisible: activeTimeframe === '1min',
        rightOffset: 8,
        fixLeftEdge: false,
      },
    })

    // Bougies
    const candle = chart.addCandlestickSeries({
      upColor:         '#22c55e',
      downColor:       '#ef4444',
      borderUpColor:   '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor:     '#4ade80',
      wickDownColor:   '#f87171',
    })

    // EMA 20
    const ema20 = chart.addLineSeries({
      color: '#3b82f6', lineWidth: 1,
      title: 'EMA20', priceLineVisible: false, lastValueVisible: true,
    })
    // EMA 50
    const ema50 = chart.addLineSeries({
      color: '#f59e0b', lineWidth: 1,
      title: 'EMA50', priceLineVisible: false, lastValueVisible: true,
    })
    // BB upper
    const bbUp = chart.addLineSeries({
      color: '#f87171', lineWidth: 1, lineStyle: LineStyle.Dashed,
      title: 'BB↑', priceLineVisible: false, lastValueVisible: false,
    })
    // BB lower
    const bbLo = chart.addLineSeries({
      color: '#4ade80', lineWidth: 1, lineStyle: LineStyle.Dashed,
      title: 'BB↓', priceLineVisible: false, lastValueVisible: false,
    })

    chartRef.current       = chart
    candleSerieRef.current = candle
    ema20Ref.current       = ema20
    ema50Ref.current       = ema50
    bbUpRef.current        = bbUp
    bbLoRef.current        = bbLo

    const onResize = () => {
      if (containerRef.current)
        chart.applyOptions({ width: containerRef.current.clientWidth })
    }
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      chart.remove()
      chartRef.current = candleSerieRef.current = null
      ema20Ref.current = ema50Ref.current = null
      bbUpRef.current  = bbLoRef.current  = null
    }
  }, [activeTimeframe]) // recréer si on change de TF

  // ── Charger / mettre à jour les bougies + EMA + BB ───────────────────────
  useEffect(() => {
    const serie = candleSerieRef.current
    const chart = chartRef.current
    if (!serie || !chart) return

    const raw = candles[activeTimeframe] ?? []
    if (raw.length === 0) return

    const seen = new Set<number>()
    const data = [...raw]
      .sort((a, b) => a.time - b.time)
      .filter(c => {
        if (seen.has(c.time)) return false
        seen.add(c.time)
        return true
      })

    serie.setData(data.map(c => ({
      time: c.time as Time,
      open: c.open, high: c.high, low: c.low, close: c.close,
    })))
    chart.timeScale().fitContent()

    if (ema20Ref.current) ema20Ref.current.setData(showEMA ? calcEMA(data, 20) : [])
    if (ema50Ref.current) ema50Ref.current.setData(showEMA ? calcEMA(data, 50) : [])

    if (bbUpRef.current && bbLoRef.current) {
      const { upper, lower } = calcBollinger(data)
      bbUpRef.current.setData(showBB ? upper : [])
      bbLoRef.current.setData(showBB ? lower : [])
    }
  }, [candles, activeTimeframe, showEMA, showBB])

  // ── Price lines FVG / S/R + Marqueurs — réagit à analysis ────────────────
  useEffect(() => {
    const serie = candleSerieRef.current
    if (!serie) return

    // Supprimer les anciennes price lines
    priceLines.current.forEach(pl => serie.removePriceLine(pl))
    priceLines.current = []

    if (showFVG) {
      const fvgs = analysis?.fvgs ?? []
      fvgs.forEach(fvg => {
        priceLines.current.push(serie.createPriceLine({
          price: fvg.top,
          color: fvg.direction === 'bullish' ? '#a855f7' : '#ec4899',
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: `FVG ${fvg.direction === 'bullish' ? '▲' : '▼'} top`,
        }))
        priceLines.current.push(serie.createPriceLine({
          price: fvg.midpoint,
          color: fvg.direction === 'bullish' ? '#c084fc' : '#f472b6',
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `FVG ${fvg.strength === 'strong' ? '★' : '◆'} ${fvg.midpoint.toFixed(4)}`,
        }))
        priceLines.current.push(serie.createPriceLine({
          price: fvg.bottom,
          color: fvg.direction === 'bullish' ? '#a855f7' : '#ec4899',
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: false,
          title: `FVG ${fvg.direction === 'bullish' ? '▲' : '▼'} bottom`,
        }))
      })
    }

    if (showSR) {
      const tf = analysis?.timeframes?.[activeTimeframe]
      if (tf?.indicators.support) {
        priceLines.current.push(serie.createPriceLine({
          price: tf.indicators.support,
          color: '#60a5fa',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `S ${tf.indicators.support.toFixed(4)}`,
        }))
      }
      if (tf?.indicators.resistance) {
        priceLines.current.push(serie.createPriceLine({
          price: tf.indicators.resistance,
          color: '#fb923c',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `R ${tf.indicators.resistance.toFixed(4)}`,
        }))
      }
    }

    // ── Marqueurs FVG + Signal ──
    const raw = candles[activeTimeframe] ?? []
    if (raw.length === 0) return
    const seen = new Set<number>()
    const data = [...raw]
      .sort((a, b) => a.time - b.time)
      .filter(c => { if (seen.has(c.time)) return false; seen.add(c.time); return true })

    const markers: SeriesMarker<Time>[] = []

    if (showFVG && analysis?.fvgs) {
      analysis.fvgs.forEach(fvg => {
        let targetIdx = data.length - 1
        for (let i = data.length - 1; i >= 0; i--) {
          if (data[i].low <= fvg.top && data[i].high >= fvg.bottom) {
            targetIdx = i; break
          }
        }
        markers.push({
          time: data[targetIdx].time as Time,
          position: fvg.direction === 'bullish' ? 'belowBar' : 'aboveBar',
          color: fvg.direction === 'bullish' ? '#a855f7' : '#ec4899',
          shape: fvg.direction === 'bullish' ? 'arrowUp' : 'arrowDown',
          text: `FVG${fvg.strength === 'strong' ? '★' : ''} ${fvg.midpoint.toFixed(4)}`,
          size: fvg.strength === 'strong' ? 2 : 1,
        })
      })
    }

    const sig = analysis?.signal
    if (sig && (sig.type === 'BUY' || sig.type === 'SELL') && data.length > 0) {
      const last = data[data.length - 1]
      markers.push({
        time: last.time as Time,
        position: sig.type === 'BUY' ? 'belowBar' : 'aboveBar',
        color: sig.type === 'BUY' ? '#22c55e' : '#ef4444',
        shape: sig.type === 'BUY' ? 'arrowUp' : 'arrowDown',
        text: `${sig.type === 'BUY' ? '▲ ACHAT' : '▼ VENTE'} ${sig.confidence}%`,
        size: 3,
      })
    }

    markers.sort((a, b) => (a.time as number) - (b.time as number))
    serie.setMarkers(markers)

  }, [analysis, activeTimeframe, candles, showFVG, showSR])

  // ── Mise à jour tick-par-tick de la bougie en cours ───────────────────────
  useEffect(() => {
    if (!candleSerieRef.current || !currentTick) return
    const data = candles[activeTimeframe]
    if (!data || data.length === 0) return
    const last = data[data.length - 1]
    if (!last) return
    candleSerieRef.current.update({
      time:  last.time as Time,
      open:  last.open,
      high:  Math.max(last.high, currentTick.price),
      low:   Math.min(last.low,  currentTick.price),
      close: currentTick.price,
    })
  }, [currentTick, candles, activeTimeframe])

  const candleCount = candles[activeTimeframe]?.length ?? 0
  const fvgCount    = analysis?.fvgs?.length ?? 0

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-700 overflow-hidden">

      {/* ── En-tête ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h3 className="text-white font-semibold text-sm">Bougies japonaises</h3>
          {candleCount > 0 && (
            <span className="text-gray-500 text-xs">{candleCount} bougies</span>
          )}
          {fvgCount > 0 && (
            <span className="bg-purple-500/20 text-purple-400 text-xs px-2 py-0.5 rounded-full border border-purple-500/30">
              {fvgCount} FVG
            </span>
          )}
        </div>

        {/* Sélecteur TF */}
        <div className="flex gap-0.5 bg-gray-800 rounded-lg p-0.5">
          {TIMEFRAMES.map(tf => (
            <button key={tf} onClick={() => setActiveTimeframe(tf)}
              className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                activeTimeframe === tf
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {TF_LABEL[tf]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Contrôles d'overlay ── */}
      <div className="flex gap-3 px-4 py-2 border-b border-gray-700/50 bg-gray-800/40 flex-wrap">
        {[
          { key: 'ema',  label: 'EMA 20/50',   color: 'bg-blue-500',   state: showEMA, set: setShowEMA  },
          { key: 'bb',   label: 'Bollinger',    color: 'bg-red-500',    state: showBB,  set: setShowBB   },
          { key: 'fvg',  label: 'FVG Zones',    color: 'bg-purple-500', state: showFVG, set: setShowFVG  },
          { key: 'sr',   label: 'S/R Niveaux',  color: 'bg-orange-500', state: showSR,  set: setShowSR   },
        ].map(({ key, label, color, state, set }) => (
          <button key={key} onClick={() => set(!state)}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all ${
              state
                ? 'border-gray-600 text-white bg-gray-700'
                : 'border-gray-700 text-gray-500 bg-transparent'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${state ? color : 'bg-gray-600'}`} />
            {label}
          </button>
        ))}

        {/* Légende inline */}
        <div className="ml-auto flex gap-3 items-center text-xs text-gray-500">
          <span>▲ <span className="text-green-400">BUY</span></span>
          <span>▼ <span className="text-red-400">SELL</span></span>
          <span>⬩ <span className="text-purple-400">FVG</span></span>
        </div>
      </div>

      {/* ── Zone graphique ── */}
      {candleCount === 0 ? (
        <div className="flex items-center justify-center flex-col gap-3 text-gray-500 bg-gray-900"
          style={{ height: 400 }}>
          <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Chargement des bougies {TF_LABEL[activeTimeframe]}...</p>
          <p className="text-xs text-gray-600">Les bougies arrivent depuis Deriv au démarrage</p>
        </div>
      ) : (
        <div ref={containerRef} className="w-full" style={{ height: 400 }}
          aria-label={`Graphique bougies ${TF_LABEL[activeTimeframe]}`} role="img"
        />
      )}
    </div>
  )
}
