"""
Client WebSocket Deriv.
- Ticks temps réel
- Bougies OHLC historiques (msg_type: candles) + temps réel (msg_type: ohlc)
- Gestion robuste des deux formats Deriv
- Cast explicite string→float pour tous les champs OHLC
- Traitement via create_task pour ne pas bloquer la boucle d'écoute
"""

import asyncio
import json
import logging
from typing import Callable, Optional

import websockets
from websockets.exceptions import ConnectionClosed

from app.candle_store import TIMEFRAMES, Candle, candle_store
from app.config import settings

logger = logging.getLogger(__name__)

# Callbacks tick — set pour éviter les doublons
_tick_callbacks: list[Callable] = []
_callbacks_registered: set = set()

# Compteur de bougies reçues par TF — pour diagnostic
_candles_received: dict[int, int] = {gran: 0 for gran in TIMEFRAMES}


def on_tick(callback: Callable):
    """Enregistre un callback une seule fois (pas de doublon)."""
    if id(callback) not in _callbacks_registered:
        _tick_callbacks.append(callback)
        _callbacks_registered.add(id(callback))


def _parse_candle_history(raw: dict, granularity: int) -> Optional[Candle]:
    """
    Parse une bougie de l'historique initial (msg_type: candles).
    Champs Deriv : epoch, open, high, low, close (peuvent être strings).
    """
    try:
        epoch = raw.get("epoch")
        if epoch is None:
            logger.warning(f"Bougie sans epoch : {raw}")
            return None
        return Candle(
            timestamp=int(epoch),
            open=float(raw["open"]),
            high=float(raw["high"]),
            low=float(raw["low"]),
            close=float(raw["close"]),
            granularity=granularity,
        )
    except (KeyError, ValueError, TypeError) as e:
        logger.warning(f"Impossible de parser la bougie historique : {e} | raw={raw}")
        return None


def _parse_candle_ohlc(raw: dict) -> Optional[Candle]:
    """
    Parse une bougie en temps réel (msg_type: ohlc).
    Champs Deriv : open_time, open, high, low, close, granularity (peuvent être strings).
    """
    try:
        gran = raw.get("granularity")
        open_time = raw.get("open_time")
        if gran is None or open_time is None:
            logger.warning(f"OHLC sans granularity/open_time : {raw}")
            return None
        return Candle(
            timestamp=int(open_time),
            open=float(raw["open"]),
            high=float(raw["high"]),
            low=float(raw["low"]),
            close=float(raw["close"]),
            granularity=int(gran),
        )
    except (KeyError, ValueError, TypeError) as e:
        logger.warning(f"Impossible de parser le message ohlc : {e} | raw={raw}")
        return None


async def _process_tick(tick_data: dict):
    """Traite un tick en dehors de la boucle d'écoute principale."""
    for cb in _tick_callbacks:
        try:
            await cb(tick_data)
        except Exception as e:
            logger.error(f"Erreur callback tick : {e}")


async def _process_history_as_tick(msg: dict):
    """
    Extrait le dernier prix d'une réponse history et le traite comme un tick.
    Utilisé pour le polling — simule un flux temps réel avec app_id=1089.
    """
    history = msg.get("history", {})
    prices = history.get("prices", [])
    times  = history.get("times", [])
    symbol = msg.get("echo_req", {}).get("ticks_history", "")

    if not prices or not times:
        return

    # Dernier prix uniquement (count=1 dans le poll)
    last_price = float(prices[-1])
    last_time  = float(times[-1])

    # Formater comme un tick Deriv standard
    tick_data = {
        "symbol": symbol,
        "quote":  last_price,
        "epoch":  last_time,
        "pip_size": 0.01,
    }
    for cb in _tick_callbacks:
        try:
            await cb(tick_data)
        except Exception as e:
            logger.error(f"Erreur callback tick (poll) : {e}")


async def _process_tick_history(msg: dict):
    """
    Traite l'historique des ticks (msg_type: history).
    Injecte directement dans tick_store sans passer par les callbacks
    (les callbacks s'attendent au format tick temps réel).
    """
    from app.tick_store import Tick, tick_store
    history = msg.get("history", {})
    prices = history.get("prices", [])
    times  = history.get("times", [])
    symbol = msg.get("echo_req", {}).get("ticks_history", "")

    if not prices or not times:
        logger.warning(f"Historique ticks vide : {msg.get('echo_req', {})}")
        return

    count = min(len(prices), len(times))
    for i in range(count):
        tick = Tick(
            symbol=symbol,
            price=float(prices[i]),
            timestamp=float(times[i]),
            pip_size=0.01,
        )
        tick_store.add(tick)

    logger.info(f"[HISTORY] {count} ticks historiques chargés pour {symbol} — dernier prix: {float(prices[-1])}")


async def _process_candles_history(msg: dict):
    """Traite l'historique initial des bougies (msg_type: candles)."""
    echo = msg.get("echo_req", {})
    gran = int(echo.get("granularity", 60))
    candles_raw = msg.get("candles", [])

    if not isinstance(candles_raw, list):
        logger.error(f"Format inattendu pour 'candles' : {type(candles_raw)} | msg={msg}")
        return

    added = 0
    for raw in candles_raw:
        candle = _parse_candle_history(raw, gran)
        if candle:
            candle_store.add_candle(candle)
            added += 1

    _candles_received[gran] = _candles_received.get(gran, 0) + added
    tf_label = TIMEFRAMES.get(gran, str(gran))
    logger.info(
        f"[CANDLES] TF={tf_label} gran={gran}s : "
        f"{added}/{len(candles_raw)} bougies stockées "
        f"(total store: {candle_store.count(gran)})"
    )


async def _process_ohlc(msg: dict):
    """Traite une mise à jour de bougie en temps réel (msg_type: ohlc)."""
    ohlc_raw = msg.get("ohlc", {})
    if not isinstance(ohlc_raw, dict) or not ohlc_raw:
        logger.warning(f"Message ohlc vide ou malformé : {msg}")
        return

    candle = _parse_candle_ohlc(ohlc_raw)
    if candle:
        candle_store.add_candle(candle)


class DerivClient:
    def __init__(self):
        self.ws: Optional[websockets.WebSocketClientProtocol] = None
        self.connected = False

    async def connect(self):
        url = f"{settings.deriv_ws_url}?app_id={settings.deriv_app_id}"
        logger.info(f"Connexion à Deriv : {url}")
        self.ws = await websockets.connect(
            url,
            ping_interval=30,
            ping_timeout=10,
            max_size=2**23,  # 8MB — pour les gros snapshots de bougies
        )
        self.connected = True
        logger.info("Connecté à Deriv WebSocket")

    async def _send(self, payload: dict):
        if self.ws:
            await self.ws.send(json.dumps(payload))

    async def poll_ticks(self, symbol: str, interval: float = 1.0):
        """
        Simule un flux temps réel en interrogeant le dernier tick toutes les `interval` secondes.
        app_id=1089 ne supporte pas subscribe:1 — on poll à la place.
        """
        logger.info(f"Polling ticks {symbol} toutes les {interval}s")
        last_epoch: float = 0.0
        while self.connected:
            try:
                await self._send({
                    "ticks_history": symbol,
                    "count": 1,
                    "end": "latest",
                    "style": "ticks",
                })
            except Exception as e:
                logger.warning(f"Erreur envoi poll tick : {e}")
                break
            await asyncio.sleep(interval)

    async def fetch_tick_history(self, symbol: str, count: int = 30):
        """
        Récupère les N derniers ticks historiques.
        Permet d'avoir des données immédiatement au démarrage sans attendre
        que les ticks temps réel s'accumulent.
        """
        await self._send({
            "ticks_history": symbol,
            "adjust_start_time": 1,
            "count": count,
            "end": "latest",
            "style": "ticks",   # ticks individuels (pas candles)
        })
        logger.info(f"[FETCH] {count} ticks historiques pour {symbol}")

    async def fetch_candles(self, symbol: str, granularity: int, count: int = 200):
        """
        Récupère l'historique OHLC.
        NOTE : subscribe:1 est rejeté par app_id=1089 — on récupère juste l'historique.
        La bougie en cours est reconstruite depuis les ticks via candle_store.
        """
        if granularity not in TIMEFRAMES:
            logger.error(f"Granularité non supportée : {granularity}")
            return
        payload = {
            "ticks_history": symbol,
            "adjust_start_time": 1,
            "count": count,
            "end": "latest",
            "granularity": granularity,
            "style": "candles",
            # PAS de subscribe:1 — invalide avec app_id=1089
        }
        await self._send(payload)
        logger.info(
            f"[FETCH] {TIMEFRAMES[granularity]} ({granularity}s) "
            f"pour {symbol} — count={count}"
        )

    async def listen(self):
        """
        Boucle principale d'écoute des messages Deriv.
        Chaque type de message est dispatché via create_task pour ne pas bloquer.
        """
        if not self.ws:
            raise RuntimeError("Non connecté — appeler connect() d'abord.")
        try:
            async for raw in self.ws:
                # Log brut en DEBUG pour diagnostiquer les messages inattendus
                logger.debug(f"[RAW] {raw[:200]}")

                try:
                    msg = json.loads(raw)
                except json.JSONDecodeError as e:
                    logger.error(f"JSON invalide reçu de Deriv : {e} | raw={raw[:100]}")
                    continue

                mtype = msg.get("msg_type")

                if mtype == "tick":
                    asyncio.create_task(_process_tick(msg.get("tick", {})))

                elif mtype == "history":
                    # Réponse du poll — extraire le dernier tick
                    asyncio.create_task(_process_tick_history(msg))
                    asyncio.create_task(_process_history_as_tick(msg))

                elif mtype == "candles":
                    # Historique initial — peut être volumineux (200 bougies × 5 TF)
                    asyncio.create_task(_process_candles_history(msg))

                elif mtype == "ohlc":
                    # Mise à jour bougie en cours — arrive à chaque tick
                    asyncio.create_task(_process_ohlc(msg))

                elif mtype == "error":
                    err = msg.get("error", {})
                    logger.error(
                        f"[DERIV ERROR] code={err.get('code')} "
                        f"message={err.get('message')} | "
                        f"echo_req={msg.get('echo_req', {})}"
                    )

                elif mtype in ("ticks_history",):
                    # Deriv renvoie msg_type=ticks_history pour les erreurs sur ticks_history
                    if "error" in msg:
                        err = msg.get("error", {})
                        logger.error(
                            f"[DERIV ERROR ticks_history] code={err.get('code')} "
                            f"message={err.get('message')} | "
                            f"symbol={msg.get('echo_req', {}).get('ticks_history')} "
                            f"gran={msg.get('echo_req', {}).get('granularity')}"
                        )
                    else:
                        logger.debug(f"Message ticks_history ignoré : {str(msg)[:100]}")

                else:
                    logger.debug(f"Message ignoré : msg_type={mtype}")

        except ConnectionClosed as e:
            logger.warning(f"Connexion Deriv fermée : code={e.code} reason={e.reason}")
            self.connected = False

    async def disconnect(self):
        if self.ws:
            try:
                await self.ws.close()
            except Exception:
                pass
            self.connected = False
            logger.info("Déconnecté de Deriv")
