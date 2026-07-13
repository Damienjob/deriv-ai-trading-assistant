"""
Routes REST pour les données du compte Deriv.
Chaque endpoint ouvre sa propre connexion WebSocket dédiée.
"""

from fastapi import APIRouter, HTTPException
from app.account import account_manager

router = APIRouter(prefix="/account", tags=["account"])


def _check_token():
    """Vérifie que le token est configuré, lève 401 sinon."""
    status = account_manager.get_status()
    if not status["token_configured"]:
        raise HTTPException(
            status_code=401,
            detail="DERIV_API_TOKEN non configuré dans backend/.env",
        )


@router.get("/status")
async def get_status():
    """Statut de la connexion compte."""
    return account_manager.get_status()


@router.get("/info")
async def get_account_info():
    """Informations du compte (solde, devise, type)."""
    _check_token()
    info = await account_manager.fetch_account_info()
    if not info:
        raise HTTPException(
            status_code=500,
            detail=account_manager.get_status().get("error") or "Impossible de récupérer les infos du compte",
        )
    return info.to_dict()


@router.get("/positions")
async def get_positions():
    """Positions (contrats) ouvertes."""
    _check_token()
    positions = await account_manager.fetch_open_positions()
    return {
        "count": len(positions),
        "positions": [p.to_dict() for p in positions],
    }


@router.get("/transactions")
async def get_transactions(limit: int = 20):
    """Historique des transactions récentes."""
    _check_token()
    txs = await account_manager.fetch_transactions(limit=limit)
    return {
        "count": len(txs),
        "transactions": [t.to_dict() for t in txs],
    }


@router.post("/connect")
async def connect_account():
    """Force une reconnexion et retourne les infos du compte."""
    _check_token()
    info = await account_manager.fetch_account_info()
    if info:
        return {
            "status": "connected",
            "account": info.to_dict(),
        }
    return {
        "status": "failed",
        "error": account_manager.get_status().get("error"),
    }


@router.post("/set-token")
async def set_token(body: dict):
    """
    Définit le token API Deriv depuis l'interface frontend.
    Le token est stocké en mémoire uniquement (non persisté sur disque).
    """
    token = body.get("token", "").strip()
    if not token:
        raise HTTPException(status_code=400, detail="Token manquant")

    # Mettre à jour le token en mémoire
    settings.set_token(token)

    # Tester immédiatement
    info = await account_manager.fetch_account_info()
    if info:
        return {"status": "connected", "loginid": info.loginid}

    raise HTTPException(
        status_code=401,
        detail=account_manager.get_status().get("error") or "Token invalide",
    )
