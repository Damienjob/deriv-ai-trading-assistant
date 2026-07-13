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


@router.websocket("/ws")
async def websocket_market(websocket: WebSocket):
    """
    WebSocket endpoint pour le frontend.
    À la connexion, envoie immédiatement l'historique des bougies
    pour que le graphique s'affiche sans attendre.
    """
    await manager.connect(websocket)

    # Envoi immédiat de l'historique des bougies au client qui vient de se connecter
    try:
        candles_snapshot = _build_candles_snapshot()
        if candles_snapshot:
            await websocket.send_json({
                "type": "candles_snapshot",
                "data": candles_snapshot,
            })
    except Exception as e:
        logger.warning(f"Impossible d'envoyer le snapshot initial : {e}")

    try:
        while True:
            data = await websocket.receive_text()
            logger.debug(f"Message client reçu : {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)


def _build_candles_snapshot() -> dict:
    """
    Construit le snapshot complet des bougies pour tous les TF.
    Format compatible avec Lightweight Charts (time + open/high/low/close).
    """
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
