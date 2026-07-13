"""
Moteur de décision — Flux professionnel complet :

  Données → Contexte → Analyse MTF → Confirmation → Signal verrouillé
         → Surveillance → Invalidation ou Validation

Ce module orchestre toutes les étapes dans l'ordre correct.
"""

from dataclasses import dataclass, field
from typing import Optional

from app.analysis.confirmation import (
    ConfirmationResult, InvalidationResult,
    check_confirmation, check_invalidation,
)
from app.analysis.indicators import (
    atr, bollinger_bands, ema, macd,
    recommended_stake, rsi, support_resistance,
    trend_strength, volatility_regime,
    detect_fvg, FVG, nearest_fvg,
)
from app.analysis.market_context import MarketContext, compute_market_context
from app.analysis.pending_order import PendingOrder, compute_pending_orders
from app.analysis.position_manager import PositionPlan, compute_position
from app.analysis.signal_lock import SignalLockManager, signal_lock
from app.analysis.strategies.scorer import ScorerResult, run_all as run_strategies
from app.assets import get_asset
from app.candle_store import TIMEFRAMES, candle_store
from app.tick_store import tick_store


# ─────────────────────────────────────────────
# Structures de données
# ─────────────────────────────────────────────

@dataclass
class TimeframeAnalysis:
    label: str
    granularity: int
    candle_count: int
    ema20: Optional[float]
    ema50: Optional[float]
    ema200: Optional[float]   # ajouté
    rsi14: Optional[float]
    macd_line: Optional[float]
    macd_signal: Optional[float]
    macd_histogram: Optional[float]
    bb_upper: Optional[float]
    bb_middle: Optional[float]
    bb_lower: Optional[float]
    support: Optional[float]
    resistance: Optional[float]
    atr_val: Optional[float]
    trend: str
    trend_label: str
    trend_strength: int
    regime: str
    regime_label: str
    atr_pct: Optional[float]
    direction: int       # +1 / -1 / 0
    direction_reasons: list[str]
    tf_confidence: int

    def to_dict(self) -> dict:
        return {
            "label": self.label,
            "granularity": self.granularity,
            "candle_count": self.candle_count,
            "indicators": {
                "ema20": self.ema20, "ema50": self.ema50, "ema200": self.ema200,
                "rsi14": self.rsi14,
                "macd_line": self.macd_line,
                "macd_signal": self.macd_signal,
                "macd_histogram": self.macd_histogram,
                "bb_upper": self.bb_upper,
                "bb_middle": self.bb_middle,
                "bb_lower": self.bb_lower,
                "support": self.support,
                "resistance": self.resistance,
                "atr": self.atr_val,
            },
            "trend": {
                "direction": self.trend,
                "label": self.trend_label,
                "strength": self.trend_strength,
            },
            "volatility": {
                "regime": self.regime,
                "label": self.regime_label,
                "atr_pct": self.atr_pct,
            },
            "signal": {
                "direction": self.direction,
                "reasons": self.direction_reasons,
                "confidence": self.tf_confidence,
            },
        }


@dataclass
class MTFResult:
    price: float
    timestamp: float
    symbol: str

    # Étape 1 : Contexte
    context: Optional[MarketContext] = None

    # Étape 2 : Analyse par TF
    timeframes: dict[str, TimeframeAnalysis] = field(default_factory=dict)
    mtf_bull: int = 0
    mtf_bear: int = 0
    mtf_neutral: int = 0
    mtf_alignment: int = 0
    global_regime: str = "unknown"
    global_regime_label: str = ""

    # Étape 3 : 3 Stratégies
    strategies: Optional[ScorerResult] = None

    # Étape 4 : Confirmation structurelle
    confirmation: Optional[ConfirmationResult] = None

    # Signal final
    signal: str = "WAIT"
    signal_label: str = ""
    confidence: int = 0
    reasons: list[str] = field(default_factory=list)
    advice: str = ""
    why: str = ""

    # Étape 5 : Invalidation (surveillance tick)
    invalidation: Optional[InvalidationResult] = None

    # Stabilité
    signal_locked: bool = False
    signal_remaining: int = 0
    signal_remaining_label: str = ""
    tick_count: int = 0

    # Gestion du risque
    stake: dict = field(default_factory=dict)
    position: Optional[PositionPlan] = None
    pending_orders: list[PendingOrder] = field(default_factory=list)
    fvgs: list[FVG] = field(default_factory=list)          # Fair Value Gaps détectés
    nearest_fvg_entry: Optional[FVG] = None                # FVG optimal pour entrée

    def to_dict(self) -> dict:
        return {
            "price": self.price,
            "timestamp": self.timestamp,
            "symbol": self.symbol,
            "context": self.context.to_dict() if self.context else None,
            "timeframes": {k: v.to_dict() for k, v in self.timeframes.items()},
            "mtf": {
                "bull": self.mtf_bull, "bear": self.mtf_bear,
                "neutral": self.mtf_neutral, "alignment": self.mtf_alignment,
            },
            "volatility": {
                "regime": self.global_regime,
                "label": self.global_regime_label,
            },
            "strategies": self.strategies.to_dict() if self.strategies else None,
            "confirmation": self.confirmation.to_dict() if self.confirmation else None,
            "signal": {
                "type": self.signal, "label": self.signal_label,
                "confidence": self.confidence, "reasons": self.reasons,
                "advice": self.advice, "why": self.why,
            },
            "invalidation": self.invalidation.to_dict() if self.invalidation else None,
            "signal_stability": {
                "locked": self.signal_locked,
                "remaining_seconds": self.signal_remaining,
                "remaining_label": self.signal_remaining_label,
                "tick_count": self.tick_count,
            },
            "stake": self.stake,
            "position": self.position.to_dict() if self.position else None,
            "pending_orders": [p.to_dict() for p in self.pending_orders],
            "fvgs": [f.to_dict() for f in self.fvgs],
            "nearest_fvg_entry": self.nearest_fvg_entry.to_dict() if self.nearest_fvg_entry else None,
        }


# ─────────────────────────────────────────────
# Analyse d'un seul timeframe
# ─────────────────────────────────────────────

# Seuils ATR% adaptés aux Synthetic Indices Deriv (plus volatils que le forex)
_REGIME_THRESHOLDS: dict[str, tuple[float, float]] = {
    # family -> (calm_max, normal_max)  au-delà = unstable
    "volatility": (0.10, 0.50),
    "boom":       (0.20, 0.80),
    "crash":      (0.20, 0.80),
    "step":       (0.02, 0.10),
}
_DEFAULT_THRESHOLDS = (0.10, 0.50)

_current_asset_family: str = "volatility"   # mis à jour dans analyze()


def _volatility_regime_synthetic(
    highs: list[float], lows: list[float], closes: list[float],
    period: int = 14, family: str = "volatility",
) -> dict:
    """Régime de volatilité calibré pour les Synthetic Indices."""
    from app.analysis.indicators import atr as calc_atr
    atr_val = calc_atr(highs, lows, closes, period)
    if atr_val is None or not closes:
        return {"regime": "unknown", "label": "Données insuffisantes", "atr_pct": None}
    atr_pct = (atr_val / closes[-1]) * 100
    calm_max, normal_max = _REGIME_THRESHOLDS.get(family, _DEFAULT_THRESHOLDS)
    if atr_pct < calm_max:
        return {"regime": "calm",     "label": "Calme",       "atr_pct": round(atr_pct, 4)}
    elif atr_pct < normal_max:
        return {"regime": "normal",   "label": "Normal",      "atr_pct": round(atr_pct, 4)}
    else:
        return {"regime": "unstable", "label": "Instable ⚠",  "atr_pct": round(atr_pct, 4)}


def _analyze_tf(granularity: int) -> Optional[TimeframeAnalysis]:
    label = TIMEFRAMES.get(granularity, str(granularity))
    closes = candle_store.get_closes(granularity)
    highs  = candle_store.get_highs(granularity)
    lows   = candle_store.get_lows(granularity)
    n = len(closes)
    if n < 10:
        return None

    e20  = ema(closes, 20)
    e50  = ema(closes, 50)
    e200 = ema(closes, 200)   # désormais calculé
    r14  = rsi(closes, 14)
    m    = macd(closes)
    bb   = bollinger_bands(closes, 20)
    sr   = support_resistance(highs, lows, 30)
    atr_v = atr(highs, lows, closes, 14)
    vol   = _volatility_regime_synthetic(highs, lows, closes, 14, _current_asset_family)
    trend = trend_strength(e20, e50)
    price = closes[-1]

    bull, bear, reasons = 0, 0, []

    if trend["trend"] == "up":
        bull += 2; reasons.append(f"EMA20 > EMA50 ({trend['strength']}%)")
    elif trend["trend"] == "down":
        bear += 2; reasons.append(f"EMA20 < EMA50 ({trend['strength']}%)")

    if r14 is not None:
        if r14 < 30:   bull += 2; reasons.append(f"RSI survendu {r14}")
        elif r14 > 70: bear += 2; reasons.append(f"RSI suracheté {r14}")
        elif r14 > 55: bull += 1; reasons.append(f"RSI haussier {r14}")
        elif r14 < 45: bear += 1; reasons.append(f"RSI baissier {r14}")
        else:          reasons.append(f"RSI neutre {r14}")

    ml, mh = m["macd_line"], m["histogram"]
    if ml is not None and mh is not None:
        if ml > 0 and mh > 0:   bull += 2; reasons.append("MACD ↑ accélère")
        elif ml < 0 and mh < 0: bear += 2; reasons.append("MACD ↓ décélère")
        elif ml > 0:             bull += 1; reasons.append("MACD positif")
        elif ml < 0:             bear += 1; reasons.append("MACD négatif")

    if bb["lower"] and bb["upper"]:
        if price <= bb["lower"]:   bull += 1; reasons.append("Prix sur BB basse")
        elif price >= bb["upper"]: bear += 1; reasons.append("Prix sur BB haute")

    sup, res = sr["support"], sr["resistance"]
    if sup and res:
        rng = res - sup
        if rng > 0:
            pos = (price - sup) / rng
            if pos < 0.15:   bull += 1; reasons.append(f"Support {sup:.2f}")
            elif pos > 0.85: bear += 1; reasons.append(f"Résistance {res:.2f}")

    # FVG sur ce TF — calculé AVANT la direction finale
    tf_fvgs = detect_fvg(highs, lows, closes, price, atr_v, max_fvg=3)
    if atr_v:
        for fvg in tf_fvgs:
            dist = abs(fvg.midpoint - price)
            if dist < atr_v * 0.5:
                if fvg.direction == "bullish":
                    bull += 1
                    reasons.append(f"FVG haussier proche ({fvg.bottom:.4f}–{fvg.top:.4f})")
                elif fvg.direction == "bearish":
                    bear += 1
                    reasons.append(f"FVG baissier proche ({fvg.bottom:.4f}–{fvg.top:.4f})")

    # Direction nette (après FVG)
    total = bull + bear
    if total == 0:   direction, tf_conf = 0, 0
    elif bull > bear: direction, tf_conf = 1, min(int((bull / total) * 100), 100)
    elif bear > bull: direction, tf_conf = -1, min(int((bear / total) * 100), 100)
    else:             direction, tf_conf = 0, 50

    return TimeframeAnalysis(
        label=label, granularity=granularity, candle_count=n,
        ema20=e20, ema50=e50, rsi14=r14,
        macd_line=ml, macd_signal=m["signal_line"], macd_histogram=mh,
        bb_upper=bb["upper"], bb_middle=bb["middle"], bb_lower=bb["lower"],
        support=sup, resistance=res, atr_val=atr_v,
        trend=trend["trend"], trend_label=trend["label"], trend_strength=trend["strength"],
        regime=vol["regime"], regime_label=vol["label"], atr_pct=vol["atr_pct"],
        direction=direction, direction_reasons=reasons, tf_confidence=tf_conf,
        ema200=e200,
    )


# ─────────────────────────────────────────────
# Flux principal
# ─────────────────────────────────────────────

REGIME_PRIORITY = {"unstable": 3, "normal": 2, "calm": 1, "unknown": 0}
TF_WEIGHT = {"1h": 4, "30min": 3, "15min": 3, "5min": 2, "1min": 1}


def analyze(symbol: str = "R_50", base_amount: float = 100.0) -> Optional[MTFResult]:
    global _current_asset_family
    last = tick_store.last
    if not last:
        return None

    signal_lock.increment_tick()
    asset = get_asset(symbol)
    _current_asset_family = asset.family

    # Verrou basé sur M15 (cohérent avec l'analyse qui tourne sur M15)
    candle_m15 = candle_store.last_candle(900)
    current_candle_epoch = candle_m15.timestamp if candle_m15 else 0

    # ── Signal verrouillé encore valide ? ──
    if not signal_lock.should_recalculate(current_candle_epoch):
        locked = signal_lock.current
        if locked:
            # Vérification d'invalidation tick par tick
            tf_ref = None
            for gran in [900, 300]:
                closes = candle_store.get_closes(gran)
                highs  = candle_store.get_highs(gran)
                lows   = candle_store.get_lows(gran)
                if len(closes) >= 27:
                    tf_ref = {"closes": closes, "highs": highs, "lows": lows,
                              "ema20": ema(closes, 20), "ema50": ema(closes, 50),
                              "rsi14": rsi(closes, 14),
                              "macd_h": macd(closes)["histogram"],
                              "sr": support_resistance(highs, lows, 30),
                              "atr": atr(highs, lows, closes, 14)}
                    break

            inv = None
            if tf_ref and locked.signal_type in ("BUY", "SELL"):
                inv = check_invalidation(
                    current_price=last.price,
                    signal_direction=locked.signal_type,
                    entry_price=last.price,
                    stop_loss=None,
                    support=tf_ref["sr"]["support"],
                    resistance=tf_ref["sr"]["resistance"],
                    ema20=tf_ref["ema20"], ema50=tf_ref["ema50"],
                    rsi14=tf_ref["rsi14"],
                    macd_histogram=tf_ref["macd_h"],
                    atr=tf_ref["atr"],
                )
                if inv and inv.invalidated:
                    signal_lock.invalidate_on_reversal("SELL" if locked.signal_type == "BUY" else "BUY")

            result = MTFResult(
                price=last.price, timestamp=last.timestamp, symbol=symbol,
                signal=locked.signal_type, signal_label=locked.signal_label,
                confidence=locked.confidence, advice=locked.advice, why=locked.why,
                signal_locked=True,
                signal_remaining=locked.remaining_seconds,
                signal_remaining_label=locked.remaining_label,
                tick_count=signal_lock.tick_count,
                invalidation=inv,
            )
            result.stake = recommended_stake(
                base_amount=base_amount, signal_type=locked.signal_type,
                confidence=locked.confidence, regime="normal", mtf_alignment=3,
            )
            # FVG toujours calculés même pendant le verrou (pour l'affichage graphique)
            closes_m15_lock = candle_store.get_closes(900)
            highs_m15_lock  = candle_store.get_highs(900)
            lows_m15_lock   = candle_store.get_lows(900)
            if len(closes_m15_lock) >= 3:
                tf_m15_lock = result.timeframes.get("15min")
                atr_lock = None
                if tf_ref:
                    atr_lock = tf_ref.get("atr")
                result.fvgs = detect_fvg(
                    highs=highs_m15_lock, lows=lows_m15_lock, closes=closes_m15_lock,
                    current_price=last.price, atr_val=atr_lock,
                    max_fvg=6, lookback=60,
                )
                if locked.signal_type in ("BUY", "SELL"):
                    fvg_dir = "bullish" if locked.signal_type == "BUY" else "bearish"
                    result.nearest_fvg_entry = nearest_fvg(result.fvgs, last.price, fvg_dir)
            return result

    # ── Analyse complète (nouvelle bougie ou premier calcul) ──
    result = MTFResult(
        price=last.price, timestamp=last.timestamp,
        symbol=symbol, tick_count=signal_lock.tick_count,
    )

    # ÉTAPE 1 : Contexte marché (sur M15)
    closes_m15 = candle_store.get_closes(900)
    highs_m15  = candle_store.get_highs(900)
    lows_m15   = candle_store.get_lows(900)
    opens_m15  = candle_store.get_opens(900)
    if len(closes_m15) >= 10:
        e20_ctx = ema(closes_m15, 20)
        e50_ctx = ema(closes_m15, 50)
        atr_ctx = atr(highs_m15, lows_m15, closes_m15, 14)
        result.context = compute_market_context(
            closes=closes_m15, highs=highs_m15, lows=lows_m15,
            ema20=e20_ctx, ema50=e50_ctx,
            atr_val=atr_ctx, price=last.price,
        )

    # ÉTAPE 2 : Analyse par timeframe
    for gran in TIMEFRAMES:
        tf = _analyze_tf(gran)
        if tf:
            result.timeframes[tf.label] = tf

    if not result.timeframes:
        return result

    votes = [tf.direction for tf in result.timeframes.values()]
    result.mtf_bull    = votes.count(1)
    result.mtf_bear    = votes.count(-1)
    result.mtf_neutral = votes.count(0)

    worst = max(result.timeframes.values(),
                key=lambda tf: REGIME_PRIORITY.get(tf.regime, 0))
    result.global_regime       = worst.regime
    result.global_regime_label = worst.regime_label

    def weighted_conf(d: int) -> tuple[int, int]:
        tw, tc, al = 0, 0, 0
        for lbl, tf in result.timeframes.items():
            if tf.direction == d:
                w = TF_WEIGHT.get(lbl, 1)
                tc += tf.tf_confidence * w; tw += w; al += 1
        return (int(tc / tw), al) if tw else (0, 0)

    bull_conf, bull_al = weighted_conf(1)
    bear_conf, bear_al = weighted_conf(-1)

    if result.mtf_bull >= 3:
        result.signal, result.confidence, result.mtf_alignment = "BUY",  bull_conf, bull_al
        result.signal_label = "Achat possible"
    elif result.mtf_bear >= 3:
        result.signal, result.confidence, result.mtf_alignment = "SELL", bear_conf, bear_al
        result.signal_label = "Vente possible"
    elif result.mtf_bull == 2 and result.mtf_bear <= 1:
        result.signal, result.confidence, result.mtf_alignment = "BUY",  max(bull_conf-15, 40), bull_al
        result.signal_label = "Signal faible — Achat"
    elif result.mtf_bear == 2 and result.mtf_bull <= 1:
        result.signal, result.confidence, result.mtf_alignment = "SELL", max(bear_conf-15, 40), bear_al
        result.signal_label = "Signal faible — Vente"
    else:
        result.signal = "NEUTRAL"; result.signal_label = "Neutre"

    for lbl in ["1h", "15min", "5min", "1min"]:
        tf = result.timeframes.get(lbl)
        if tf and tf.direction_reasons:
            icon = "▲" if tf.direction == 1 else ("▼" if tf.direction == -1 else "◆")
            result.reasons.append(f"[{lbl}] {icon} " + " · ".join(tf.direction_reasons[:2]))

    # ÉTAPE 3 : 4 Stratégies
    tf_m15_obj = result.timeframes.get("15min")
    tf_m5_obj  = result.timeframes.get("5min")
    tf_h1_obj  = result.timeframes.get("1h")
    tf_m30_obj = result.timeframes.get("30min")   # nouveau TF pour P2dro
    if tf_m15_obj:
        closes_m5  = candle_store.get_closes(300)
        opens_m5   = candle_store.get_opens(300)
        highs_m5   = candle_store.get_highs(300)
        lows_m5    = candle_store.get_lows(300)
        closes_h1  = candle_store.get_closes(3600)
        opens_h1   = candle_store.get_opens(3600)
        highs_h1   = candle_store.get_highs(3600)
        lows_h1    = candle_store.get_lows(3600)

        # Données M30 pour P2dro
        closes_m30 = candle_store.get_closes(1800)
        opens_m30  = candle_store.get_opens(1800)
        highs_m30  = candle_store.get_highs(1800)
        lows_m30   = candle_store.get_lows(1800)

        atr_series = [abs(closes_m15[i] - closes_m15[i-1]) for i in range(1, len(closes_m15))]
        atr_mean   = sum(atr_series[-20:]) / min(len(atr_series), 20) if atr_series else None

        macd_prev  = macd(closes_m5[:-1]) if len(closes_m5) > 2 else {}

        result.strategies = run_strategies(
            closes_h1=closes_h1, opens_h1=opens_h1, highs_h1=highs_h1, lows_h1=lows_h1,
            ema50_h1=tf_h1_obj.ema50 if tf_h1_obj else None,
            ema200_h1=tf_h1_obj.ema200 if tf_h1_obj else None,
            closes_m15=closes_m15, opens_m15=opens_m15, highs_m15=highs_m15, lows_m15=lows_m15,
            ema20_m15=tf_m15_obj.ema20, ema50_m15=tf_m15_obj.ema50,
            ema200_m15=tf_m15_obj.ema200,
            rsi_m15=tf_m15_obj.rsi14,
            support_m15=tf_m15_obj.support, resistance_m15=tf_m15_obj.resistance,
            atr_m15=tf_m15_obj.atr_val, atr_mean_m15=atr_mean,
            closes_m5=closes_m5, opens_m5=opens_m5, highs_m5=highs_m5, lows_m5=lows_m5,
            ema20_m5=tf_m5_obj.ema20 if tf_m5_obj else None,
            ema50_m5=tf_m5_obj.ema50 if tf_m5_obj else None,
            ema200_m5=tf_m5_obj.ema200 if tf_m5_obj else None,
            rsi_m5=tf_m5_obj.rsi14 if tf_m5_obj else None,
            macd_line_m5=tf_m5_obj.macd_line if tf_m5_obj else None,
            macd_signal_m5=tf_m5_obj.macd_signal if tf_m5_obj else None,
            macd_prev_m5=macd_prev.get("macd_line"),
            macd_signal_prev_m5=macd_prev.get("signal_line"),
            atr_m5=tf_m5_obj.atr_val if tf_m5_obj else None,
            closes_m30=closes_m30 if closes_m30 else None,
            opens_m30=opens_m30   if opens_m30  else None,
            highs_m30=highs_m30   if highs_m30  else None,
            lows_m30=lows_m30     if lows_m30   else None,
            current_price=last.price,
        )
        strat = result.strategies
        if strat.enter_now and strat.final_direction != "NEUTRAL":
            if result.signal == "NEUTRAL" or result.confidence < strat.final_score:
                result.signal      = strat.final_direction
                result.signal_label= f"{strat.final_label} — stratégies"
                result.confidence  = strat.final_score

    # ÉTAPE 4 : Confirmation structurelle (N bougies consécutives)
    if result.signal in ("BUY", "SELL") and len(closes_m15) >= 30:
        result.confirmation = check_confirmation(
            closes=closes_m15, highs=highs_m15, lows=lows_m15,
            direction=result.signal, n_candles=3,
        )
        if result.confirmation and not result.confirmation.confirmed:
            result.signal_label = f"Non confirmé — {result.confirmation.consecutive_candles}/3 bougies"
            result.confidence   = max(result.confidence - 20, 30)

    # ── Conseil + Explication ──
    _build_advice(result, base_amount)

    # ── Plan de position ──
    if result.signal in ("BUY", "SELL"):
        ref_tf = result.timeframes.get("5min") or result.timeframes.get("15min")
        atr_ref = ref_tf.atr_val if ref_tf else None
        stake_amount = result.stake.get("amount", 0.0)
        if stake_amount > 0:
            result.position = compute_position(
                asset=asset, entry_price=last.price, direction=result.signal,
                atr_value=atr_ref, base_amount=base_amount,
                stake_per_trade=stake_amount, confidence=result.confidence,
                regime=result.global_regime,
            )

    # ── Pending orders (signal faible) ──
    if result.signal in ("NEUTRAL", "WAIT") or result.confidence < 70:
        ref = result.timeframes.get("15min") or result.timeframes.get("5min")
        highs_15 = candle_store.get_highs(900)
        lows_15  = candle_store.get_lows(900)
        sh = max(highs_15[-30:]) if len(highs_15) >= 10 else None
        sl = min(lows_15[-30:])  if len(lows_15)  >= 10 else None
        pend_dir = 1 if result.mtf_bull > result.mtf_bear else (-1 if result.mtf_bear > result.mtf_bull else 0)
        result.pending_orders = compute_pending_orders(
            current_price=last.price, direction=pend_dir,
            ema20=ref.ema20 if ref else None, ema50=ref.ema50 if ref else None,
            rsi14=ref.rsi14 if ref else None,
            macd_line=ref.macd_line if ref else None,
            bb_lower=ref.bb_lower if ref else None,
            bb_upper=ref.bb_upper if ref else None,
            bb_middle=ref.bb_middle if ref else None,
            support=ref.support if ref else None,
            resistance=ref.resistance if ref else None,
            swing_high=sh, swing_low=sl,
            atr=ref.atr_val if ref else None,
            current_confidence=result.confidence,
        )

    # ── FVG globaux (sur M15 — meilleur compromis signal/bruit) ──
    if len(closes_m15) >= 3:
        atr_m15_val = tf_m15_obj.atr_val if tf_m15_obj else None
        result.fvgs = detect_fvg(
            highs=highs_m15, lows=lows_m15, closes=closes_m15,
            current_price=last.price,
            atr_val=atr_m15_val,
            max_fvg=6, lookback=60,
        )
        # FVG optimal selon la direction du signal
        if result.signal in ("BUY", "SELL"):
            fvg_dir = "bullish" if result.signal == "BUY" else "bearish"
            result.nearest_fvg_entry = nearest_fvg(result.fvgs, last.price, fvg_dir)

            # Si le prix est sur un FVG fort → bonus de confiance
            if result.nearest_fvg_entry:
                f = result.nearest_fvg_entry
                dist_pct = abs(f.midpoint - last.price) / last.price * 100
                if dist_pct < 0.1 and f.strength == "strong":
                    result.confidence = min(result.confidence + 8, 98)
                    result.reasons.append(f"FVG {f.direction} fort ({f.bottom:.4f}–{f.top:.4f}) confirmé ✓")
                elif dist_pct < 0.3:
                    result.confidence = min(result.confidence + 4, 98)
                    result.reasons.append(f"FVG {f.direction} proche ({f.midpoint:.4f}) ↓{dist_pct:.2f}%")

        # FVG dans les pending orders aussi
        for fvg in result.fvgs:
            dist_pct = abs(fvg.midpoint - last.price) / last.price * 100
            if dist_pct < 0.05:
                # Le prix est dans la zone FVG → fort signal d'entrée
                if fvg.direction == "bullish" and result.signal != "SELL":
                    result.advice = "✅ Prix dans FVG haussier — Entrée BUY optimale"
                    result.confidence = min(result.confidence + 5, 98)
                elif fvg.direction == "bearish" and result.signal != "BUY":
                    result.advice = "✅ Prix dans FVG baissier — Entrée SELL optimale"
                    result.confidence = min(result.confidence + 5, 98)

    # ── Verrou — seulement si confiance suffisante ──
    if result.signal in ("BUY", "SELL") and result.confidence >= 60:
        signal_lock.invalidate_on_reversal(result.signal)
        lock_dur = 900 if result.confidence >= 80 else 600   # 15min ou 10min (aligné M15)
        signal_lock.lock(
            signal_type=result.signal, signal_label=result.signal_label,
            confidence=result.confidence, advice=result.advice, why=result.why,
            candle_epoch=current_candle_epoch, duration=lock_dur,
        )
        result.signal_locked = False
        result.signal_remaining = lock_dur
        result.signal_remaining_label = f"{lock_dur // 60}min"
    else:
        # Confiance insuffisante → pas de verrou, signal affiché mais non verrouillé
        signal_lock.lock(
            signal_type="NEUTRAL", signal_label="", confidence=0,
            advice="", why="", candle_epoch=current_candle_epoch, duration=0,
        )
        result.signal_remaining = 0
        result.signal_remaining_label = ""

    return result


def _build_advice(result: MTFResult, base_amount: float = 100.0):
    """Génère l'explication complète avec contexte marché."""
    sig = result.signal
    ctx = result.context
    conf_obj = result.confirmation

    result.stake = recommended_stake(
        base_amount=base_amount, signal_type=sig,
        confidence=result.confidence, regime=result.global_regime,
        mtf_alignment=result.mtf_alignment,
    )

    # Message de contexte
    ctx_msg = ""
    if ctx:
        ctx_msg = (
            f"Contexte : {ctx.phase_label} depuis {ctx.phase_duration} bougies. "
            f"Structure {ctx.structure_label}. "
            f"Volatilité {ctx.volatility_label}. "
        )

    # Message de confirmation
    conf_msg = ""
    if conf_obj:
        if conf_obj.confirmed:
            conf_msg = f"✅ Confirmé sur {conf_obj.consecutive_candles} bougies consécutives. "
        else:
            conf_msg = f"⚠ Confirmation partielle ({conf_obj.consecutive_candles}/3 bougies). "

    if result.global_regime == "unstable":
        result.advice = "⛔ Ne pas entrer"
        result.why = ctx_msg + "Volatilité trop élevée — attendre la stabilisation."
        return

    if sig == "NEUTRAL":
        bulls = [l for l, tf in result.timeframes.items() if tf.direction == 1]
        bears = [l for l, tf in result.timeframes.items() if tf.direction == -1]
        result.advice = "⏳ Attendre"
        result.why = (
            ctx_msg +
            f"Conflits entre TF : haussiers=[{','.join(bulls) or 'aucun'}] "
            f"baissiers=[{','.join(bears) or 'aucun'}]. "
            "Pas de consensus suffisant."
        )
        return

    if sig == "WAIT":
        result.advice = "⏳ Collecte en cours"
        result.why = ctx_msg + "Pas encore assez d'historique."
        return

    direction_word = "HAUSSE" if sig == "BUY" else "BAISSE"
    aligned = result.mtf_alignment

    if aligned >= 3 and (not conf_obj or conf_obj.confirmed):
        result.advice = f"✅ Entrée — {direction_word}"
        result.why = (
            ctx_msg + conf_msg +
            f"{aligned}/{len(result.timeframes)} TF alignés. "
            f"Confiance {result.confidence}%. "
            f"Mise : {result.stake.get('amount', 0):.2f}$ "
            f"({result.stake.get('pct_of_capital', 0)}% du capital). "
            f"Signal valable environ {300 if result.confidence >= 80 else 180}s "
            f"sauf invalidation."
        )
    elif aligned >= 2:
        result.advice = "⚠ Signal faible — attendre confirmation"
        result.why = (
            ctx_msg + conf_msg +
            f"Seulement {aligned} TF alignés. "
            "Attendre 3+ TF ou confirmation sur 3 bougies."
        )
    else:
        result.advice = "⛔ Ne pas entrer"
        result.why = ctx_msg + "Alignement insuffisant entre timeframes."
