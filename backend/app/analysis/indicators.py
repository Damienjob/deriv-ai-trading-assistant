"""
Calcul des indicateurs techniques (sans dépendances externes).
Opère sur des listes de prix (floats) ou OHLC.
"""

from typing import Optional


# ─────────────────────────────────────────────
# MOYENNES MOBILES
# ─────────────────────────────────────────────

def ema(prices: list[float], period: int) -> Optional[float]:
    """EMA — Exponential Moving Average."""
    if len(prices) < period:
        return None
    k = 2 / (period + 1)
    val = sum(prices[:period]) / period
    for p in prices[period:]:
        val = p * k + val * (1 - k)
    return round(val, 4)


def ema_series(prices: list[float], period: int) -> list[float]:
    """Série EMA complète (pour MACD)."""
    if len(prices) < period:
        return []
    k = 2 / (period + 1)
    series = [sum(prices[:period]) / period]
    for p in prices[period:]:
        series.append(p * k + series[-1] * (1 - k))
    return series


def sma(prices: list[float], period: int) -> Optional[float]:
    """SMA — Simple Moving Average."""
    if len(prices) < period:
        return None
    return round(sum(prices[-period:]) / period, 4)


# ─────────────────────────────────────────────
# MOMENTUM
# ─────────────────────────────────────────────

def rsi(prices: list[float], period: int = 14) -> Optional[float]:
    """RSI — Relative Strength Index (Wilder's smoothing)."""
    if len(prices) < period + 1:
        return None
    gains, losses = [], []
    for i in range(1, len(prices)):
        d = prices[i] - prices[i - 1]
        gains.append(max(d, 0))
        losses.append(max(-d, 0))
    ag = sum(gains[:period]) / period
    al = sum(losses[:period]) / period
    for i in range(period, len(gains)):
        ag = (ag * (period - 1) + gains[i]) / period
        al = (al * (period - 1) + losses[i]) / period
    if al == 0:
        return 100.0
    return round(100 - (100 / (1 + ag / al)), 2)


def macd(
    prices: list[float],
    fast: int = 12,
    slow: int = 26,
    signal_period: int = 9,
) -> dict[str, Optional[float]]:
    """MACD — Moving Average Convergence Divergence."""
    empty = {"macd_line": None, "signal_line": None, "histogram": None}
    if len(prices) < slow:
        return empty

    fast_s = ema_series(prices, fast)
    slow_s = ema_series(prices, slow)

    offset = slow - fast
    if offset >= len(fast_s):
        return empty

    macd_s = [fast_s[i + offset] - slow_s[i] for i in range(len(slow_s))]
    if not macd_s:
        return empty

    macd_val = round(macd_s[-1], 4)
    signal_val = None
    hist_val = None

    if len(macd_s) >= signal_period:
        k = 2 / (signal_period + 1)
        sig = sum(macd_s[:signal_period]) / signal_period
        for m in macd_s[signal_period:]:
            sig = m * k + sig * (1 - k)
        signal_val = round(sig, 4)
        hist_val = round(macd_val - signal_val, 4)

    return {"macd_line": macd_val, "signal_line": signal_val, "histogram": hist_val}


# ─────────────────────────────────────────────
# VOLATILITÉ
# ─────────────────────────────────────────────

def atr(
    highs: list[float],
    lows: list[float],
    closes: list[float],
    period: int = 14,
) -> Optional[float]:
    """
    ATR — Average True Range (Wilder).
    True Range = max(H-L, |H-Cprev|, |L-Cprev|)
    """
    if len(closes) < period + 1:
        return None
    trs = []
    for i in range(1, len(closes)):
        h, l, cp = highs[i], lows[i], closes[i - 1]
        trs.append(max(h - l, abs(h - cp), abs(l - cp)))
    val = sum(trs[:period]) / period
    for tr in trs[period:]:
        val = (val * (period - 1) + tr) / period
    return round(val, 5)


def bollinger_bands(
    prices: list[float], period: int = 20, std_dev: float = 2.0
) -> dict[str, Optional[float]]:
    """Bandes de Bollinger."""
    if len(prices) < period:
        return {"upper": None, "middle": None, "lower": None}
    window = prices[-period:]
    mid = sum(window) / period
    std = (sum((p - mid) ** 2 for p in window) / period) ** 0.5
    return {
        "upper": round(mid + std_dev * std, 4),
        "middle": round(mid, 4),
        "lower": round(mid - std_dev * std, 4),
    }


def volatility_regime(
    highs: list[float],
    lows: list[float],
    closes: list[float],
    period: int = 14,
) -> dict:
    """
    Classe le marché :
      calm     → ATR% < 0.05%
      normal   → ATR% < 0.20%
      unstable → ATR% >= 0.20%
    """
    atr_val = atr(highs, lows, closes, period)
    if atr_val is None or not closes:
        return {"regime": "unknown", "label": "Données insuffisantes", "atr_pct": None}
    atr_pct = (atr_val / closes[-1]) * 100
    if atr_pct < 0.05:
        return {"regime": "calm",     "label": "Calme",       "atr_pct": round(atr_pct, 4)}
    elif atr_pct < 0.20:
        return {"regime": "normal",   "label": "Normal",      "atr_pct": round(atr_pct, 4)}
    else:
        return {"regime": "unstable", "label": "Instable ⚠",  "atr_pct": round(atr_pct, 4)}


# ─────────────────────────────────────────────
# NIVEAUX
# ─────────────────────────────────────────────

def support_resistance(
    highs: list[float],
    lows: list[float],
    window: int = 30,
) -> dict[str, Optional[float]]:
    """Support / Résistance sur la fenêtre récente."""
    if not highs or not lows:
        return {"support": None, "resistance": None}
    w = min(window, len(highs))
    return {
        "support":    round(min(lows[-w:]), 4),
        "resistance": round(max(highs[-w:]), 4),
    }


# ─────────────────────────────────────────────
# TENDANCE
# ─────────────────────────────────────────────

def trend_strength(ema20: Optional[float], ema50: Optional[float]) -> dict:
    """Tendance basée sur le croisement EMA20/EMA50."""
    if ema20 is None or ema50 is None:
        return {"trend": "neutral", "label": "Neutre", "strength": 0}
    diff_pct = ((ema20 - ema50) / ema50) * 100
    if diff_pct > 0.05:
        return {"trend": "up",      "label": "Haussière", "strength": min(int(abs(diff_pct) * 40), 100)}
    elif diff_pct < -0.05:
        return {"trend": "down",    "label": "Baissière", "strength": min(int(abs(diff_pct) * 40), 100)}
    else:
        return {"trend": "neutral", "label": "Neutre",    "strength": 0}


# ─────────────────────────────────────────────
# FAIR VALUE GAP (FVG) — Smart Money Concept
# ─────────────────────────────────────────────

from dataclasses import dataclass


@dataclass
class FVG:
    """
    Fair Value Gap — zone d'imbalance entre 3 bougies.
    Le marché tend à revenir combler cette zone avant de reprendre.
    """
    direction: str     # "bullish" | "bearish"
    top: float         # borne haute de la zone
    bottom: float      # borne basse de la zone
    midpoint: float    # centre de la zone (niveau d'entrée optimal)
    candle_index: int  # index de la bougie centrale (dans la liste)
    size: float        # taille de la zone en prix
    filled: bool       # True si le prix est déjà passé dans la zone
    strength: str      # "strong" | "medium" | "weak" (selon taille vs ATR)

    def to_dict(self) -> dict:
        return {
            "direction": self.direction,
            "top": round(self.top, 4),
            "bottom": round(self.bottom, 4),
            "midpoint": round(self.midpoint, 4),
            "size": round(self.size, 4),
            "filled": self.filled,
            "strength": self.strength,
        }


def detect_fvg(
    highs: list[float],
    lows: list[float],
    closes: list[float],
    current_price: float,
    atr_val: Optional[float] = None,
    max_fvg: int = 5,
    lookback: int = 50,
) -> list[FVG]:
    """
    Détecte les Fair Value Gaps réels et non comblés.

    Règles strictes :
      FVG haussier : low[i] > high[i-2]  ET  la bougie centrale [i-1] ne comble pas le gap
      FVG baissier : high[i] < low[i-2]  ET  la bougie centrale [i-1] ne comble pas le gap

    Un FVG est considéré comblé si une bougie post-formation (j > i)
    a son range [low[j], high[j]] qui chevauche la zone [bottom, top].

    Seuls les FVG de force "strong" ou "medium" sont retournés (taille >= 0.2×ATR).
    """
    n = len(closes)
    if n < 3:
        return []

    # Taille minimale : 0.2×ATR ou 0.01% du prix si ATR absent
    min_size = (atr_val * 0.2) if (atr_val and atr_val > 0) else (current_price * 0.0001)

    fvgs: list[FVG] = []
    start = max(2, n - lookback)

    for i in range(start, n):
        h_prev2 = highs[i - 2]
        l_prev2 = lows[i - 2]
        h_mid   = highs[i - 1]   # bougie centrale
        l_mid   = lows[i - 1]
        h_curr  = highs[i]
        l_curr  = lows[i]

        # ── FVG Haussier : low[i] > high[i-2] ──
        if l_curr > h_prev2:
            top    = l_curr
            bottom = h_prev2
            size   = top - bottom
            if size < min_size:
                continue
            # La bougie centrale ne doit pas avoir comblé le gap
            if l_mid <= bottom or h_mid >= top:
                continue
            # Vérifier que les bougies suivantes n'ont pas comblé la zone
            filled = False
            for j in range(i + 1, n):
                if lows[j] <= top and highs[j] >= bottom:
                    filled = True
                    break
            # Vérifier aussi avec le prix actuel
            if not filled and (bottom <= current_price <= top):
                filled = True
            if filled:
                continue
            mid = (top + bottom) / 2
            ratio = size / atr_val if (atr_val and atr_val > 0) else 0.3
            strength = "strong" if ratio > 0.5 else "medium"
            fvgs.append(FVG(
                direction="bullish",
                top=top, bottom=bottom, midpoint=mid,
                candle_index=i, size=size,
                filled=False, strength=strength,
            ))

        # ── FVG Baissier : high[i] < low[i-2] ──
        elif h_curr < l_prev2:
            top    = l_prev2
            bottom = h_curr
            size   = top - bottom
            if size < min_size:
                continue
            # La bougie centrale ne doit pas avoir comblé le gap
            if h_mid >= top or l_mid <= bottom:
                continue
            # Vérifier que les bougies suivantes n'ont pas comblé la zone
            filled = False
            for j in range(i + 1, n):
                if lows[j] <= top and highs[j] >= bottom:
                    filled = True
                    break
            if not filled and (bottom <= current_price <= top):
                filled = True
            if filled:
                continue
            mid = (top + bottom) / 2
            ratio = size / atr_val if (atr_val and atr_val > 0) else 0.3
            strength = "strong" if ratio > 0.5 else "medium"
            fvgs.append(FVG(
                direction="bearish",
                top=top, bottom=bottom, midpoint=mid,
                candle_index=i, size=size,
                filled=False, strength=strength,
            ))

    # Trier par proximité du prix actuel, garder les N plus proches
    fvgs.sort(key=lambda f: abs(f.midpoint - current_price))
    return fvgs[:max_fvg]


def nearest_fvg(
    fvgs: list[FVG],
    current_price: float,
    direction: str,  # "bullish" cherche FVG sous le prix, "bearish" au-dessus
) -> Optional[FVG]:
    """
    Retourne le FVG le plus proche dans la direction attendue.
    - Pour un signal BUY : cherche un FVG bullish sous le prix (zone de rebond)
    - Pour un signal SELL : cherche un FVG bearish au-dessus du prix
    """
    candidates = []
    for f in fvgs:
        if direction == "bullish" and f.direction == "bullish" and f.top < current_price:
            candidates.append(f)
        elif direction == "bearish" and f.direction == "bearish" and f.bottom > current_price:
            candidates.append(f)
    if not candidates:
        return None
    return min(candidates, key=lambda f: abs(f.midpoint - current_price))


# ─────────────────────────────────────────────
# GESTION DU RISQUE
# ─────────────────────────────────────────────

def recommended_stake(
    base_amount: float,
    signal_type: str,
    confidence: int,
    regime: str,
    mtf_alignment: int,  # 0-4 : nombre de TF alignés
) -> dict:
    """
    Calcule la mise recommandée.

    Règles :
    - Marché instable → 0$ (ne pas trader)
    - Signal NEUTRAL/WAIT → 0$
    - BUY/SELL :
        Alignment 4/4 : jusqu'à 3% du capital
        Alignment 3/4 : jusqu'à 2%
        Alignment 2/4 : jusqu'à 1%
        Alignment < 2 : 0$
      × modulé par confiance (60→100% → 50→100% du plafond)
    """
    if regime == "unstable":
        return {
            "amount": 0.0,
            "pct_of_capital": 0.0,
            "reason": "🚫 Marché instable — attendre la stabilisation",
            "enter_now": False,
        }
    if signal_type in ("NEUTRAL", "WAIT"):
        return {
            "amount": 0.0,
            "pct_of_capital": 0.0,
            "reason": "⏳ Signal insuffisant — pas d'entrée recommandée",
            "enter_now": False,
        }
    if mtf_alignment < 2:
        return {
            "amount": 0.0,
            "pct_of_capital": 0.0,
            "reason": "⚠ Timeframes non alignés — risque élevé",
            "enter_now": False,
        }

    cap = {4: 3.0, 3: 2.0, 2: 1.0}.get(mtf_alignment, 0.0)
    conf_ratio = max(0.0, min(1.0, (confidence - 60) / 40))
    pct = round(cap * (0.5 + 0.5 * conf_ratio), 2)
    amount = round(max(0.35, base_amount * pct / 100), 2)

    align_label = f"{mtf_alignment}/4 timeframes alignés"
    return {
        "amount": amount,
        "pct_of_capital": pct,
        "reason": f"✅ {align_label} · Confiance {confidence}% · Mise suggérée : {amount:.2f}$",
        "enter_now": True,
    }
