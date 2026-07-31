/**
 * Système de notifications — navigateur + son.
 *
 * Règles anti-spam :
 *   - Chaque type de notification a un cooldown indépendant
 *   - Un signal BUY/SELL ne notifie qu'UNE FOIS par verrou (pas à chaque tick)
 *   - Les positions ne notifient que si la recommandation CHANGE (pas à chaque recalcul)
 *   - Cooldown minimum entre deux notifications du même type : configurable par type
 */
import { useEffect, useRef, useCallback } from 'react'
import { useMarketStore } from '../store/marketStore'
import { usePositionTracker } from '../store/positionTracker'

// ── Cooldowns (ms) ──────────────────────────────────────────
const COOLDOWN = {
  signal:    5 * 60 * 1000,  // 5 min — signal BUY/SELL
  position:  2 * 60 * 1000,  // 2 min — alerte sur position (proche TP/SL)
  urgent:    30 * 1000,       // 30s  — urgent (couper maintenant)
} as const

// ── Son généré par Web Audio API (pas de fichier externe) ───
function playBeep(type: 'buy' | 'sell' | 'urgent' | 'position') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    // Fréquence et forme selon le type
    const configs = {
      buy:      { freq: 880, freq2: 1100, type: 'sine'    as OscillatorType, vol: 0.3 },
      sell:     { freq: 550, freq2: 440,  type: 'sine'    as OscillatorType, vol: 0.3 },
      urgent:   { freq: 440, freq2: 880,  type: 'square'  as OscillatorType, vol: 0.5 },
      position: { freq: 660, freq2: 660,  type: 'triangle' as OscillatorType, vol: 0.2 },
    }
    const cfg = configs[type]

    osc.type = cfg.type
    osc.frequency.setValueAtTime(cfg.freq, ctx.currentTime)
    osc.frequency.setValueAtTime(cfg.freq2, ctx.currentTime + 0.1)

    gain.gain.setValueAtTime(cfg.vol, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.4)

    // Double bip pour urgent
    if (type === 'urgent') {
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      osc2.type = 'square'
      osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.5)
      gain2.gain.setValueAtTime(0.5, ctx.currentTime + 0.5)
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9)
      osc2.start(ctx.currentTime + 0.5)
      osc2.stop(ctx.currentTime + 0.9)
    }
  } catch {
    // AudioContext non disponible — silencieux
  }
}

// ── Envoi d'une notification navigateur ─────────────────────
function sendBrowserNotif(title: string, body: string, tag: string) {
  if (Notification.permission !== 'granted') return
  try {
    new Notification(title, {
      body,
      tag,          // même tag = remplace la précédente au lieu d'empiler
      icon: '/favicon.svg',
      silent: true, // on gère le son nous-mêmes
    })
  } catch {
    // Notification non supportée
  }
}

// ─────────────────────────────────────────────────────────────
// Hook principal
// ─────────────────────────────────────────────────────────────

export function useNotifications() {
  const { analysis, currentSymbol } = useMarketStore()
  const { positions } = usePositionTracker()

  // Dernière notification par type (timestamp)
  const lastNotif = useRef<Record<string, number>>({})

  // Dernier signal connu (pour détecter les changements)
  const prevSignal    = useRef<string>('')
  const prevSignalKey = useRef<string>('')  // "BUY-1785249954" — signal + candle_epoch

  // Dernière recommandation par position id
  const prevPositionReco = useRef<Record<string, string>>({})

  // ── Cooldown check ──
  const canNotify = useCallback((key: string, cooldownMs: number): boolean => {
    const last = lastNotif.current[key] ?? 0
    return Date.now() - last > cooldownMs
  }, [])

  const markNotified = useCallback((key: string) => {
    lastNotif.current[key] = Date.now()
  }, [])

  // ── Effet principal — se déclenche à chaque mise à jour de l'analyse ──
  useEffect(() => {
    if (!analysis) return

    const sig         = analysis.signal
    const stability   = analysis.signal_stability
    const invalidated = (analysis as any)?.invalidation?.invalidated ?? false
    const price       = analysis.price
    const atr         = analysis.timeframes?.['15min']?.indicators?.atr
                     ?? analysis.timeframes?.['5min']?.indicators?.atr
                     ?? null

    // ─────────────────────────────────────────────────────────
    // 1. NOTIFICATION DE SIGNAL (BUY / SELL confirmé)
    // ─────────────────────────────────────────────────────────
    // Uniquement quand le signal change ET est verrouillé (confirmé)
    // On utilise candle_epoch pour identifier un nouveau signal unique
    const signalKey = `${sig.type}-${stability?.remaining_seconds ?? 0 > 0 ? 'locked' : 'free'}`

    if (
      (sig.type === 'BUY' || sig.type === 'SELL') &&
      stability?.locked &&
      sig.confidence >= 60 &&
      signalKey !== prevSignalKey.current &&
      canNotify('signal', COOLDOWN.signal)
    ) {
      const isBuy   = sig.type === 'BUY'
      const title   = isBuy ? 'SIGNAL BUY — Entrée possible' : 'SIGNAL SELL — Entrée possible'
      const body    = [
        `${currentSymbol} @ ${price.toFixed(4)}`,
        `Confiance : ${sig.confidence}%`,
        sig.label,
      ].join('\n')

      sendBrowserNotif(title, body, 'signal')
      playBeep(isBuy ? 'buy' : 'sell')
      markNotified('signal')
      prevSignalKey.current = signalKey
    }

    // Signal retourné (BUY → SELL ou SELL → BUY)
    if (
      prevSignal.current &&
      prevSignal.current !== sig.type &&
      (sig.type === 'BUY' || sig.type === 'SELL') &&
      (prevSignal.current === 'BUY' || prevSignal.current === 'SELL') &&
      canNotify('signal_reversal', COOLDOWN.signal)
    ) {
      sendBrowserNotif(
        `RETOURNEMENT — ${prevSignal.current} -> ${sig.type}`,
        `${currentSymbol} @ ${price.toFixed(4)} · Fermez vos positions ${prevSignal.current}`,
        'signal_reversal',
      )
      playBeep('urgent')
      markNotified('signal_reversal')
    }
    prevSignal.current = sig.type

    // ─────────────────────────────────────────────────────────
    // 2. NOTIFICATIONS SUR POSITIONS OUVERTES
    //    Seulement pour les positions que l'utilisateur a saisies
    // ─────────────────────────────────────────────────────────
    const activePositions = positions.filter((p) => p.symbol === currentSymbol)
    if (activePositions.length === 0) return

    const atrVal = atr ?? price * 0.001

    // pip_size par symbole (même table que PositionTracker)
    const PIP_SIZE_MAP: Record<string, number> = {
      R_10: 0.001, R_25: 0.001, R_50: 0.01, R_75: 0.01, R_100: 0.01,
      '1HZ10V': 0.001, '1HZ25V': 0.001, '1HZ50V': 0.01,
      '1HZ75V': 0.01, '1HZ100V': 0.001,
      BOOM300N: 0.01, BOOM500: 0.01, BOOM1000: 0.01,
      CRASH300N: 0.01, CRASH500: 0.01, CRASH1000: 0.01, stpRNG: 0.1,
    }

    for (const pos of activePositions) {
      // P&L réel Deriv : (prix_actuel - prix_entrée) × lot
      const rawDiff = pos.direction === 'BUY'
        ? price - pos.entryPrice
        : pos.entryPrice - price
      const pipSize = PIP_SIZE_MAP[pos.symbol] ?? 0.01
      const pnlPips = rawDiff / pipSize

      // Recalcul TP/SL depuis le prix d'entrée
      const tpMult = sig.confidence >= 80 ? 2.5 : sig.confidence >= 60 ? 1.8 : 1.2
      const slMult = 1.5
      const tpDist = atrVal * tpMult
      const slDist = atrVal * slMult

      const tp = pos.direction === 'BUY'
        ? pos.entryPrice + tpDist
        : pos.entryPrice - tpDist
      const sl = pos.direction === 'BUY'
        ? pos.entryPrice - slDist
        : pos.entryPrice + slDist

      // Distance en % entre prix actuel et TP / SL
      const distToTp = (Math.abs(price - tp) / price) * 100
      const distToSl = (Math.abs(price - sl) / price) * 100

      const posKey = `pos-${pos.id}`

      // ── a) Urgence : signal opposé ou invalidation ──
      const isOpposed =
        (pos.direction === 'BUY'  && sig.type === 'SELL') ||
        (pos.direction === 'SELL' && sig.type === 'BUY')

      if ((invalidated || isOpposed) && canNotify(`${posKey}-urgent`, COOLDOWN.urgent)) {
        const reason = invalidated
          ? 'Invalidation détectée — conditions cassées'
          : `Signal retourné vers ${sig.type}`
        
        // PnL affiché dans la notif
        const pnlSign = pnlPips >= 0 ? '+' : ''
        
        sendBrowserNotif(
          `COUPER POSITION — ${pos.direction} ${pos.lot} lots`,
          `${currentSymbol} · Entrée : ${pos.entryPrice.toFixed(4)} (${pnlSign}${pnlPips.toFixed(1)} pips)\n${reason}`,
          `${posKey}-urgent`,
        )
        playBeep('urgent')
        markNotified(`${posKey}-urgent`)
        prevPositionReco.current[pos.id] = 'urgent'
        continue  // pas d'autres alertes sur cette position ce cycle
      }

      // ── b) Proche du TP (< 0.15% de distance) ──
      const nearTp =
        (pos.direction === 'BUY'  && price < tp && distToTp < 0.15) ||
        (pos.direction === 'SELL' && price > tp && distToTp < 0.15)

      if (nearTp && prevPositionReco.current[pos.id] !== 'near_tp'
          && canNotify(`${posKey}-tp`, COOLDOWN.position)) {
        sendBrowserNotif(
          `Proche du TP — ${pos.direction} ${pos.lot} lots`,
          `${currentSymbol} · Entrée ${pos.entryPrice.toFixed(4)}\nTP analyse : ${tp.toFixed(4)} (à ${distToTp.toFixed(3)}%)`,
          `${posKey}-tp`,
        )
        playBeep('position')
        markNotified(`${posKey}-tp`)
        prevPositionReco.current[pos.id] = 'near_tp'
      }

      // ── c) Proche du SL (< 0.15% de distance) ──
      const nearSl =
        (pos.direction === 'BUY'  && price > sl && distToSl < 0.15) ||
        (pos.direction === 'SELL' && price < sl && distToSl < 0.15)

      if (nearSl && prevPositionReco.current[pos.id] !== 'near_sl'
          && canNotify(`${posKey}-sl`, COOLDOWN.position)) {
        sendBrowserNotif(
          `Proche du SL — ${pos.direction} ${pos.lot} lots`,
          `${currentSymbol} · Entrée ${pos.entryPrice.toFixed(4)}\nSL analyse : ${sl.toFixed(4)} (à ${distToSl.toFixed(3)}%)`,
          `${posKey}-sl`,
        )
        playBeep('urgent')
        markNotified(`${posKey}-sl`)
        prevPositionReco.current[pos.id] = 'near_sl'
      }

      // Reset de l'état si le prix s'est éloigné
      if (!nearTp && !nearSl && !isOpposed && !invalidated) {
        if (prevPositionReco.current[pos.id] === 'near_tp'
        || prevPositionReco.current[pos.id] === 'near_sl') {
          prevPositionReco.current[pos.id] = ''
        }
      }
    }

  }, [analysis, positions, currentSymbol, canNotify, markNotified])
}
