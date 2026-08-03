# wariss.md — Comment fonctionne l'application au complet

---

## Vue d'ensemble

L'application est un **copilote de trading** connecté à Deriv en temps réel.
Elle reçoit les prix, les analyse sur 4 timeframes, et dit au trader : **ACHETEZ / VENDEZ / NE RIEN FAIRE** — avec une explication claire et un plan de position (TP, SL, mise).

Elle est composée de deux parties qui communiquent via WebSocket :

```
Deriv API (WebSocket)
       ↓
  BACKEND Python (FastAPI)
  — reçoit les prix
  — calcule les indicateurs
  — prend la décision
       ↓ WebSocket
  FRONTEND React (Vite)
  — affiche tout en temps réel
```

---

## 1. Le Backend — Python / FastAPI

### Démarrage (`run.py` → `main.py`)

Quand tu lances `python run.py`, FastAPI démarre et exécute `startup_event()` qui lance deux tâches en parallèle :

1. `run_deriv_connection()` — connexion à Deriv et réception des données
2. `_connect_account()` — connexion au compte Deriv si un token est fourni dans `.env`

---

### Connexion à Deriv (`deriv_client.py`)

Le client se connecte à `wss://ws.binaryws.com/websockets/v3` via WebSocket.

Comme l'`app_id=1089` (démo publique) ne supporte pas les souscriptions en temps réel, le client **simule** un flux temps réel en faisant du **polling** : il demande les 2 derniers ticks toutes les 0.5 secondes.

Au démarrage, il récupère aussi :
- 30 ticks historiques (pour démarrer l'analyse immédiatement)
- 200 bougies OHLC pour chacun des 5 timeframes : 1min, 5min, 15min, 30min, 1h

Les messages reçus de Deriv sont de 4 types :
- `history` → ticks récents (polling)
- `candles` → historique OHLC initial
- `ohlc` → mise à jour bougie en cours (temps réel)
- `tick` → tick temps réel (si souscription active)

---

### Stockage des données

**`tick_store.py`** — Buffer circulaire des 500 derniers ticks.
Chaque tick contient : `symbol`, `price`, `timestamp`, `pip_size`.

**`candle_store.py`** — Buffer de 250 bougies OHLC par timeframe.
Chaque bougie contient : `timestamp`, `open`, `high`, `low`, `close`, `granularity`.
Si une bougie avec le même timestamp arrive, elle est **mise à jour** (bougie en cours).

---

### Réception d'un tick → Analyse → Broadcast (`main.py`)

À chaque tick reçu, `on_tick_received()` est appelé :

1. Vérifie que le tick appartient bien à l'actif courant (ignore les ticks d'un ancien actif après un changement)
2. Dédoublonne (ignore si même timestamp ET même prix que le dernier tick)
3. Ajoute le tick dans `tick_store`
4. Appelle `analyze()` — le moteur de décision
5. Broadcast le résultat à tous les clients WebSocket connectés (frontend)
6. Broadcast aussi la mise à jour de la bougie en cours pour chaque timeframe

---

### Le Moteur d'Analyse (`analysis/engine.py`)

C'est le cœur de l'application. La fonction `analyze()` suit un flux en 6 étapes.

#### Pré-condition : Verrou de signal

Avant de recalculer, le moteur vérifie si un signal est encore **verrouillé** (valide).
- Si oui → il retourne le signal verrouillé + vérifie l'invalidation tick par tick
- Si non → il recalcule tout

Un signal ne peut être émis qu'après **30 ticks minimum** (phase de collecte de données).

---

#### ÉTAPE 1 — Contexte marché (`market_context.py`)

Calculé sur les bougies M15. Détermine :
- **Phase** : `trending_up` / `trending_down` / `ranging` / `breakout`
- **Structure** : HH+HL (haussier) / LH+LL (baissier) / mixte
- **Swing High / Swing Low** sur 50 bougies
- **Volatilité** : low / medium / high / extreme (basé sur ATR%)

Si la volatilité est `extreme` → signal bloqué immédiatement, pas d'entrée.

---

#### ÉTAPE 2 — Analyse par Timeframe (`indicators.py`)

Pour chaque timeframe (1min, 5min, 15min, 30min, 1h), le moteur calcule :

| Indicateur | Rôle |
|-----------|------|
| EMA 20/50/200 | Direction de tendance |
| RSI 14 | Momentum (surachat/survente) |
| MACD 12/26/9 | Accélération / croisements |
| ATR 14 | Volatilité réelle |
| Bollinger Bands 20/2σ | Niveaux statistiques |
| Support / Résistance | Niveaux structurels sur 30 bougies |
| ADX 14 | Force de la tendance |
| FVG | Fair Value Gaps (zones d'imbalance) |

Chaque timeframe vote : **+1 (haussier)** / **-1 (baissier)** / **0 (neutre)**.

Le vote est pondéré : 1h (poids 4) > 15min (3) > 5min (2) > 1min (1).

**Filtre ADX** : si ADX < 20 (marché en range), le poids des signaux EMA/MACD est réduit car ils sont peu fiables en range.

---

#### ÉTAPE 3 — 4 Stratégies (`analysis/strategies/`)

Le scorer (`scorer.py`) lance 4 stratégies en parallèle :

**Stratégie 1 — Trend + Pullback** (seuil ≥ 80/100)
- Tendance EMA50/200 confirmée
- Pullback sur EMA20/50 (tolérance 0.5×ATR)
- Bougie de confirmation (engulfing, pin bar)
- RSI en zone favorable

**Stratégie 2 — Breakout + Retest** (seuil ≥ 85/100)
- Cassure validée > 0.2×ATR
- Retest du niveau cassé ±0.6×ATR
- Bougie de confirmation post-retest
- Filtre ATR (mouvement non épuisé < 2×ATR)

**Stratégie 3 — Multi-TF H1/M15/M5** (seuil ≥ 70/100)
- Tendance H1 (EMA50 vs EMA200)
- Confirmation M15 (pullback S/R + RSI)
- Déclencheur M5 (MACD croise + engulfing)

**Stratégie 4 — P2dro** (seuil ≥ 75/100) — méthode prioritaire
- Pin Bar sur niveau clé
- Divergence RSI
- Ligne de tendance H1/M30

**Règle de consensus** : minimum 3/4 stratégies doivent être d'accord.
P2dro compte double dans le consensus (méthode prioritaire).

**Filtres anti-faux signaux** :
- Range trop étroit (< 1.5×ATR) → signal bloqué
- Bougie M15 > 2×ATR → mouvement épuisé → bloqué
- Stratégies 1 et 3 en contradiction → pénalité -10pts

---

#### ÉTAPE 4 — Confirmation structurelle (`confirmation.py`)

3 bougies M15 consécutives doivent valider (profil `trend_following`) :
1. EMA20 > EMA50 (BUY) ou EMA20 < EMA50 (SELL)
2. RSI > 45 (BUY) ou RSI < 55 (SELL)
3. MACD histogram dans le bon sens
4. +DI > -DI (BUY) ou -DI > +DI (SELL)

Si la confirmation échoue → signal visible mais **non actionnable** (mise = 0$, pas de verrou).

**Étape 4b — Price Action M5** (`price_action_confirm.py`) :
Détecte les patterns de bougies (Engulfing, Pinbar, Marubozu) sur M5.
Si un pattern confirme → peut valider le signal même sans les 3 bougies indicateurs.

---

#### ÉTAPE 5 — FVG / Smart Money (`indicators.py → detect_fvg`)

Détecte les **Fair Value Gaps** sur les 60 dernières bougies M15.

Un FVG est une zone d'imbalance créée quand le marché se déplace si vite qu'il laisse un vide :
- FVG haussier : `low[i] > high[i-2]` → zone d'achat potentielle
- FVG baissier : `high[i] < low[i-2]` → zone de vente potentielle

Si le prix est proche d'un FVG fort → +8 pts de confiance.
Si le prix est dans la zone → message "Entrée optimale".

---

#### ÉTAPE 6 — Verrou de signal (`signal_lock.py`)

Si le signal est actionnable (BUY/SELL + confirmation + confiance ≥ 60%) :
- Le signal est **verrouillé** pour 15min (confiance ≥ 80%) ou 10min
- Pendant le verrou, les ticks ne font que mettre à jour le prix
- Le verrou est cassé si les conditions d'invalidation sont détectées

**Invalidation tick par tick** :
- BUY invalidé si : support cassé, EMA20 < EMA50, RSI < 32
- SELL invalidé si : résistance cassée, EMA20 > EMA50, RSI > 68

---

### Gestion du risque (`indicators.py → recommended_stake`)

La mise recommandée dépend de :
- L'alignement MTF (4/4 → 3%, 3/4 → 2%, 2/4 → 1%, < 2 → 0$)
- La confiance (60%→100% = 50%→100% du plafond)
- Le régime de volatilité (instable → 0$)

Le plan de position (`position_manager.py`) calcule :
- Take Profit = ATR × facteur actif (1.5× à 2.5×)
- Stop Loss = ATR × 1.5
- Risk/Reward, durée, nombre de répétitions max

---

### Changement d'actif (`main.py → /settings/symbol`)

Quand l'utilisateur change d'actif :
1. `_current_symbol` est mis à jour
2. `tick_store` et `candle_store` sont vidés
3. Le verrou de signal est réinitialisé
4. La connexion Deriv est fermée → reconnexion automatique avec le nouvel actif
5. Un message `symbol_changed` est broadcasté au frontend

---

### API REST et WebSocket (`routers/market.py`, `routers/account.py`)

Le backend expose :
- `WS /market/ws` — WebSocket principal (ticks + analyse + bougies)
- `GET /analysis` — dernière analyse complète
- `POST /settings/symbol` — changer l'actif
- `POST /settings/amount` — définir le capital
- `GET /account/info` — solde et infos compte Deriv
- `GET /account/positions` — positions ouvertes

---

## 2. Le Frontend — React / TypeScript / Vite

### Architecture

```
App.tsx
├── useWebSocket()     — connexion WS, réception messages
├── useNotifications() — notifications navigateur
├── marketStore.ts     — état global (Zustand)
└── Vues :
    ├── HomeView       — page d'accueil marketing
    ├── DashboardView  — tableau de bord principal
    ├── AnalysisView   — analyse détaillée MTF
    └── PositionsView  — suivi des positions
```

---

### État global (`store/marketStore.ts`)

Zustand gère tout l'état de l'application :
- `currentTick` — dernier tick reçu
- `ticks[]` — 300 derniers ticks
- `analysis` — dernière analyse complète du backend
- `candles` — bougies OHLC par timeframe (1min/5min/15min/30min/1h)
- `isReady` — true quand bougies + premier tick reçus (contrôle l'AppLoader)
- `currentSymbol` et `baseAmount` — persistés dans localStorage

---

### Connexion WebSocket (`hooks/useWebSocket.ts`)

Se connecte à `ws://localhost:8000/market/ws` (ou l'URL de prod).
Reconnexion automatique toutes les 3 secondes si déconnecté.

Gère 4 types de messages :
- `tick` → `store.setTick()` — met à jour le prix + l'analyse
- `candles_snapshot` → `store.setCandlesSnapshot()` — charge toutes les bougies
- `candle_update` → `store.updateCandle()` — met à jour la bougie en cours
- `symbol_changed` → `store.setCurrentSymbol()` — réinitialise l'état

---

### Composants principaux

**`AppLoader`** — écran de chargement affiché tant que `isReady = false`.

**`DecisionBanner`** — la bannière principale : ACHETEZ / VENDEZ / NE RIEN FAIRE.
Affiche aussi le FVG optimal si disponible.

**`CandleChart`** — graphique Lightweight Charts (TradingView).
Overlays : EMA20, EMA50, Bollinger Bands, FVG zones, Support/Résistance, signaux.
Sélecteur de timeframe : 1min / 5min / 15min / 1h.

**`SignalCard`** — signal + verrou 🔒 + compte à rebours + mise recommandée.

**`PriceCard`** — prix temps réel à 4 décimales + variation + tendance.

**`AssetSelector`** — grille de sélection des actifs par famille.
Au clic → appel `POST /settings/symbol` + `store.setCurrentSymbol()`.

**`CapitalSettings`** — saisie du capital + aperçu des mises 1%/2%/3%.

**`MTFPanel`** — tableau des 4 timeframes avec EMA/RSI/MACD/ATR.

**`FVGPanel`** — zones FVG avec force, distance, alertes de proximité.

**`StrategiesPanel`** — score des 4 stratégies (dépliable).

**`ConfirmationCard`** — 3 bougies M15 + cercle de score + surveillance.

**`PositionCard`** — TP/SL/R:R/lots/durée/répétitions/sortie.

**`MarketContextCard`** — phase, structure, swing high/low, volatilité.

**`AccountPanel`** — solde Deriv, positions ouvertes, historique.

---

### Flux complet d'un tick (de bout en bout)

```
1. Deriv envoie un prix (polling 0.5s)
2. deriv_client.py reçoit → tick_store.add()
3. on_tick_received() → analyze()
4. analyze() :
   a. Vérifie le verrou → si valide, retourne le signal verrouillé
   b. Sinon : Contexte → MTF → Stratégies → Confirmation → FVG → Verrou
5. Résultat broadcasté via WebSocket à tous les clients
6. Frontend reçoit le message "tick"
7. store.setTick() met à jour l'état global
8. Tous les composants React se re-rendent automatiquement
9. L'utilisateur voit le nouveau prix + signal en temps réel
```

---

## 3. Déploiement

Le projet peut être déployé sur :
- **Backend** : Render (render.yaml présent dans le projet)
- **Frontend** : Vercel (vercel.json présent dans le projet)

Variables d'environnement nécessaires :
```
DERIV_APP_ID=1089
DERIV_API_TOKEN=  (optionnel — pour voir le solde et les positions)
```

---

## Résumé des fichiers clés

| Fichier | Rôle |
|---------|------|
| `backend/app/main.py` | Point d'entrée FastAPI, orchestration |
| `backend/app/deriv_client.py` | Connexion WebSocket Deriv |
| `backend/app/analysis/engine.py` | Moteur de décision (6 étapes) |
| `backend/app/analysis/indicators.py` | Tous les indicateurs techniques |
| `backend/app/analysis/market_context.py` | Phase et structure du marché |
| `backend/app/analysis/signal_lock.py` | Verrou de signal |
| `backend/app/analysis/confirmation.py` | Confirmation 3 bougies + invalidation |
| `backend/app/analysis/strategies/scorer.py` | Orchestrateur des 4 stratégies |
| `backend/app/candle_store.py` | Buffer bougies OHLC |
| `backend/app/tick_store.py` | Buffer ticks |
| `frontend/src/App.tsx` | Composant racine React |
| `frontend/src/store/marketStore.ts` | État global Zustand |
| `frontend/src/hooks/useWebSocket.ts` | Connexion WebSocket frontend |
| `frontend/src/views/DashboardView.tsx` | Vue principale |
