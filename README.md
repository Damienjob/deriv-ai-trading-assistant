# Deriv AI Trading Assistant

Plateforme d'assistance au trading connectée à Deriv — MVP v1.0

## Architecture

```
frontend/   →  React + TypeScript + Tailwind + Zustand
backend/    →  FastAPI + WebSocket + Python
```

## Démarrage rapide

### Backend

```bash
cd backend

# Créer l'environnement virtuel (si pas encore fait)
python -m venv venv

# Activer le venv
# Windows :
venv\Scripts\activate
# Linux/Mac :
source venv/bin/activate

# Installer les dépendances
pip install -r requirements.txt

# Copier et configurer les variables d'environnement
copy .env.example .env

# Démarrer le serveur
python run.py
```

Le backend tourne sur : http://localhost:8000  
Documentation API : http://localhost:8000/docs

### Frontend

```bash
cd frontend

# Installer les dépendances (déjà fait)
npm install

# Démarrer le serveur de développement
npm run dev
```

Le frontend tourne sur : http://localhost:5173

## Fonctionnement MVP

1. Le backend se connecte à Deriv WebSocket (API publique)
2. Il souscrit aux ticks du Volatility 50 Index (R_50)
3. Les ticks sont broadcastés aux clients frontend via WebSocket
4. Le frontend affiche le prix en temps réel avec un graphique SVG

## Variables d'environnement

| Variable | Description | Défaut |
|----------|-------------|--------|
| `DERIV_APP_ID` | ID de l'application Deriv | `1089` (app démo) |
| `DERIV_API_TOKEN` | Token utilisateur (optionnel pour les données publiques) | — |

## Phases de développement

- ✅ **Phase 1 (MVP)** : Connexion Deriv, ticks temps réel, dashboard
- 🔲 **Phase 2** : EMA, RSI, MACD, supports/résistances
- 🔲 **Phase 3** : IA (XGBoost/LSTM), prédictions, score de confiance
- 🔲 **Phase 4** : Comptes utilisateurs, SaaS, notifications
