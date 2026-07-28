"""
Étape 4 du flux : Confirmation structurelle.

Règle professionnelle :
  Un signal n'est confirmé que si les conditions restent vraies
  sur N bougies consécutives (pas juste sur la dernière).

Profils disponibles :
  "trend_following"   — EMA/MACD/RSI + filtre ADX (par défaut)
  "mean_reversion"    — RSI survente/surachat + Bandes de Bollinger
  "smart_money"       — FVG + structure de marché (BOS)

Sévérité (n_candles) :
  1 = Mode Agressif    (scalping, entrées rapides)
  2 = Mode Équilibré   (compromis signal/sécurité)
  3 = Mode Conservateur (par défaut, moins de faux signaux)

Invalidation :
  Conditions qui annulent immédiatement un signal actif (tick par tick).

Filtre ADX :
  Bloque les signaux si ADX < adx_threshold (marché en range).
  Par défaut : adx_threshold=20. Mettre à None pour désactiver.
"""

from dataclasses import dataclass, field
from typing import Literal, Optional

from app.analysis.indicators import adx as calc_adx
from app.analysis.indicators import bollinger_bands, ema, macd, rsi


# ─────────────────────────────────────────────
# Types
# ─────────────────────────────────────────────

ConfirmationProfile = Literal["trend_following", "mean_reversion", "smart_money"]
SeverityMode = Literal["aggressive", "balanced", "conservative"]

_SEVERITY_CANDLES: dict[str, int] = {
    "aggressive":   1,
    "balanced":     2,
    "conservative": 3,
}


@dataclass
class ConfirmationResult:
    confirmed: bool
    direction: str            # "BUY" | "SELL" | "NEUTRAL"
    score: int                # 0-100 (% des conditions confirmées)
    profile: str              # profil utilisé
    conditions_ok: list[str]
    conditions_failed: list[str]
    consecutive_candles: int  # combien de bougies consécutives confirment
    adx_value: Optional[float] = None   # ADX au moment de la confirmation
    adx_blocked: bool = False           # True si bloqué par le filtre ADX

    def to_dict(self) -> dict:
        return {
            "confirmed":          self.confirmed,
            "direction":          self.direction,
            "score":              self.score,
            "profile":            self.profile,
            "conditions_ok":      self.conditions_ok,
            "conditions_failed":  self.conditions_failed,
            "consecutive_candles": self.consecutive_candles,
            "adx_value":          self.adx_value,
            "adx_blocked":        self.adx_blocked,
        }


@dataclass
class InvalidationResult:
    invalidated: bool
    reason: str
    invalidation_price: Optional[float]

    def to_dict(self) -> dict:
        return {
            "invalidated":        self.invalidated,
            "reason":             self.reason,
            "invalidation_price": self.invalidation_price,
        }


# ─────────────────────────────────────────────
# Helpers internes
# ─────────────────────────────────────────────

def _not_confirmed(
    direction: str,
    profile: str,
    reason: str,
    adx_value: Optional[float] = None,
    adx_blocked: bool = False,
) -> ConfirmationResult:
    return ConfirmationResult(
        confirmed=False, direction=direction, score=0, profile=profile,
        conditions_ok=[], conditions_failed=[reason],
        consecutive_candles=0, adx_value=adx_value, adx_blocked=adx_blocked,
    )


# ─────────────────────────────────────────────
# Profil 1 : Trend Following (EMA + MACD + RSI)
# ─────────────────────────────────────────────

def _confirm_trend_following(
    closes: list[float],
    highs: list[float],
    lows: list[float],
    direction: str,
    n_candles: int,
    adx_threshold: Optional[float],
) -> ConfirmationResult:
    """
    Confirmation basée sur EMA + RSI + MACD.

    Amélioration anti-redondance :
      - EMA20/EMA50 : filtre de tendance (lagging)
      - RSI          : momentum (semi-leading)
      - MACD histogramme : accélération (lagging mais différent des EMA)
      - ADX          : filtre de force de tendance (NOUVEAU — évite les ranges)

    Le filtre "Prix > EMA20" est retiré car trop corrélé avec EMA20 > EMA50.
    Il est remplacé par le filtre ADX qui est ORTHOGONAL aux EMA/MACD.
    """
    profile = "trend_following"
    ok: list[str] = []
    failed: list[str] = []

    min_len = n_candles + 26  # 26 pour MACD slow
    if len(closes) < min_len:
        return _not_confirmed(direction, profile, "Données insuffisantes pour confirmation")

    # ── Filtre ADX (sur toute la série — orthogonal aux EMA) ──
    adx_result = calc_adx(highs, lows, closes, period=14)
    adx_val = adx_result.get("adx")
    plus_di  = adx_result.get("plus_di")
    minus_di = adx_result.get("minus_di")

    if adx_threshold is not None and adx_val is not None:
        if adx_val < adx_threshold:
            return _not_confirmed(
                direction, profile,
                f"🚫 ADX {adx_val:.1f} < {adx_threshold} — marché en range, EMA/MACD non fiables",
                adx_value=adx_val, adx_blocked=True,
            )
        ok.append(f"ADX {adx_val:.1f} ≥ {adx_threshold} — tendance confirmée ✓")
    elif adx_val is not None:
        ok.append(f"ADX {adx_val:.1f} (filtre désactivé)")

    # ── Vérification sur N bougies consécutives ──
    total_conditions = 0
    passed_conditions = 0
    consecutive = 0

    for i in range(n_candles):
        idx = len(closes) - i
        sub_closes = closes[:idx]
        if len(sub_closes) < 27:
            break

        e20  = ema(sub_closes, 20)
        e50  = ema(sub_closes, 50)
        r14  = rsi(sub_closes, 14)
        m    = macd(sub_closes)
        candle_ok = True

        if direction == "BUY":
            # Condition 1 : Tendance EMA
            if e20 and e50 and e20 > e50:
                if i == 0: ok.append(f"EMA20 > EMA50 ({e20:.2f} > {e50:.2f})")
            else:
                candle_ok = False
                if i == 0: failed.append(f"EMA20 ≤ EMA50 ({e20:.2f} ≤ {e50:.2f})")

            # Condition 2 : RSI en zone favorable (seuil abaissé à 45 car EMA déjà haussière)
            if r14 and r14 > 45:
                if i == 0: ok.append(f"RSI {r14:.1f} > 45 — momentum haussier")
            else:
                candle_ok = False
                if i == 0:
                    r_str = f"{r14:.1f}" if r14 else "N/A"
                    failed.append(f"RSI {r_str} ≤ 45 — momentum insuffisant")

            # Condition 3 : MACD histogramme > 0 (accélération, ORTHOGONAL aux EMA)
            if m["histogram"] and m["histogram"] > 0:
                if i == 0: ok.append(f"MACD histogram {m['histogram']:.4f} > 0 — accélération")
            else:
                candle_ok = False
                if i == 0:
                    h_str = f"{m['histogram']:.4f}" if m["histogram"] else "N/A"
                    failed.append(f"MACD histogram {h_str} ≤ 0")

            # Condition 4 : +DI > -DI (ADX directionnel — confirme le sens BUY)
            if plus_di is not None and minus_di is not None:
                if plus_di > minus_di:
                    if i == 0: ok.append(f"+DI {plus_di:.1f} > -DI {minus_di:.1f} — pression acheteuse")
                else:
                    candle_ok = False
                    if i == 0: failed.append(f"+DI {plus_di:.1f} ≤ -DI {minus_di:.1f} — pression vendeuse")

        else:  # SELL
            if e20 and e50 and e20 < e50:
                if i == 0: ok.append(f"EMA20 < EMA50 ({e20:.2f} < {e50:.2f})")
            else:
                candle_ok = False
                if i == 0: failed.append(f"EMA20 ≥ EMA50")

            if r14 and r14 < 55:
                if i == 0: ok.append(f"RSI {r14:.1f} < 55 — momentum baissier")
            else:
                candle_ok = False
                if i == 0:
                    r_str = f"{r14:.1f}" if r14 else "N/A"
                    failed.append(f"RSI {r_str} ≥ 55 — momentum insuffisant")

            if m["histogram"] and m["histogram"] < 0:
                if i == 0: ok.append(f"MACD histogram {m['histogram']:.4f} < 0 — accélération baissière")
            else:
                candle_ok = False
                if i == 0:
                    h_str = f"{m['histogram']:.4f}" if m["histogram"] else "N/A"
                    failed.append(f"MACD histogram {h_str} ≥ 0")

            if plus_di is not None and minus_di is not None:
                if minus_di > plus_di:
                    if i == 0: ok.append(f"-DI {minus_di:.1f} > +DI {plus_di:.1f} — pression vendeuse")
                else:
                    candle_ok = False
                    if i == 0: failed.append(f"-DI {minus_di:.1f} ≤ +DI {plus_di:.1f} — pression acheteuse")

        total_conditions += 4
        if candle_ok:
            passed_conditions += 4
            consecutive += 1
        else:
            break

    score = int((passed_conditions / max(total_conditions, 1)) * 100)
    confirmed = consecutive >= n_candles

    return ConfirmationResult(
        confirmed=confirmed,
        direction=direction if confirmed else "NEUTRAL",
        score=score,
        profile=profile,
        conditions_ok=ok,
        conditions_failed=failed,
        consecutive_candles=consecutive,
        adx_value=adx_val,
        adx_blocked=False,
    )


# ─────────────────────────────────────────────
# Profil 2 : Mean Reversion (RSI extrêmes + Bollinger)
# ─────────────────────────────────────────────

def _confirm_mean_reversion(
    closes: list[float],
    highs: list[float],
    lows: list[float],
    direction: str,
    n_candles: int,
    adx_threshold: Optional[float],
) -> ConfirmationResult:
    """
    Confirmation pour stratégie Mean Reversion / Scalping.

    Logique inversée : on cherche des conditions de SURACHAT/SURVENTE.
    MEILLEUR en marché sans tendance (ADX faible), donc on INVERSE le filtre ADX :
      - Si adx_threshold fourni, on accepte les signaux SEULEMENT si ADX < seuil
        (marché en range = idéal pour mean reversion)
    """
    profile = "mean_reversion"
    ok: list[str] = []
    failed: list[str] = []

    if len(closes) < n_candles + 20:
        return _not_confirmed(direction, profile, "Données insuffisantes")

    # ── Filtre ADX inversé (mean reversion fonctionne EN range) ──
    adx_result = calc_adx(highs, lows, closes, period=14)
    adx_val = adx_result.get("adx")

    if adx_threshold is not None and adx_val is not None:
        if adx_val > adx_threshold:
            return _not_confirmed(
                direction, profile,
                f"🚫 ADX {adx_val:.1f} > {adx_threshold} — tendance trop forte pour mean reversion",
                adx_value=adx_val, adx_blocked=True,
            )
        ok.append(f"ADX {adx_val:.1f} ≤ {adx_threshold} — conditions de range ✓")

    ok_count = 0
    failed_count = 0

    for i in range(n_candles):
        idx = len(closes) - i
        sub = closes[:idx]
        if len(sub) < 20:
            break

        r14 = rsi(sub, 14)
        bb  = bollinger_bands(sub, 20)
        price = sub[-1]
        candle_ok = True

        if direction == "BUY":
            # Survente RSI
            if r14 and r14 < 35:
                if i == 0: ok.append(f"RSI survendu {r14:.1f} < 35 — rebond potentiel")
            else:
                candle_ok = False
                if i == 0:
                    r_str = f"{r14:.1f}" if r14 else "N/A"
                    failed.append(f"RSI {r_str} ≥ 35 — pas en survente")

            # Prix sur/sous bande Bollinger basse
            if bb["lower"] and price <= bb["lower"] * 1.002:
                if i == 0: ok.append(f"Prix {price:.4f} ≤ BB basse {bb['lower']:.4f} — zone de rebond")
            else:
                candle_ok = False
                if i == 0:
                    bb_str = f"{bb['lower']:.4f}" if bb["lower"] else "N/A"
                    failed.append(f"Prix {price:.4f} > BB basse {bb_str} — pas en zone de rebond")

        else:  # SELL
            # Surachat RSI
            if r14 and r14 > 65:
                if i == 0: ok.append(f"RSI suracheté {r14:.1f} > 65 — retournement potentiel")
            else:
                candle_ok = False
                if i == 0:
                    r_str = f"{r14:.1f}" if r14 else "N/A"
                    failed.append(f"RSI {r_str} ≤ 65 — pas en surachat")

            if bb["upper"] and price >= bb["upper"] * 0.998:
                if i == 0: ok.append(f"Prix {price:.4f} ≥ BB haute {bb['upper']:.4f} — zone de rejet")
            else:
                candle_ok = False
                if i == 0:
                    bb_str = f"{bb['upper']:.4f}" if bb["upper"] else "N/A"
                    failed.append(f"Prix {price:.4f} < BB haute {bb_str} — pas en zone de rejet")

        ok_count    += 2 if candle_ok else 0
        failed_count += 0 if candle_ok else 2
        if not candle_ok:
            break

    total = ok_count + failed_count
    score = int((ok_count / max(total, 1)) * 100)
    consecutive = ok_count // 2
    confirmed = consecutive >= n_candles

    return ConfirmationResult(
        confirmed=confirmed,
        direction=direction if confirmed else "NEUTRAL",
        score=score,
        profile=profile,
        conditions_ok=ok,
        conditions_failed=failed,
        consecutive_candles=consecutive,
        adx_value=adx_val,
        adx_blocked=False,
    )


# ─────────────────────────────────────────────
# Profil 3 : Smart Money / ICT (FVG + BOS)
# ─────────────────────────────────────────────

def _confirm_smart_money(
    closes: list[float],
    highs: list[float],
    lows: list[float],
    direction: str,
    n_candles: int,
    adx_threshold: Optional[float],
) -> ConfirmationResult:
    """
    Confirmation Smart Money / ICT.

    Vérifie :
      - Break of Structure (BOS) : nouveau high/low de structure
      - Momentum RSI aligné avec la direction
      - ADX pour valider la force du mouvement post-BOS
    Note : les FVG sont détectés dans le moteur (indicators.detect_fvg).
    Ici on utilise les signaux de structure de prix purs.
    """
    profile = "smart_money"
    ok: list[str] = []
    failed: list[str] = []

    if len(closes) < max(n_candles + 10, 20):
        return _not_confirmed(direction, profile, "Données insuffisantes")

    # ── ADX : un BOS est plus fiable avec de la force de tendance ──
    adx_result = calc_adx(highs, lows, closes, period=14)
    adx_val  = adx_result.get("adx")
    plus_di  = adx_result.get("plus_di")
    minus_di = adx_result.get("minus_di")

    if adx_threshold is not None and adx_val is not None:
        if adx_val < adx_threshold:
            return _not_confirmed(
                direction, profile,
                f"🚫 ADX {adx_val:.1f} < {adx_threshold} — BOS peu fiable sans tendance",
                adx_value=adx_val, adx_blocked=True,
            )
        ok.append(f"ADX {adx_val:.1f} ≥ {adx_threshold} — force suffisante pour BOS ✓")

    ok_count = 0
    consecutive = 0

    for i in range(n_candles):
        idx = len(closes) - i
        sub_c = closes[:idx]
        sub_h = highs[:idx]
        sub_l = lows[:idx]
        if len(sub_c) < 10:
            break

        r14    = rsi(sub_c, 14)
        candle_ok = True

        # BOS haussier : dernier high > high des 5 bougies précédentes
        lookback = min(5, len(sub_h) - 1)
        last_h   = sub_h[-1]
        prev_highs = sub_h[-1 - lookback:-1]
        last_l   = sub_l[-1]
        prev_lows  = sub_l[-1 - lookback:-1]

        if direction == "BUY":
            # Break of Structure haussier
            if prev_highs and last_h > max(prev_highs):
                if i == 0:
                    ok.append(f"BOS haussier — high {last_h:.4f} > structure ({max(prev_highs):.4f})")
            else:
                candle_ok = False
                if i == 0:
                    ph_str = f"{max(prev_highs):.4f}" if prev_highs else "N/A"
                    failed.append(f"Pas de BOS haussier — high {last_h:.4f} ≤ structure {ph_str}")

            # RSI aligné
            if r14 and r14 > 50:
                if i == 0: ok.append(f"RSI {r14:.1f} > 50 — momentum confirme le BOS")
            else:
                candle_ok = False
                if i == 0:
                    r_str = f"{r14:.1f}" if r14 else "N/A"
                    failed.append(f"RSI {r_str} ≤ 50 — momentum ne confirme pas le BOS")

        else:  # SELL
            if prev_lows and last_l < min(prev_lows):
                if i == 0:
                    ok.append(f"BOS baissier — low {last_l:.4f} < structure ({min(prev_lows):.4f})")
            else:
                candle_ok = False
                if i == 0:
                    pl_str = f"{min(prev_lows):.4f}" if prev_lows else "N/A"
                    failed.append(f"Pas de BOS baissier — low {last_l:.4f} ≥ structure {pl_str}")

            if r14 and r14 < 50:
                if i == 0: ok.append(f"RSI {r14:.1f} < 50 — momentum confirme le BOS")
            else:
                candle_ok = False
                if i == 0:
                    r_str = f"{r14:.1f}" if r14 else "N/A"
                    failed.append(f"RSI {r_str} ≥ 50 — momentum ne confirme pas le BOS")

        ok_count += 2 if candle_ok else 0
        if candle_ok:
            consecutive += 1
        else:
            break

    total = ok_count + (n_candles * 2 - ok_count)
    score = int((ok_count / max(n_candles * 2, 1)) * 100)
    confirmed = consecutive >= n_candles

    return ConfirmationResult(
        confirmed=confirmed,
        direction=direction if confirmed else "NEUTRAL",
        score=score,
        profile=profile,
        conditions_ok=ok,
        conditions_failed=failed,
        consecutive_candles=consecutive,
        adx_value=adx_val,
        adx_blocked=False,
    )


# ─────────────────────────────────────────────
# Point d'entrée principal
# ─────────────────────────────────────────────

def check_confirmation(
    closes: list[float],
    highs: list[float],
    lows: list[float],
    direction: str,                           # "BUY" | "SELL"
    n_candles: int = 3,                       # bougies consécutives requises
    profile: ConfirmationProfile = "trend_following",
    severity: Optional[SeverityMode] = None,  # override n_candles si fourni
    adx_threshold: Optional[float] = 20.0,   # None = désactiver le filtre ADX
) -> ConfirmationResult:
    """
    Vérifie que les conditions du signal sont vraies sur N bougies consécutives.

    Paramètres configurables :
      profile       : "trend_following" | "mean_reversion" | "smart_money"
      severity      : "aggressive" (1 bougie) | "balanced" (2) | "conservative" (3)
                      Si fourni, écrase n_candles.
      adx_threshold : Seuil ADX minimum (default 20). None = pas de filtre ADX.

    Choisir le bon profil :
      - trend_following : tendances EMA/MACD, nécessite ADX ≥ 20 (évite les ranges)
      - mean_reversion  : rebonds RSI + Bollinger, idéal si ADX < 25 (marché en range)
      - smart_money     : Break of Structure (BOS) + momentum, approche ICT/SMC
    """
    if severity is not None:
        n_candles = _SEVERITY_CANDLES.get(severity, n_candles)

    if profile == "mean_reversion":
        return _confirm_mean_reversion(closes, highs, lows, direction, n_candles, adx_threshold)
    elif profile == "smart_money":
        return _confirm_smart_money(closes, highs, lows, direction, n_candles, adx_threshold)
    else:
        return _confirm_trend_following(closes, highs, lows, direction, n_candles, adx_threshold)


# ─────────────────────────────────────────────
# Invalidation dynamique (tick par tick)
# ─────────────────────────────────────────────

def check_invalidation(
    current_price: float,
    signal_direction: str,    # "BUY" | "SELL"
    entry_price: float,
    stop_loss: Optional[float],
    support: Optional[float],
    resistance: Optional[float],
    ema20: Optional[float],
    ema50: Optional[float],
    rsi14: Optional[float],
    macd_histogram: Optional[float],
    atr: Optional[float],
) -> InvalidationResult:
    """
    Vérifie tick par tick si les conditions d'invalidation sont réunies.
    Appelé à chaque tick pendant qu'un signal est verrouillé.

    Conditions d'invalidation BUY :
      - Prix casse le stop loss
      - Prix casse le support clé (- 0.5 × ATR)
      - Croisement EMA inverse confirmé (EMA20 < EMA50)
      - RSI < 32 (momentum cassé)

    Conditions d'invalidation SELL :
      - Inverse
    """
    if signal_direction == "BUY":
        if stop_loss and current_price < stop_loss:
            return InvalidationResult(
                invalidated=True,
                reason=f"🚨 Stop Loss cassé — prix {current_price:.2f} < SL {stop_loss:.2f}",
                invalidation_price=current_price,
            )
        if support and atr and current_price < support - atr * 0.5:
            return InvalidationResult(
                invalidated=True,
                reason=f"🚨 Support {support:.2f} cassé — prix {current_price:.2f}",
                invalidation_price=current_price,
            )
        if ema20 and ema50 and ema20 < ema50 * 0.9995:
            return InvalidationResult(
                invalidated=True,
                reason=f"⚠ EMA20 ({ema20:.2f}) < EMA50 ({ema50:.2f}) — tendance inversée",
                invalidation_price=current_price,
            )
        if rsi14 and rsi14 < 32:
            return InvalidationResult(
                invalidated=True,
                reason=f"⚠ RSI {rsi14:.1f} — momentum BUY cassé",
                invalidation_price=current_price,
            )

    else:  # SELL
        if stop_loss and current_price > stop_loss:
            return InvalidationResult(
                invalidated=True,
                reason=f"🚨 Stop Loss cassé — prix {current_price:.2f} > SL {stop_loss:.2f}",
                invalidation_price=current_price,
            )
        if resistance and atr and current_price > resistance + atr * 0.5:
            return InvalidationResult(
                invalidated=True,
                reason=f"🚨 Résistance {resistance:.2f} cassée — prix {current_price:.2f}",
                invalidation_price=current_price,
            )
        if ema20 and ema50 and ema20 > ema50 * 1.0005:
            return InvalidationResult(
                invalidated=True,
                reason=f"⚠ EMA20 ({ema20:.2f}) > EMA50 ({ema50:.2f}) — tendance inversée",
                invalidation_price=current_price,
            )
        if rsi14 and rsi14 > 68:
            return InvalidationResult(
                invalidated=True,
                reason=f"⚠ RSI {rsi14:.1f} — momentum SELL cassé",
                invalidation_price=current_price,
            )

    return InvalidationResult(
        invalidated=False,
        reason="Signal actif — conditions maintenues",
        invalidation_price=None,
    )
