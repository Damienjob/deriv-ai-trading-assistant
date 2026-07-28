"""
Routes WebSocket et REST pour les données de marché.
WebSocket envoie : ticks + analyse + bougies OHLC par timeframe.
"""

import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.candle_store import TIMEFRAMES, candle_store
from app.connection_manager import manager
from app.tick_store import tick_store

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/market", tags=["market"])

# Cache du dernier snapshot — évite de reconstruire à chaque connexion
_snapshot_cache: dict = {}


@router.websocket("/ws")
async def websocket_market(websocket: WebSocket):
    """
    WebSocket endpoint pour le frontend.
    Envoie snapshot + tick initial dès la connexion.
    """
    await manager.connect(websocket)

    try:
        # 1. Snapshot bougies
        snapshot = _snapshot_cache if _snapshot_cache else _build_candles_snapshot()
        if snapshot:
            await websocket.send_json({"type": "candles_snapshot", "data": snapshot})
            logger.info(f"Snapshot envoyé au client ({len(snapshot)} TF)")
        else:
            logger.info("Snapshot vide — client recevra le broadcast quand prêt")

        # 2. Tick initial — débloque "Collecte des données marché" immédiatement
        last = tick_store.last
        if last and last.price > 0:
            await websocket.send_json({
                "type": "tick",
                "symbol": last.symbol,
                "price": last.price,
                "timestamp": last.timestamp,
            })
            logger.info(f"Tick initial envoyé : {last.symbol} @ {last.price}")

    except Exception as e:
        logger.warning(f"Envoi initial échoué : {e}")

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"Erreur WebSocket inattendue : {e}")
        manager.disconnect(websocket)


def _build_candles_snapshot() -> dict:
    """
    Construit le snapshot complet des bougies pour tous les TF.
    Met à jour le cache global au passage.
    """
    global _snapshot_cache
    snapshot = {}
    for gran, label in TIMEFRAMES.items():
        candles = candle_store.get_candles(gran)
        if candles:
            snapshot[label] = [
                {
                    "time": c.timestamp,
                    "open":  round(c.open,  4),
                    "high":  round(c.high,  4),
                    "low":   round(c.low,   4),
                    "close": round(c.close, 4),
                }
                for c in candles
            ]
    if snapshot:
        _snapshot_cache = snapshot
    return snapshot


def build_candle_update(granularity: int) -> dict | None:
    """
    Construit une mise à jour de la dernière bougie pour un TF donné.
    Appelé à chaque tick pour mettre à jour la bougie en cours.
    """
    label = TIMEFRAMES.get(granularity)
    if not label:
        return None
    candle = candle_store.last_candle(granularity)
    if not candle:
        return None
    return {
        "type": "candle_update",
        "timeframe": label,
        "granularity": granularity,
        "candle": {
            "time":  candle.timestamp,
            "open":  round(candle.open,  4),
            "high":  round(candle.high,  4),
            "low":   round(candle.low,   4),
            "close": round(candle.close, 4),
        },
    }


@router.get("/last-tick")
async def get_last_tick():
    """Retourne le dernier tick reçu."""
    tick = tick_store.last
    if not tick:
        return {"status": "no_data"}
    return tick_store.to_dict(tick)


@router.get("/ticks")
async def get_ticks(limit: int = 50):
    """Retourne les derniers N ticks."""
    ticks = tick_store.all[-limit:]
    return [tick_store.to_dict(t) for t in ticks]


@router.get("/candles/{timeframe}")
async def get_candles(timeframe: str, limit: int = 200):
    """
    Retourne les bougies OHLC d'un timeframe.
    timeframe : '1min' | '5min' | '15min' | '1h'
    """
    # Trouver la granularité correspondante
    gran_map = {v: k for k, v in TIMEFRAMES.items()}
    gran = gran_map.get(timeframe)
    if gran is None:
        return {"error": f"Timeframe inconnu : {timeframe}. Disponibles : {list(gran_map.keys())}"}

    candles = candle_store.get_candles(gran)[-limit:]
    return {
        "timeframe": timeframe,
        "granularity": gran,
        "count": len(candles),
        "candles": [
            {
                "time":  c.timestamp,
                "open":  round(c.open,  4),
                "high":  round(c.high,  4),
                "low":   round(c.low,   4),
                "close": round(c.close, 4),
            }
            for c in candles
        ],
    }


@router.get("/candles")
async def get_all_candles():
    """Retourne les bougies de tous les timeframes."""
    return _build_candles_snapshot()
