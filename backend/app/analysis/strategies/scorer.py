"""
Orchestrateur des 4 stratégies + filtres anti-faux signaux.

Stratégies :
  1. Trend + Pullback   (seuil ≥ 80)
  2. Breakout + Retest  (seuil ≥ 85)
  3. Multi-TF H1/M15/M5 (seuil ≥ 70)
  4. P2dro — Pin Bar + Ligne de tendance + Divergence RSI (seuil ≥ 75)
"""

from dataclasses import dataclass, field
from typing import Optional

from app.analysis.strategies import trend_pullback, breakout_retest, multi_tf, p2dro
from app.analysis.strategies.base import StrategySignal, score_label


@dataclass
class ScorerResult:
    trend_pullback: StrategySignal
    breakout_retest: StrategySignal
    multi_timeframe: StrategySignal
    p2dro: StrategySignal

    final_direction: str
    final_score: int
    final_label: str
    strategies_agree: int

    filters_passed: list[str]
    filters_failed: list[str]
    filtered_out: bool

    verdict: str
    enter_now: bool

    def to_dict(self) -> dict:
        return {
            "strategies": {
                "trend_pullback":  self.trend_pullback.to_dict(),
                "breakout_retest": self.breakout_retest.to_dict(),
                "multi_timeframe": self.multi_timeframe.to_dict(),
                "p2dro":           self.p2dro.to_dict(),
            },
            "consensus": {
                "direction":        self.final_direction,
                "score":            self.final_score,
                "label":            self.final_label,
                "strategies_agree": self.strategies_agree,
            },
            "filters": {
                "passed":  self.filters_passed,
                "failed":  self.filters_failed,
                "blocked": self.filtered_out,
            },
            "verdict":    self.verdict,
            "enter_now":  self.enter_now,
        }


def run_all(
    closes_h1: list[float], opens_h1: list[float],
    highs_h1: list[float], lows_h1: list[float],
    ema50_h1: Optional[float], ema200_h1: Optional[float],

    closes_m15: list[float], opens_m15: list[float],
    highs_m15: list[float], lows_m15: list[float],
    ema20_m15: Optional[float], ema50_m15: Optional[float],
    ema200_m15: Optional[float],
    rsi_m15: Optional[float],
    support_m15: Optional[float], resistance_m15: Optional[float],
    atr_m15: Optional[float], atr_mean_m15: Optional[float],

    closes_m5: list[float], opens_m5: list[float],
    highs_m5: list[float], lows_m5: list[float],
    ema20_m5: Optional[float], ema50_m5: Optional[float],
    ema200_m5: Optional[float],
    rsi_m5: Optional[float],
    macd_line_m5: Optional[float], macd_signal_m5: Optional[float],
    macd_prev_m5: Optional[float], macd_signal_prev_m5: Optional[float],
    atr_m5: Optional[float],

    # Données M30 pour P2dro
    closes_m30: Optional[list[float]] = None,
    opens_m30:  Optional[list[float]] = None,
    highs_m30:  Optional[list[float]] = None,
    lows_m30:   Optional[list[float]] = None,

    current_price: float = 0.0,
) -> ScorerResult:

    filters_passed: list[str] = []
    filters_failed: list[str] = []

    # ── Stratégie 1 : Trend + Pullback ──
    sig1 = trend_pullback.run(
        closes=closes_m15, opens=opens_m15,
        highs=highs_m15, lows=lows_m15,
        ema20=ema20_m15, ema50=ema50_m15, ema200=ema200_m15,
        rsi14=rsi_m15, atr=atr_m15,
    )

    # ── Stratégie 2 : Breakout + Retest ──
    sig2 = breakout_retest.run(
        closes=closes_m15, opens=opens_m15,
        highs=highs_m15, lows=lows_m15,
        atr=atr_m15, atr_mean=atr_mean_m15,
    )

    # ── Stratégie 3 : Multi-TF ──
    sig3 = multi_tf.run(
        ema50_h1=ema50_h1, ema200_h1=ema200_h1,
        price_m15=closes_m15[-1] if closes_m15 else None,
        ema20_m15=ema20_m15,
        support_m15=support_m15, resistance_m15=resistance_m15,
        rsi_m15=rsi_m15, atr_m15=atr_m15,
        closes_m5=closes_m5, opens_m5=opens_m5,
        highs_m5=highs_m5, lows_m5=lows_m5,
        macd_line_m5=macd_line_m5, macd_signal_m5=macd_signal_m5,
        macd_prev_m5=macd_prev_m5, macd_signal_prev_m5=macd_signal_prev_m5,
    )

    # ── Stratégie 4 : P2dro (Pin Bar + Divergence RSI + Ligne de tendance) ──
    _m30_opens  = opens_m30  or opens_h1[-10:]  if opens_h1  else []
    _m30_closes = closes_m30 or closes_h1[-10:] if closes_h1 else []
    _m30_highs  = highs_m30  or highs_h1[-10:]  if highs_h1  else []
    _m30_lows   = lows_m30   or lows_h1[-10:]   if lows_h1   else []

    sig4 = p2dro.run(
        opens_h1=opens_h1,   closes_h1=closes_h1,
        highs_h1=highs_h1,   lows_h1=lows_h1,
        opens_m30=_m30_opens,  closes_m30=_m30_closes,
        highs_m30=_m30_highs,  lows_m30=_m30_lows,
        closes_m15=closes_m15,
        support=support_m15, resistance=resistance_m15,
        atr=atr_m15,
        current_price=current_price,
    )

    # ── Consensus (règle 3/4 minimum, P2dro priorisé) ──
    all_sigs = [sig1, sig2, sig3, sig4]
    active_sigs = [s for s in all_sigs if s.active]
    buy_sigs    = [s for s in active_sigs if s.direction == "BUY"]
    sell_sigs   = [s for s in active_sigs if s.direction == "SELL"]

    # P2dro compte double dans le consensus (priorité)
    p2dro_buy  = sig4.active and sig4.direction == "BUY"
    p2dro_sell = sig4.active and sig4.direction == "SELL"

    effective_buy  = len(buy_sigs)  + (1 if p2dro_buy  else 0)  # +1 car déjà compté dans buy_sigs
    effective_sell = len(sell_sigs) + (1 if p2dro_sell else 0)

    # Règle : 3/4 minimum
    # Exception P2dro : si P2dro actif + 1 autre stratégie = signal valide (2+bonus = 3 effectifs)
    if effective_buy >= 3 and effective_buy > effective_sell:
        final_dir = "BUY"
        agree     = len(buy_sigs)
        avg_score = int(sum(s.score for s in buy_sigs) / len(buy_sigs))
    elif effective_sell >= 3 and effective_sell > effective_buy:
        final_dir = "SELL"
        agree     = len(sell_sigs)
        avg_score = int(sum(s.score for s in sell_sigs) / len(sell_sigs))
    else:
        final_dir = "NEUTRAL"
        agree     = max(len(buy_sigs), len(sell_sigs))
        avg_score = 0

    # Bonus si toutes les stratégies concordent
    if agree == 4:
        avg_score = min(avg_score + 8, 100)
        filters_passed.append("4/4 stratégies concordent (+8 bonus)")
    elif agree == 3:
        avg_score = min(avg_score + 5, 100)
        filters_passed.append("3/4 stratégies concordent (+5 bonus)")

    # P2dro priorité : bonus score supplémentaire si actif et aligné
    if sig4.active and sig4.direction == final_dir and final_dir != "NEUTRAL":
        # P2dro boost : +10 pts car c'est la méthode prioritaire
        avg_score = min(avg_score + 10, 100)
        filters_passed.append(f"P2dro confirme {final_dir} — méthode prioritaire (+10)")
    elif sig4.active and sig4.direction != final_dir and final_dir != "NEUTRAL":
        # P2dro en désaccord : avertissement mais pas de blocage
        filters_failed.append(
            f"⚠ P2dro dit {sig4.direction} mais consensus dit {final_dir} — prudence"
        )
        avg_score = max(0, avg_score - 5)

    # ── Filtres anti-faux signaux ──
    filtered_out = False

    if atr_mean_m15 and len(closes_m15) >= 2 and len(opens_m15) >= 2:
        last_body = abs(closes_m15[-1] - opens_m15[-1])
        if last_body > 2 * atr_mean_m15:
            filters_failed.append(
                f"⚠ Bougie M15 trop grande ({last_body:.4f} > 2×ATR) — mouvement épuisé"
            )
            filtered_out = True
        else:
            filters_passed.append("Taille bougie M15 normale (< 2×ATR)")

    if support_m15 and resistance_m15 and atr_m15:
        range_size = resistance_m15 - support_m15
        if range_size < atr_m15 * 1.5:
            filters_failed.append(f"⚠ Range trop étroit ({range_size:.4f} < 1.5×ATR)")
            filtered_out = True
        else:
            filters_passed.append(f"Range suffisant ({range_size:.4f} ≥ 1.5×ATR)")

    if sig3.direction != "NEUTRAL" and sig1.direction != "NEUTRAL":
        if sig1.direction != sig3.direction:
            filters_failed.append(
                f"⚠ Contradiction : Trend+Pullback dit {sig1.direction} "
                f"mais MTF dit {sig3.direction}"
            )
            avg_score = max(0, avg_score - 10)
        else:
            filters_passed.append(f"Stratégies 1 et 3 concordent ({sig1.direction})")

    if agree < 3 and final_dir != "NEUTRAL":
        filters_failed.append(f"⚠ Seulement {agree}/4 stratégies actives — minimum 3/4 requis")
        filtered_out = True
    elif agree >= 3:
        filters_passed.append(f"{agree}/4 stratégies actives et concordantes ✓")

    # ── Verdict final ──
    final_label = score_label(avg_score)
    enter_now   = not filtered_out and final_dir != "NEUTRAL" and avg_score >= 70

    p2dro_note = ""
    if sig4.active and sig4.direction == final_dir:
        p2dro_note = " · ⭐ P2dro confirme"
    elif sig4.active and sig4.direction != final_dir and final_dir != "NEUTRAL":
        p2dro_note = " · ⚠ P2dro diverge"

    if filtered_out:
        missing = 3 - agree
        verdict = (
            f"🚫 Signal {final_dir} BLOQUÉ — {agree}/4 stratégies "
            f"(besoin de {missing} de plus). "
            f"{' | '.join(filters_failed[:1])}"
        )
    elif enter_now:
        verdict = (
            f"✅ Signal {final_dir} — {final_label} ({avg_score}/100). "
            f"{agree}/4 stratégies confirment{p2dro_note}."
        )
    else:
        verdict = (
            f"⏳ Signal insuffisant ({avg_score}/100). "
            f"{agree}/4 stratégies actives (besoin de 3 minimum)."
        )

    return ScorerResult(
        trend_pullback=sig1,
        breakout_retest=sig2,
        multi_timeframe=sig3,
        p2dro=sig4,
        final_direction=final_dir,
        final_score=avg_score,
        final_label=final_label,
        strategies_agree=agree,
        filters_passed=filters_passed,
        filters_failed=filters_failed,
        filtered_out=filtered_out,
        verdict=verdict,
        enter_now=enter_now,
    )
