"""
Confirmation Price Action sur M5 — pour Synthetic Indices.

Logique professionnelle :
  H1/M15 → Tendance + Zone clé (FVG, Support, Order Block)
  M5     → UNE bougie de confirmation (Engulfing, Pinbar, Marubozu)

Le feu vert est donné DÈS QUE la bougie M5 est fermée avec le bon pattern
sur un niveau clé. Pas d'attente de 45 minutes.

Résultat inclut :
  - confirmed    : True/False
  - pattern      : le pattern détecté
  - limit_price  : prix du Buy Limit / Sell Limit à placer dans MT5
  - limit_type   : "support" | "fvg" | "ema" | "order_block" | "fibonacci"
  - limit_label  : description du niveau
  - sl_price     : Stop Loss suggéré
  - rationale    : explication en français
"""

from dataclasses import dataclass
from typing import Optional

from app.analysis.indicators import (
    CandlePattern,
    detect_candle_pattern,
    detect_order_block,
    ema,
    rsi,
    support_resistance,
    detect_fvg,
    atr as calc_atr,
)


@dataclass
class PriceActionConfirmation:
    confirmed: bool
    direction: str               # "BUY" | "SELL" | "NEUTRAL"
    pattern: Optional[CandlePattern]
    pattern_label: str

    # Prix d'ordre limite — à placer dans MT5
    limit_price: Optional[float]   # Buy Limit ou Sell Limit
    limit_type: str                # "support"|"fvg"|"ema"|"order_block"|"fibo"
    limit_label: str               # description du niveau

    # SL suggéré depuis le niveau
    sl_price: Optional[float]

    # Score de qualité 0-100
    score: int
    rationale: str

    def to_dict(self) -> dict:
        return {
            "confirmed":     self.confirmed,
            "direction":     self.direction,
            "pattern":       self.pattern.to_dict() if self.pattern else None,
            "pattern_label": self.pattern_label,
            "limit_price":   self.limit_price,
            "limit_type":    self.limit_type,
            "limit_label":   self.limit_label,
            "sl_price":      self.sl_price,
            "score":         self.score,
            "rationale":     self.rationale,
        }


def _best_key_level(
    direction: str,
    current_price: float,
    atr_val: float,
    support: Optional[float],
    resistance: Optional[float],
    ema20: Optional[float],
    ema50: Optional[float],
    fvg_bottom: Optional[float],
    fvg_top: Optional[float],
    order_block: Optional[tuple[float, float, int]],
) -> tuple[Optional[float], str, str]:
    """
    Retourne (limit_price, type, label) — le meilleur niveau clé pour l'ordre limite.
    Priorité : FVG > Order Block > EMA20 > Support/Résistance > EMA50
    """
    candidates: list[tuple[float, str, str, float]] = []  # (price, type, label, score)

    if direction == "BUY":
        # FVG haussier — zone de rebond optimale
        if fvg_bottom is not None and fvg_top is not None:
            mid = (fvg_bottom + fvg_top) / 2
            if mid < current_price:
                dist = (current_price - mid) / current_price
                score = 90 - dist * 1000  # plus proche = meilleur score
                candidates.append((round(mid, 4), "fvg",
                    f"FVG haussier ({fvg_bottom:.4f}–{fvg_top:.4f})", max(score, 50)))

        # Order Block haussier
        if order_block:
            ob_mid = (order_block[0] + order_block[1]) / 2
            if ob_mid < current_price:
                candidates.append((round(ob_mid, 4), "order_block",
                    f"Order Block ({order_block[1]:.4f}–{order_block[0]:.4f})", 80))

        # EMA20 — support dynamique
        if ema20 and ema20 < current_price:
            candidates.append((round(ema20, 4), "ema", f"EMA20 ({ema20:.4f})", 70))

        # Support structurel
        if support and support < current_price:
            candidates.append((round(support, 4), "support", f"Support ({support:.4f})", 75))

        # EMA50 — support secondaire
        if ema50 and ema50 < current_price:
            candidates.append((round(ema50, 4), "ema", f"EMA50 ({ema50:.4f})", 60))

    else:  # SELL
        # FVG baissier
        if fvg_bottom is not None and fvg_top is not None:
            mid = (fvg_bottom + fvg_top) / 2
            if mid > current_price:
                dist = (mid - current_price) / current_price
                score = 90 - dist * 1000
                candidates.append((round(mid, 4), "fvg",
                    f"FVG baissier ({fvg_bottom:.4f}–{fvg_top:.4f})", max(score, 50)))

        if order_block:
            ob_mid = (order_block[0] + order_block[1]) / 2
            if ob_mid > current_price:
                candidates.append((round(ob_mid, 4), "order_block",
                    f"Order Block ({order_block[1]:.4f}–{order_block[0]:.4f})", 80))

        if ema20 and ema20 > current_price:
            candidates.append((round(ema20, 4), "ema", f"EMA20 ({ema20:.4f})", 70))

        if resistance and resistance > current_price:
            candidates.append((round(resistance, 4), "resistance",
                f"Résistance ({resistance:.4f})", 75))

        if ema50 and ema50 > current_price:
            candidates.append((round(ema50, 4), "ema", f"EMA50 ({ema50:.4f})", 60))

    if not candidates:
        return None, "none", "Pas de niveau clé identifié"

    # Trier par score décroissant
    candidates.sort(key=lambda x: -x[3])
    best = candidates[0]
    return best[0], best[1], best[2]


def check_price_action_confirmation(
    # Bougies M5 (timeframe de confirmation)
    opens_m5:  list[float],
    highs_m5:  list[float],
    lows_m5:   list[float],
    closes_m5: list[float],
    # Bougies M15 (zones clés)
    opens_m15:  list[float],
    highs_m15:  list[float],
    lows_m15:   list[float],
    closes_m15: list[float],
    # Direction du signal (déterminée par MTF)
    direction: str,   # "BUY" | "SELL"
    # Prix actuel
    current_price: float,
    # FVG le plus proche (depuis le moteur)
    fvg_bottom: Optional[float] = None,
    fvg_top:    Optional[float] = None,
) -> PriceActionConfirmation:
    """
    Confirmation Price Action sur M5.

    Étape 1 : Identifier le niveau clé le plus proche sur M15
    Étape 2 : Vérifier si la dernière bougie M5 FERMÉE est un pattern de confirmation
    Étape 3 : Calculer le Buy/Sell Limit + SL

    Feu vert immédiat dès qu'une bougie M5 confirme sur un niveau clé.
    """
    # ── Données minimales ──
    if len(closes_m5) < 3 or len(closes_m15) < 10:
        return PriceActionConfirmation(
            confirmed=False, direction=direction,
            pattern=None, pattern_label="Données insuffisantes",
            limit_price=None, limit_type="none", limit_label="",
            sl_price=None, score=0,
            rationale="Pas assez de bougies pour la confirmation Price Action.",
        )

    # ── ATR M15 pour calibrer les seuils ──
    atr_m15 = calc_atr(highs_m15, lows_m15, closes_m15, 14)
    atr_m5  = calc_atr(highs_m5,  lows_m5,  closes_m5,  14)
    atr_ref = atr_m15 or atr_m5 or (current_price * 0.001)

    # ── Indicateurs M15 (zones clés) ──
    e20_m15 = ema(closes_m15, 20)
    e50_m15 = ema(closes_m15, 50)
    sr_m15  = support_resistance(highs_m15, lows_m15, 30)
    sup     = sr_m15["support"]
    res     = sr_m15["resistance"]

    # ── Order Block M15 ──
    ob_dir = "bullish" if direction == "BUY" else "bearish"
    order_block = detect_order_block(opens_m15, highs_m15, lows_m15, closes_m15,
                                     ob_dir, lookback=15)

    # ── Meilleur niveau clé pour l'ordre limite ──
    limit_price, limit_type, limit_label = _best_key_level(
        direction=direction,
        current_price=current_price,
        atr_val=atr_ref,
        support=sup,
        resistance=res,
        ema20=e20_m15,
        ema50=e50_m15,
        fvg_bottom=fvg_bottom,
        fvg_top=fvg_top,
        order_block=order_block,
    )

    # ── SL depuis le niveau clé ──
    sl_price: Optional[float] = None
    if limit_price is not None:
        sl_distance = atr_ref * 1.5
        if direction == "BUY":
            sl_price = round(limit_price - sl_distance, 4)
        else:
            sl_price = round(limit_price + sl_distance, 4)

    # ── Détection du pattern sur la dernière bougie M5 FERMÉE ──
    # On prend l'avant-dernière bougie (index=-2) car la dernière est peut-être en cours
    candle_idx = -2 if len(closes_m5) >= 2 else -1
    pattern = detect_candle_pattern(
        opens_m5, highs_m5, lows_m5, closes_m5,
        atr_val=atr_m5,
        index=candle_idx,
    )

    # ── Vérification de l'alignement pattern / direction ──
    pattern_aligned = (
        (direction == "BUY"  and pattern.direction == "bullish") or
        (direction == "SELL" and pattern.direction == "bearish")
    )
    pattern_strong = pattern.strength in ("strong", "medium")
    pattern_valid  = pattern.pattern in ("engulfing", "pinbar", "marubozu")

    # ── Score global ──
    score = 0
    rationale_parts = []

    # Points pour le pattern
    if pattern_valid and pattern_aligned:
        pattern_scores = {"engulfing": 40, "pinbar": 35, "marubozu": 30}
        strength_bonus = {"strong": 10, "medium": 5, "weak": 0}
        score += pattern_scores.get(pattern.pattern, 20)
        score += strength_bonus.get(pattern.strength, 0)
        rationale_parts.append(f"✅ {pattern.label} détecté sur M5")
    elif pattern.pattern == "doji":
        score += 10
        rationale_parts.append("⚠ Doji M5 — indécision, attendre la bougie suivante")
    else:
        rationale_parts.append("⏳ Pas de pattern de confirmation sur M5 pour l'instant")

    # Points pour le niveau clé
    if limit_price is not None:
        level_scores = {"fvg": 30, "order_block": 25, "support": 20,
                        "resistance": 20, "ema": 15}
        score += level_scores.get(limit_type, 10)
        rationale_parts.append(f"📍 Niveau clé : {limit_label}")

    # Points pour RSI M5 aligné
    r14_m5 = rsi(closes_m5, 14)
    if r14_m5:
        if direction == "BUY" and r14_m5 < 40:
            score += 15
            rationale_parts.append(f"RSI M5 survendu ({r14_m5:.1f}) — rebond potentiel")
        elif direction == "SELL" and r14_m5 > 60:
            score += 15
            rationale_parts.append(f"RSI M5 suracheté ({r14_m5:.1f}) — retournement potentiel")
        elif direction == "BUY" and r14_m5 < 50:
            score += 5
        elif direction == "SELL" and r14_m5 > 50:
            score += 5

    score = min(score, 100)

    # ── Décision finale ──
    # Confirmé si : pattern valide + aligné + score ≥ 50
    confirmed = pattern_valid and pattern_aligned and pattern_strong and score >= 50

    if confirmed:
        rationale = (
            f"✅ Confirmation Price Action : {pattern.label}. "
            f"{'. '.join(rationale_parts[1:])}. "
            f"Score : {score}/100."
        )
        direction_word = "Buy Limit" if direction == "BUY" else "Sell Limit"
        if limit_price:
            rationale += (
                f" Placer un {direction_word} à {limit_price:.4f} "
                f"({limit_label}). SL à {sl_price:.4f}."
            )
    else:
        rationale = " · ".join(rationale_parts) if rationale_parts else "Attendre un pattern de confirmation sur M5."
        if limit_price:
            direction_word = "Buy Limit" if direction == "BUY" else "Sell Limit"
            rationale += (
                f" En attendant, niveau pour {direction_word} : "
                f"{limit_price:.4f} ({limit_label})."
            )

    return PriceActionConfirmation(
        confirmed=confirmed,
        direction=direction if confirmed else "NEUTRAL",
        pattern=pattern if pattern_valid else None,
        pattern_label=pattern.label,
        limit_price=limit_price,
        limit_type=limit_type,
        limit_label=limit_label,
        sl_price=sl_price,
        score=score,
        rationale=rationale,
    )
