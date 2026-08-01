"""
Point d'entrée FastAPI.
Démarre la connexion Deriv et souscrit aux ticks + bougies 4 TF.
"""

import asyncio
import logging
import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.candle_store import TIMEFRAMES
from app.config import settings
from app.connection_manager import manager
from app.deriv_client import DerivClient, on_tick
from app.tick_store import Tick, tick_store

import colorlog

# ── Logging formaté avec couleurs ──────────────────────────────────────────────
_handler = colorlog.StreamHandler()
_handler.setFormatter(colorlog.ColoredFormatter(
    fmt="%(asctime)s %(log_color)s%(levelname)-8s%(reset)s %(cyan)s%(name)s%(reset)s  %(message)s",
    datefmt="%H:%M:%S",
    log_colors={
        "DEBUG":    "white",
        "INFO":     "bold_green",
        "WARNING":  "bold_yellow",
        "ERROR":    "bold_red",
        "CRITICAL": "bold_red,bg_white",
    },
))

logging.basicConfig(handlers=[_handler], level=logging.INFO)

# Niveau DEBUG uniquement sur le client Deriv
logging.getLogger("app.deriv_client").setLevel(logging.DEBUG)

# Réduire le bruit des libs tierces
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
logging.getLogger("uvicorn.error").setLevel(logging.WARNING)
logging.getLogger("watchfiles").setLevel(logging.WARNING)
logging.getLogger("websockets").setLevel(logging.WARNING)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Deriv AI Trading Assistant",
    description="Backend MTF connecté à Deriv",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_origin_regex=settings.allowed_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.routers import market
app.include_router(market.router)

from app.routers import account as account_router
app.include_router(account_router.router)

deriv_client = DerivClient()

# État utilisateur (modifiable via API)
_base_amount: float = 100.0
_current_symbol: str = "1HZ50V"


async def on_tick_received(tick_data: dict):
    """Callback tick temps réel → analyse MTF → broadcast."""
    try:
        from app.analysis.engine import analyze
        from app.routers.market import build_candle_update

        tick_symbol = tick_data.get("symbol", _current_symbol)

        # Ignorer les ticks d'un ancien symbole après un changement d'actif
        if tick_symbol != _current_symbol:
            return

        tick = Tick(
            symbol=tick_symbol,
            price=float(tick_data.get("quote", 0)),
            timestamp=float(tick_data.get("epoch", time.time())),
            pip_size=float(tick_data.get("pip_size", 0.01)),
        )
        if tick.price == 0:
            return

        # Ignorer seulement si epoch ET prix identiques (vrai doublon)
        last = tick_store.last
        if last and last.timestamp == tick.timestamp and last.price == tick.price:
            return

        tick_store.add(tick)

        result = analyze(symbol=tick.symbol, base_amount=_base_amount)

        message: dict = {
            "type": "tick",
            "symbol": tick.symbol,
            "price": tick.price,
            "timestamp": tick.timestamp,
        }
        if result:
            message["analysis"] = result.to_dict()

        await manager.broadcast(message)

        # Broadcast mise à jour bougie en cours (dernière bougie de chaque TF)
        for gran in TIMEFRAMES:
            candle_msg = build_candle_update(gran)
            if candle_msg:
                await manager.broadcast(candle_msg)

    except Exception as e:
        logger.error(f"Erreur on_tick_received : {e}", exc_info=True)


async def _connect_account(mgr):
    """Connexion compte avec retry."""
    for attempt in range(3):
        ok = await mgr.connect_and_authorize()
        if ok:
            await mgr.fetch_account_info()
            logger.info(f"Compte connecté : {mgr.info.loginid if mgr.info else 'N/A'}")
            return
        logger.warning(f"Tentative {attempt+1}/3 échouée — retry dans 5s")
        await asyncio.sleep(5)
    logger.error("Impossible de connecter le compte après 3 tentatives")


async def _broadcast_snapshot_when_ready():
    from app.routers.market import _build_candles_snapshot
    from app.analysis.engine import analyze

    # Les 3 TF essentiels suffisent pour démarrer (1min, 5min, 15min)
    # 30min et 1h arrivent après — on ne bloque pas le frontend pour eux
    REQUIRED_TF = {60, 300, 900}  # 1min, 5min, 15min

    for _ in range(120):  # max 60s
        await asyncio.sleep(0.5)
        snapshot = _build_candles_snapshot()
        loaded_grans = {g for g, label in TIMEFRAMES.items() if label in snapshot}
        if REQUIRED_TF.issubset(loaded_grans):
            await manager.broadcast({"type": "candles_snapshot", "data": snapshot})
            logger.info(f"Snapshot bougies broadcasté ({len(snapshot)} TF)")
            last = tick_store.last
            if last:
                result = analyze(symbol=last.symbol, base_amount=_base_amount)
                msg: dict = {"type": "tick", "symbol": last.symbol, "price": last.price, "timestamp": last.timestamp}
                if result:
                    msg["analysis"] = result.to_dict()
                await manager.broadcast(msg)
                logger.info(f"Tick initial broadcasté : {last.symbol} @ {last.price}")
            return

    # Fallback : broadcast ce qu'on a
    snapshot = _build_candles_snapshot()
    if snapshot:
        await manager.broadcast({"type": "candles_snapshot", "data": snapshot})
        logger.warning(f"Snapshot partiel broadcasté ({len(snapshot)}/{len(TIMEFRAMES)} TF)")


async def run_deriv_connection():
    """Connexion Deriv avec reconnexion automatique."""
    on_tick(on_tick_received)

    while True:
        try:
            # Lire le symbole courant À CHAQUE boucle — il peut avoir changé via /settings/symbol
            symbol = _current_symbol

            await deriv_client.connect()

            # Démarrer listen() EN PREMIER dans une tâche séparée
            # pour capturer toutes les réponses dès la première souscription
            listen_task = asyncio.create_task(deriv_client.listen())

            # Petite pause pour que listen() soit bien démarré
            await asyncio.sleep(0.2)

            # Lancer le polling ticks EN PARALLÈLE de listen()
            # (subscribe:1 non supporté par app_id=1089)
            asyncio.create_task(deriv_client.poll_ticks(symbol, interval=0.5))

            # 30 ticks historiques pour démarrer l'analyse immédiatement
            await deriv_client.fetch_tick_history(symbol, count=30)
            for gran in TIMEFRAMES:
                await deriv_client.fetch_candles(symbol, gran, count=200)
                await asyncio.sleep(1.0)  # 1s entre chaque TF pour éviter le rate-limit Deriv

            # Broadcast snapshot quand les bougies sont prêtes (parallèle)
            asyncio.create_task(_broadcast_snapshot_when_ready())

            # Attendre la fin de listen() (déconnexion ou erreur)
            await listen_task

        except Exception as e:
            logger.error(f"Erreur connexion Deriv : {e}")
            deriv_client.connected = False
            logger.info("Reconnexion dans 5 secondes...")
            await asyncio.sleep(5)


async def _keep_alive():
    """Self-ping toutes les 10min pour éviter le cold start Render (plan gratuit)."""
    import httpx
    import os
    url = os.getenv("RENDER_EXTERNAL_URL", "")
    if not url:
        return  # local ou non-Render, inutile
    await asyncio.sleep(60)  # attendre que le serveur soit prêt
    while True:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                await client.get(f"{url}/health")
            logger.debug("Keep-alive ping OK")
        except Exception:
            pass
        await asyncio.sleep(600)  # 10 minutes


@app.on_event("startup")
async def startup_event():
    logger.info("Démarrage Deriv AI Trading Assistant v2")
    asyncio.create_task(run_deriv_connection())
    asyncio.create_task(_keep_alive())
    # Connexion compte si token disponible
    if settings.deriv_api_token:
        from app.account import account_manager
        asyncio.create_task(_connect_account(account_manager))
    else:
        logger.info("Pas de token API — mode données publiques uniquement")


@app.on_event("shutdown")
async def shutdown_event():
    await deriv_client.disconnect()


@app.get("/")
async def root():
    from app.candle_store import candle_store
    return {
        "status": "running",
        "deriv_connected": deriv_client.connected,
        "ticks": len(tick_store.all),
        "candles": {
            TIMEFRAMES[g]: candle_store.count(g) for g in TIMEFRAMES
        },
    }


@app.get("/health")
async def health():
    from app.candle_store import candle_store
    return {
        "status": "ok",
        "deriv_connected": deriv_client.connected,
        "clients_connected": len(manager.active_connections),
        "ticks_stored": len(tick_store.all),
        "candles": {TIMEFRAMES[g]: candle_store.count(g) for g in TIMEFRAMES},
    }


@app.get("/analysis")
async def get_analysis(amount: float = 100.0):
    """Retourne la dernière analyse MTF complète."""
    from app.analysis.engine import analyze
    result = analyze(base_amount=amount)
    if not result:
        return {"status": "no_data"}
    return result.to_dict()


@app.post("/settings/amount")
async def set_base_amount(amount: float):
    """Met à jour le montant de base de l'utilisateur."""
    global _base_amount
    if amount < 1:
        return {"error": "Montant minimum : 1$"}
    _base_amount = amount
    return {"status": "ok", "base_amount": _base_amount}


@app.get("/settings/amount")
async def get_base_amount():
    return {"base_amount": _base_amount}


@app.post("/settings/symbol")
async def set_symbol(symbol: str):
    """Change l'actif surveillé, vide les stores et force une reconnexion."""
    from app.assets import ASSETS
    from app.candle_store import candle_store
    from app.analysis.signal_lock import signal_lock
    import app.routers.market as market_module
    global _current_symbol

    if symbol not in ASSETS:
        return {"error": f"Actif inconnu : {symbol}. Disponibles : {list(ASSETS.keys())}"}

    _current_symbol = symbol

    # Vider les stores pour ne pas mélanger les données de deux actifs différents
    tick_store._ticks.clear()
    tick_store._last_tick = None

    # Réinitialiser le candle store
    for gran in TIMEFRAMES:
        candle_store._stores[gran].clear()

    # Vider le cache snapshot directement dans le module (pas une copie locale)
    market_module._snapshot_cache.clear()

    # Réinitialiser le verrou de signal
    signal_lock._locked = None
    signal_lock._tick_count = 0
    signal_lock._last_candle_epoch = 0

    # Force reconnexion — la boucle va redémarrer avec le nouveau symbole
    await deriv_client.disconnect()

    # Notifier tous les clients connectés que l'actif a changé
    # Le frontend doit vider son état local (ticks, bougies, analyse)
    await manager.broadcast({
        "type": "symbol_changed",
        "symbol": symbol,
    })

    logger.info(f"Actif changé → {symbol}")
    return {"status": "ok", "symbol": _current_symbol}


@app.get("/assets")
async def list_assets():
    """Liste tous les actifs disponibles."""
    from app.assets import ASSETS
    return {
        sym: {
            "label": a.label,
            "family": a.family,
            "description": a.description,
            "risk_profile": a.risk_profile,
        }
        for sym, a in ASSETS.items()
    }
