"""
Stratégie P2dro — Pin Bar + Ligne de tendance + Divergence RSI

BUY (H1 ou M30) :
  1. Zone d'intersection d'une ligne de tendance haussière et d'un support
  2. Pin bar haussier en H1 ou M30 (longue mèche basse, petit corps en haut)
  3. Divergence haussière RSI en M15, M30 ou H1
     (prix fait un nouveau bas, RSI fait un bas plus haut = divergence)
  4. Bougie de confirmation haussière après le pin bar

SELL (H1 ou M30) :
  1. Zone d'intersection d'une ligne de tendance baissière et d'une résistance
  2. Pin bar baissier en H1 ou M30 (longue mèche haute, petit corps en bas)
  3. Divergence baissière RSI en M15, M30 ou H1
     (prix fait un nouveau haut, RSI fait un haut plus bas = divergence)
  4. Bougie de confirmation baissière après le pin bar

Score max : 100 pts
  Intersection tendance + niveau clé : 30 pts
  Pin bar H1/M30                     : 30 pts
  Divergence RSI                     : 25 pts
  Bougie de confirmation             : 15 pts

Seuil d'entrée : ≥ 75/100
"""

from typing import Optional
from app.analysis.strategies.base import StrategySignal, score_label
from app.analysis.indicators import rsi as calc_rsi


# ─────────────────────────────────────────────
# Détection Pin Bar
# ─────────────────────────────────────────────

def _is_bullish_pin_bar(
    open_: float, close: float, high: float, low: float,
    prev_open: float = 0, prev_close: float = 0,
) -> tuple[bool, str]:
    """
    Pin bar haussier :
    - Longue mèche inférieure (≥ 2× le corps)
    - Corps dans le tiers supérieur de la bougie
    - Petite mèche supérieure (≤ 0.3× la mèche inférieure)
    La couleur du corps importe peu (vert ou rouge).
    """
    body = abs(close - open_)
    total_range = high - low
    if total_range < 1e-8:
        return False, ""

    lower_wick = min(open_, close) - low
    upper_wick = high - max(open_, close)

    # Corps dans le tiers supérieur
    body_midpoint = (open_ + close) / 2
    upper_third_start = low + total_range * 0.67
    in_upper_third = body_midpoint >= upper_third_start

    # Mèche inférieure longue
    long_lower_wick = lower_wick >= 2 * max(body, total_range * 0.1)

    # Petite mèche supérieure
    small_upper_wick = upper_wick <= lower_wick * 0.4

    if long_lower_wick and in_upper_third and small_upper_wick:
        ratio = round(lower_wick / total_range * 100)
        return True, f"Pin bar haussier (mèche basse {ratio}% de la bougie)"

    return False, ""


def _is_bearish_pin_bar(
    open_: float, close: float, high: float, low: float,
    prev_open: float = 0, prev_close: float = 0,
) -> tuple[bool, str]:
    """
    Pin bar baissier :
    - Longue mèche supérieure (≥ 2× le corps)
    - Corps dans le tiers inférieur de la bougie
    - Petite mèche inférieure
    """
    body = abs(close - open_)
    total_range = high - low
    if total_range < 1e-8:
        return False, ""

    lower_wick = min(open_, close) - low
    upper_wick = high - max(open_, close)

    body_midpoint = (open_ + close) / 2
    lower_third_end = low + total_range * 0.33
    in_lower_third = body_midpoint <= lower_third_end

    long_upper_wick = upper_wick >= 2 * max(body, total_range * 0.1)
    small_lower_wick = lower_wick <= upper_wick * 0.4

    if long_upper_wick and in_lower_third and small_lower_wick:
        ratio = round(upper_wick / total_range * 100)
        return True, f"Pin bar baissier (mèche haute {ratio}% de la bougie)"

    return False, ""


# ─────────────────────────────────────────────
# Divergence RSI
# ─────────────────────────────────────────────

def _detect_bullish_divergence(
    closes: list[float],
    rsi_period: int = 14,
    lookback: int = 20,
) -> tuple[bool, str]:
    """
    Divergence haussière :
    Prix fait un nouveau plus bas, RSI fait un bas plus haut.
    Compare les 2 derniers creux locaux.
    """
    if len(closes) < rsi_period + lookback + 2:
        return False, ""

    rsi_vals = []
    for i in range(len(closes) - lookback, len(closes)):
        sub = closes[:i + 1]
        r = calc_rsi(sub, rsi_period)
        rsi_vals.append(r if r is not None else 50.0)

    prices_window = closes[-lookback:]

    # Trouver les 2 derniers creux de prix (minima locaux)
    price_troughs = []
    for i in range(1, len(prices_window) - 1):
        if prices_window[i] < prices_window[i-1] and prices_window[i] < prices_window[i+1]:
            price_troughs.append((i, prices_window[i]))

    if len(price_troughs) < 2:
        return False, ""

    t1_idx, t1_price = price_troughs[-2]
    t2_idx, t2_price = price_troughs[-1]

    # Le prix fait un bas plus bas
    if t2_price >= t1_price:
        return False, ""

    # RSI fait un bas plus haut (divergence)
    if len(rsi_vals) > t2_idx and len(rsi_vals) > t1_idx:
        r1 = rsi_vals[t1_idx]
        r2 = rsi_vals[t2_idx]
        if r2 > r1 + 2:  # marge de 2 points RSI
            return True, f"Divergence haussière RSI : prix ↓ ({t1_price:.2f}→{t2_price:.2f}) mais RSI ↑ ({r1:.1f}→{r2:.1f})"

    return False, ""


def _detect_bearish_divergence(
    closes: list[float],
    rsi_period: int = 14,
    lookback: int = 20,
) -> tuple[bool, str]:
    """
    Divergence baissière :
    Prix fait un nouveau plus haut, RSI fait un haut plus bas.
    """
    if len(closes) < rsi_period + lookback + 2:
        return False, ""

    rsi_vals = []
    for i in range(len(closes) - lookback, len(closes)):
        sub = closes[:i + 1]
        r = calc_rsi(sub, rsi_period)
        rsi_vals.append(r if r is not None else 50.0)

    prices_window = closes[-lookback:]

    # Trouver les 2 derniers sommets de prix (maxima locaux)
    price_peaks = []
    for i in range(1, len(prices_window) - 1):
        if prices_window[i] > prices_window[i-1] and prices_window[i] > prices_window[i+1]:
            price_peaks.append((i, prices_window[i]))

    if len(price_peaks) < 2:
        return False, ""

    p1_idx, p1_price = price_peaks[-2]
    p2_idx, p2_price = price_peaks[-1]

    # Le prix fait un haut plus haut
    if p2_price <= p1_price:
        return False, ""

    # RSI fait un haut plus bas (divergence)
    if len(rsi_vals) > p2_idx and len(rsi_vals) > p1_idx:
        r1 = rsi_vals[p1_idx]
        r2 = rsi_vals[p2_idx]
        if r2 < r1 - 2:
            return True, f"Divergence baissière RSI : prix ↑ ({p1_price:.2f}→{p2_price:.2f}) mais RSI ↓ ({r1:.1f}→{r2:.1f})"

    return False, ""


# ─────────────────────────────────────────────
# Ligne de tendance + Niveau clé
# ─────────────────────────────────────────────

def _check_trendline_support_intersection(
    closes: list[float],
    highs: list[float],
    lows: list[float],
    current_price: float,
    support: Optional[float],
    direction: str,  # "bullish" | "bearish"
    atr: Optional[float],
) -> tuple[bool, str]:
    """
    Vérifie qu'on est dans une zone d'intersection :
    ligne de tendance + support/résistance.

    Ligne de tendance haussière = série de bas croissants (lows qui montent)
    Ligne de tendance baissière = série de hauts décroissants (highs qui descendent)

    On utilise les 3 derniers pivots pour tracer la tendance.
    """
    tolerance = (atr * 1.0) if atr else (current_price * 0.003)

    if direction == "bullish":
        # Chercher les 3 derniers bas locaux croissants
        troughs = []
        for i in range(1, len(lows) - 1):
            if lows[i] < lows[i-1] and lows[i] < lows[i+1]:
                troughs.append((i, lows[i]))
        troughs = troughs[-3:]  # 3 derniers

        if len(troughs) >= 2:
            # Vérifier que les bas sont croissants (ligne de tendance haussière)
            if troughs[-1][1] > troughs[-2][1]:
                # Extrapoler la ligne jusqu'au prix actuel
                x1, y1 = troughs[-2]
                x2, y2 = troughs[-1]
                slope = (y2 - y1) / (x2 - x1) if x2 != x1 else 0
                projected = y2 + slope * (len(lows) - 1 - x2)

                near_trendline = abs(current_price - projected) <= tolerance
                near_support = support and abs(current_price - support) <= tolerance * 1.5

                if near_trendline and near_support:
                    return True, f"Zone intersection : ligne de tendance haussière ({projected:.4f}) + support ({support:.4f})"
                elif near_trendline:
                    return True, f"Prix sur ligne de tendance haussière ({projected:.4f})"
                elif near_support:
                    return True, f"Prix sur support clé ({support:.4f})"

    else:  # bearish
        # Chercher les 3 derniers hauts locaux décroissants
        peaks = []
        for i in range(1, len(highs) - 1):
            if highs[i] > highs[i-1] and highs[i] > highs[i+1]:
                peaks.append((i, highs[i]))
        peaks = peaks[-3:]

        if len(peaks) >= 2:
            if peaks[-1][1] < peaks[-2][1]:
                x1, y1 = peaks[-2]
                x2, y2 = peaks[-1]
                slope = (y2 - y1) / (x2 - x1) if x2 != x1 else 0
                projected = y2 + slope * (len(highs) - 1 - x2)

                from app.analysis.indicators import support_resistance
                near_trendline = abs(current_price - projected) <= tolerance
                resistance = None
                sr = support_resistance(highs, lows, 30)
                resistance = sr.get("resistance")

                near_resistance = resistance and abs(current_price - resistance) <= tolerance * 1.5

                if near_trendline and near_resistance:
                    return True, f"Zone intersection : ligne de tendance baissière ({projected:.4f}) + résistance ({resistance:.4f})"
                elif near_trendline:
                    return True, f"Prix sur ligne de tendance baissière ({projected:.4f})"
                elif near_resistance:
                    return True, f"Prix sur résistance clé ({resistance:.4f})"

    return False, ""


# ─────────────────────────────────────────────
# Moteur principal P2dro
# ─────────────────────────────────────────────

def run(
    # Données H1
    opens_h1: list[float],
    closes_h1: list[float],
    highs_h1: list[float],
    lows_h1: list[float],
    # Données M30
    opens_m30: list[float],
    closes_m30: list[float],
    highs_m30: list[float],
    lows_m30: list[float],
    # Données M15 (pour divergence RSI)
    closes_m15: list[float],
    # Support/Résistance
    support: Optional[float],
    resistance: Optional[float],
    # ATR de référence
    atr: Optional[float],
    # Prix actuel
    current_price: float,
) -> StrategySignal:
    """
    Évalue la stratégie P2dro sur H1 et M30.
    Cherche le meilleur setup dans les deux timeframes.
    """
    MIN_SCORE = 75
    met: list[str] = []
    failed: list[str] = []

    best_direction = "NEUTRAL"
    best_score = 0
    best_met: list[str] = []
    best_failed: list[str] = []

    for tf_label, opens, closes, highs, lows in [
        ("H1",  opens_h1,  closes_h1,  highs_h1,  lows_h1),
        ("M30", opens_m30, closes_m30, highs_m30, lows_m30),
    ]:
        if len(closes) < 4:
            continue

        for direction in ["bullish", "bearish"]:
            score = 0
            c_met: list[str] = []
            c_failed: list[str] = []

            # ── Condition 1 : Intersection ligne de tendance + niveau clé (30 pts) ──
            near_zone, zone_msg = _check_trendline_support_intersection(
                closes=closes, highs=highs, lows=lows,
                current_price=current_price,
                support=support,
                direction=direction,
                atr=atr,
            )
            if near_zone:
                score += 30
                c_met.append(f"[{tf_label}] {zone_msg} [+30]")
            else:
                c_failed.append(f"[{tf_label}] Pas de zone intersection ligne de tendance + niveau [0]")

            # ── Condition 2 : Pin bar H1 ou M30 (30 pts) ──
            # On regarde la dernière bougie complète (index -2, la -1 étant en cours)
            pin_idx = -2 if len(closes) >= 2 else -1
            if direction == "bullish":
                is_pin, pin_msg = _is_bullish_pin_bar(
                    opens[pin_idx], closes[pin_idx],
                    highs[pin_idx], lows[pin_idx],
                )
            else:
                is_pin, pin_msg = _is_bearish_pin_bar(
                    opens[pin_idx], closes[pin_idx],
                    highs[pin_idx], lows[pin_idx],
                )

            if is_pin:
                score += 30
                c_met.append(f"[{tf_label}] {pin_msg} [+30]")
            else:
                c_failed.append(f"[{tf_label}] Pas de pin bar {direction} [0]")

            # ── Condition 3 : Divergence RSI (25 pts) ──
            # On cherche la divergence sur M15, M30 ou H1
            divergence_found = False
            for div_label, div_closes in [
                ("M15", closes_m15),
                ("M30", closes_m30),
                ("H1",  closes_h1),
            ]:
                if direction == "bullish":
                    found, msg = _detect_bullish_divergence(div_closes)
                else:
                    found, msg = _detect_bearish_divergence(div_closes)

                if found:
                    score += 25
                    c_met.append(f"[{div_label}] {msg} [+25]")
                    divergence_found = True
                    break

            if not divergence_found:
                c_failed.append("Pas de divergence RSI détectée sur M15/M30/H1 [0]")

            # ── Condition 4 : Bougie de confirmation après le pin bar (15 pts) ──
            # La dernière bougie doit confirmer la direction
            if len(closes) >= 1:
                last_o = opens[-1]
                last_c = closes[-1]
                if direction == "bullish" and last_c > last_o:
                    score += 15
                    c_met.append(f"[{tf_label}] Bougie haussière de confirmation [+15]")
                elif direction == "bearish" and last_c < last_o:
                    score += 15
                    c_met.append(f"[{tf_label}] Bougie baissière de confirmation [+15]")
                else:
                    c_failed.append(f"[{tf_label}] Pas de bougie de confirmation {direction} [0]")

            # Garder le meilleur setup
            if score > best_score:
                best_score = score
                best_direction = "BUY" if direction == "bullish" else "SELL"
                best_met = c_met
                best_failed = c_failed

    if best_score == 0:
        return StrategySignal(
            name="P2dro",
            direction="NEUTRAL",
            score=0,
            confidence_label="Insuffisant",
            entry_reason="Aucun setup P2dro détecté sur H1 ou M30",
            conditions_met=[],
            conditions_failed=["Aucune pin bar + divergence + zone détectée"],
            active=False,
        )

    active = best_score >= MIN_SCORE and best_direction != "NEUTRAL"

    if active:
        reason = (
            f"Setup P2dro {best_direction} détecté. "
            f"Score {best_score}/100. "
            f"Pin bar + divergence RSI + zone confirmés."
        )
    else:
        reason = (
            f"Setup P2dro partiel ({best_score}/100 < {MIN_SCORE}). "
            f"Attendre toutes les conditions."
        )

    return StrategySignal(
        name="P2dro",
        direction=best_direction if active else "NEUTRAL",
        score=best_score,
        confidence_label=score_label(best_score),
        entry_reason=reason,
        conditions_met=best_met,
        conditions_failed=best_failed,
        active=active,
    )
