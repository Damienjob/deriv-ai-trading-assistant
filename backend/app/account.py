"""
Module de gestion du compte Deriv.
Utilise une connexion WebSocket DÉDIÉE, séparée du flux de données marché.

Récupère :
  - Informations du compte (loginid, solde, devise, type)
  - Positions ouvertes (portfolio)
  - Historique des transactions (statement)
"""

import asyncio
import json
import logging
import time
from dataclasses import dataclass, field
from typing import Optional

import websockets

from app.config import settings

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
# Structures de données
# ─────────────────────────────────────────────

@dataclass
class AccountInfo:
    loginid: str
    email: str
    fullname: str
    balance: float
    currency: str
    account_type: str
    is_virtual: bool
    landing_company: str
    country: str
    last_updated: float = field(default_factory=time.time)

    def to_dict(self) -> dict:
        return {
            "loginid": self.loginid,
            "email": self.email,
            "fullname": self.fullname,
            "balance": self.balance,
            "currency": self.currency,
            "account_type": self.account_type,
            "is_virtual": self.is_virtual,
            "landing_company": self.landing_company,
            "country": self.country,
            "last_updated": self.last_updated,
        }


@dataclass
class OpenPosition:
    contract_id: str
    contract_type: str
    symbol: str
    buy_price: float
    current_value: float
    profit_loss: float
    profit_loss_pct: float
    entry_spot: float
    current_spot: float
    date_start: int
    expiry_time: Optional[int]
    status: str
    longcode: str
    payout: float

    def to_dict(self) -> dict:
        return {
            "contract_id": self.contract_id,
            "contract_type": self.contract_type,
            "symbol": self.symbol,
            "buy_price": self.buy_price,
            "current_value": self.current_value,
            "profit_loss": round(self.profit_loss, 2),
            "profit_loss_pct": round(self.profit_loss_pct, 2),
            "entry_spot": self.entry_spot,
            "current_spot": self.current_spot,
            "date_start": self.date_start,
            "expiry_time": self.expiry_time,
            "status": self.status,
            "duration": self.longcode,
            "payout": self.payout,
        }


@dataclass
class Transaction:
    transaction_id: str
    action: str
    amount: float
    balance_after: float
    contract_id: Optional[str]
    symbol: str
    timestamp: int

    def to_dict(self) -> dict:
        return {
            "transaction_id": self.transaction_id,
            "action": self.action,
            "amount": self.amount,
            "balance_after": self.balance_after,
            "contract_id": self.contract_id,
            "symbol": self.symbol,
            "timestamp": self.timestamp,
        }


# ─────────────────────────────────────────────
# Connexion dédiée (ouvrir / requête / fermer)
# ─────────────────────────────────────────────

async def _ws_request(payload: dict, expected_type: str, timeout: float = 8.0) -> Optional[dict]:
    """
    Ouvre une connexion WebSocket dédiée, envoie une requête,
    attend la réponse attendue, puis ferme.
    Évite tout conflit avec la connexion de flux de données.
    """
    if not settings.deriv_api_token:
        return None

    url = f"{settings.deriv_ws_url}?app_id={settings.deriv_app_id}"
    try:
        async with websockets.connect(url, ping_interval=None) as ws:
            # 1. Autorisation
            await ws.send(json.dumps({"authorize": settings.deriv_api_token}))
            auth_raw = await asyncio.wait_for(ws.recv(), timeout=timeout)
            auth_msg = json.loads(auth_raw)

            if auth_msg.get("msg_type") != "authorize":
                err = auth_msg.get("error", {}).get("message", "Autorisation échouée")
                logger.error(f"Autorisation échouée : {err}")
                return None

            # 2. Requête principale
            await ws.send(json.dumps(payload))

            # 3. Attendre la réponse du bon type
            for _ in range(20):
                raw = await asyncio.wait_for(ws.recv(), timeout=timeout)
                msg = json.loads(raw)
                if msg.get("msg_type") == expected_type:
                    return msg
                if msg.get("error"):
                    logger.error(f"Erreur API {expected_type} : {msg['error']}")
                    return None

    except asyncio.TimeoutError:
        logger.warning(f"Timeout sur requête {expected_type}")
    except Exception as e:
        logger.error(f"Erreur _ws_request({expected_type}) : {e}")
    return None


# ─────────────────────────────────────────────
# Gestionnaire de compte
# ─────────────────────────────────────────────

class AccountManager:
    def __init__(self):
        self.info: Optional[AccountInfo] = None
        self.open_positions: list[OpenPosition] = []
        self.transactions: list[Transaction] = []
        self._authorized: bool = False
        self._error: Optional[str] = None

    async def connect_and_authorize(self) -> bool:
        """Vérifie que le token fonctionne."""
        if not settings.deriv_api_token:
            self._error = "DERIV_API_TOKEN non configuré dans .env"
            return False
        # Test rapide d'autorisation
        msg = await _ws_request({"ping": 1}, "ping")
        if msg is not None:
            self._authorized = True
            self._error = None
            return True
        self._error = "Token invalide ou connexion impossible"
        return False

    async def fetch_account_info(self) -> Optional[AccountInfo]:
        """Récupère les informations du compte via authorize."""
        if not settings.deriv_api_token:
            return None

        url = f"{settings.deriv_ws_url}?app_id={settings.deriv_app_id}"
        try:
            async with websockets.connect(url, ping_interval=None) as ws:
                await ws.send(json.dumps({"authorize": settings.deriv_api_token}))
                raw = await asyncio.wait_for(ws.recv(), timeout=8.0)
                msg = json.loads(raw)

                if msg.get("msg_type") != "authorize":
                    self._error = msg.get("error", {}).get("message", "Autorisation échouée")
                    logger.error(self._error)
                    return None

                auth = msg.get("authorize", {})

                # Récupérer le solde
                await ws.send(json.dumps({"balance": 1}))
                balance_msg = None
                for _ in range(5):
                    raw2 = await asyncio.wait_for(ws.recv(), timeout=5.0)
                    m2 = json.loads(raw2)
                    if m2.get("msg_type") == "balance":
                        balance_msg = m2.get("balance", {})
                        break

                balance = float(balance_msg.get("balance", 0)) if balance_msg else float(auth.get("balance", 0))
                currency = balance_msg.get("currency", auth.get("currency", "USD")) if balance_msg else auth.get("currency", "USD")

                self.info = AccountInfo(
                    loginid=auth.get("loginid", ""),
                    email=auth.get("email", ""),
                    fullname=auth.get("fullname", ""),
                    balance=balance,
                    currency=currency,
                    account_type="virtual" if auth.get("is_virtual") else "real",
                    is_virtual=bool(auth.get("is_virtual", False)),
                    landing_company=auth.get("landing_company_fullname", ""),
                    country=auth.get("country", ""),
                )
                self._authorized = True
                logger.info(f"Compte : {self.info.loginid} | {self.info.balance} {self.info.currency}")
                return self.info

        except Exception as e:
            self._error = str(e)
            logger.error(f"Erreur fetch_account_info : {e}")
            return None

    async def fetch_open_positions(self) -> list[OpenPosition]:
        """Récupère les positions ouvertes via portfolio."""
        msg = await _ws_request({"portfolio": 1}, "portfolio")
        if not msg:
            return []

        contracts = msg.get("portfolio", {}).get("contracts", [])
        self.open_positions = []
        for c in contracts:
            buy_price = float(c.get("buy_price", 0))
            bid_price = float(c.get("bid_price", 0) or 0)
            pl = bid_price - buy_price
            pl_pct = (pl / buy_price * 100) if buy_price else 0

            self.open_positions.append(OpenPosition(
                contract_id=str(c.get("contract_id", "")),
                contract_type=c.get("contract_type", ""),
                symbol=c.get("underlying", ""),
                buy_price=buy_price,
                current_value=bid_price,
                profit_loss=pl,
                profit_loss_pct=pl_pct,
                entry_spot=float(c.get("entry_spot", 0) or 0),
                current_spot=float(c.get("current_spot", 0) or 0),
                date_start=int(c.get("date_start", 0)),
                expiry_time=c.get("date_expiry"),
                status="open",
                longcode=str(c.get("longcode", "")),
                payout=float(c.get("payout", 0) or 0),
            ))

        logger.info(f"Positions ouvertes : {len(self.open_positions)}")
        return self.open_positions

    async def fetch_transactions(self, limit: int = 20) -> list[Transaction]:
        """Récupère l'historique via statement."""
        msg = await _ws_request(
            {"statement": 1, "limit": limit},
            "statement"
        )
        if not msg:
            return []

        txs = msg.get("statement", {}).get("transactions", [])
        self.transactions = [
            Transaction(
                transaction_id=str(t.get("transaction_id", "")),
                action=t.get("action_type", ""),
                amount=float(t.get("amount", 0)),
                balance_after=float(t.get("balance_after", 0)),
                contract_id=str(t.get("contract_id")) if t.get("contract_id") else None,
                symbol=t.get("shortcode", ""),
                timestamp=int(t.get("transaction_time", 0)),
            )
            for t in txs
        ]
        return self.transactions

    def get_status(self) -> dict:
        return {
            "connected": self._authorized,
            "authenticated": self._authorized,
            "error": self._error,
            "has_account": self.info is not None,
            "token_configured": bool(settings.deriv_api_token),
        }


# Instance globale
account_manager = AccountManager()
