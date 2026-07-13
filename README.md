
# Deriv AI Trading Assistant

Assistant de trading intelligent connecté à Deriv — analyse multi-timeframe, stratégies techniques, FVG (Smart Money), gestion du risque et flux de décision professionnel.

---

## Table des matières

1. [Vision](#vision)
2. [Stack technique](#stack)
3. [Démarrage rapide](#démarrage)
4. [Architecture du projet](#architecture)
5. [Flux de décision professionnel](#flux)
6. [Actifs supportés](#actifs)
7. [Indicateurs et analyses](#analyse)
8. [Fair Value Gaps (FVG)](#fvg)
9. [Les 3 stratégies](#stratégies)
10. [Gestion du risque](#risque)
11. [Graphique en bougies](#graphique)
12. [Interface dashboard](#dashboard)
13. [API Backend](#api)
14. [Phases de développement](#phases)

---

## Vision

Créer un copilote intelligent d'analyse de marché connecté à Deriv qui :

- Récupère les données en temps réel (ticks + bougies OHLC sur 4 timeframes)
- Analyse les mouvements avec indicateurs techniques et Smart Money Concept
- Détecte les Fair Value Gaps (FVG) et zones d'imbalance
- Émet des signaux stables avec un verrou de 3–5 minutes
- Explique **pourquoi** entrer ou ne pas entrer, en langage clair
- Propose un prix cible quand le signal est insuffisant
- Surveille l'invalidation du signal tick par tick
- Affiche le solde et les positions du compte Deriv

---

## Stack

| Couche | Technologies |
|--------|-------------|
| Frontend | React 19 · TypeScript · Tailwind CSS v4 · Zustand · Vite · Lightweight Charts |
| Backend | Python 3.12 · FastAPI · WebSocket · Uvicorn |
| Données | Deriv WebSocket API (temps réel) |
| Graphiques | TradingView Lightweight Charts v4 |

---

## Démarrage

### Backend

```bash
cd backend

# Python 3.12 requis (pas 3.13/3.14)
py -3.12 -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/Mac

pip install -r requirements.txt

# Configuration
copy .env.example .env
# Éditer .env : ajouter DERIV_API_TOKEN si vous avez un compte

python run.py
```

Backend : `http://localhost:8000` · Docs API : `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Dashboard : `http://localhost:5173`

---

## Architecture

```
deriv-ai-trading-assistant/
│
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI + startup + broadcast WebSocket
│   │   ├── config.py                  # Variables d'environnement
│   │   ├── deriv_client.py            # Client WebSocket Deriv (ticks + bougies 4 TF)
│   │   ├── tick_store.py              # Buffer des derniers ticks
│   │   ├── candle_store.py            # Buffer bougies OHLC par TF (1min/5min/15min/1h)
│   │   ├── assets.py                  # Catalogue actifs (Volatility/Boom/Crash/Step)
│   │   ├── account.py                 # Connexion compte Deriv (solde, positions)
│   │   ├── connection_manager.py      # Broadcast WebSocket → Frontend
│   │   ├── routers/
│   │   │   ├── market.py              # WS /market/ws · REST candles/ticks
│   │   │   └── account.py             # REST /account/info|positions|transactions
│   │   └── analysis/
│   │       ├── engine.py              # Moteur principal — flux 6 étapes
│   │       ├── indicators.py          # EMA, RSI, MACD, ATR, BB, S/R, FVG
│   │       ├── market_context.py      # Étape 1 : phase, structure HH/HL, swing
│   │       ├── confirmation.py        # Étape 4 : 3 bougies consécutives
│   │       ├── signal_lock.py         # Verrou signal (3–5 min de stabilité)
│   │       ├── pending_order.py       # Prix cibles ≥70% confiance
│   │       ├── position_manager.py    # TP / SL / lots / durée / répétitions
│   │       └── strategies/
│   │           ├── trend_pullback.py  # Stratégie 1 — Tendance + Pullback
│   │           ├── breakout_retest.py # Stratégie 2 — Breakout + Retest
│   │           ├── multi_tf.py        # Stratégie 3 — Multi-TF H1/M15/M5
│   │           └── scorer.py          # Orchestrateur + filtres anti-faux signaux
│   ├── run.py
│   └── requirements.txt
│
└── frontend/
    └── src/
        ├── App.tsx                    # Dashboard principal
        ├── store/marketStore.ts       # État global (ticks, analyse, bougies, FVG)
        ├── hooks/useWebSocket.ts      # WS : tick + analyse + snapshot bougies
        ├── utils/format.ts            # Formatage prix 4 décimales
        └── components/
            ├── DecisionBanner.tsx     # ① ACHETEZ / VENDEZ / NE RIEN FAIRE
            ├── CandleChart.tsx        # ② Graphique bougies Lightweight Charts
            ├── PriceCard.tsx          # Prix temps réel + variation + tendance
            ├── SignalCard.tsx         # Signal + 🔒 verrou + compte à rebours
            ├── AssetSelector.tsx      # Sélection actif (Volatility/Boom/Crash/Step)
            ├── CapitalSettings.tsx    # Capital + mises 1%/2%/3%
            ├── AccountPanel.tsx       # Compte Deriv : solde, positions, historique
            ├── FVGPanel.tsx           # Zones FVG avec alertes de proximité
            ├── MarketContextCard.tsx  # Phase marché, structure HH/HL, swing
            ├── ConfirmationCard.tsx   # 3 bougies consécutives + invalidation
            ├── PendingOrdersCard.tsx  # Prix cibles si signal faible
            ├── StrategiesPanel.tsx    # Score des 3 stratégies (dépliable)
            ├── PositionCard.tsx       # TP/SL/lots/durée/répétitions
            ├── MTFPanel.tsx           # Tableau 1h/15min/5min/1min
            ├── TickFeed.tsx           # Flux des derniers prix
            ├── MiniChart.tsx          # Graphique SVG léger (secondaire)
            └── ConnectionStatus.tsx   # Indicateur connexion WS
```

---

## Flux de décision professionnel

6 étapes séquentielles. Un signal n'est émis qu'après toutes les validations.

```
Tick reçu
    │
    ├─► Signal encore verrouillé ? (bougie M5 non clôturée)
    │       OUI → prix mis à jour + check invalidation tick par tick
    │       Invalidé ? → alerte rouge, verrou cassé
    │
    └─► NON → Recalcul complet :
              │
              ├─ ÉTAPE 1 : Contexte marché (M15)
              │     Phase    : trending_up / trending_down / ranging / breakout
              │     Structure: HH+HL (bullish) / LH+LL (bearish) / mixed
              │     Niveaux  : swing high, swing low, range total
              │     Volatilité: low / medium / high / extreme
              │
              ├─ ÉTAPE 2 : Analyse 4 timeframes
              │     1h   : direction macro        (poids 4)
              │     15min: zone d'entrée          (poids 3)
              │     5min : timing                 (poids 2)
              │     1min : déclencheur            (poids 1)
              │     → EMA, RSI, MACD, BB, S/R, ATR, FVG sur chaque TF
              │
              ├─ ÉTAPE 3 : 3 stratégies (score /100)
              │     Trend+Pullback  ≥ 80/100
              │     Breakout+Retest ≥ 85/100
              │     Multi-TF        ≥ 70/100
              │     + Filtres anti-faux signaux
              │     → Consensus 2/3 ou 3/3
              │
              ├─ ÉTAPE 4 : Confirmation structurelle
              │     3 bougies M15 consécutives :
              │     EMA20 > EMA50 · RSI favorable · MACD histogram · Prix vs EMA
              │     → Pénalité -20pts si < 3 bougies
              │
              ├─ ÉTAPE 5 : FVG (Fair Value Gaps)
              │     Détection sur 60 bougies M15
              │     FVG proche → +4 à +8 pts de confiance
              │     Prix dans zone FVG → "Entrée optimale"
              │
              ├─ ÉTAPE 6 : Signal verrouillé
              │     BUY/SELL si confiance ≥ 60%
              │     Durée verrou : 5min (≥80%) ou 3min
              │     Message : contexte + raisons + mise + TP/SL
              │
              └─ SURVEILLANCE tick par tick
                    BUY invalidé si : SL cassé · Support rompu · EMA20 < EMA50 · RSI < 32
                    SELL invalidé si: SL cassé · Résistance cassée · EMA20 > EMA50 · RSI > 68
```

### Stabilité du signal

```
Problème amateur : signal change toutes les 24 secondes (bruit du marché)

Solution implémentée :
  10h15:00  Bougie M5 clôture  →  Analyse complète  →  Signal BUY verrouillé 5min
  10h15:25  Tick reçu          →  Prix mis à jour   →  Signal BUY maintenu
  10h15:49  Tick reçu          →  Check invalidation →  Signal BUY maintenu (pas de cassure)
  10h20:00  Nouvelle bougie M5 →  Analyse complète  →  Nouveau signal calculé
```

---

## Actifs supportés

### Volatility Indices
| Symbole | Nom | Risque | Durée conseillée |
|---------|-----|--------|-----------------|
| R_10 | Volatility 10 Index | Modéré | 5min – 4h |
| R_25 | Volatility 25 Index | Modéré | 5min – 3h |
| R_50 | Volatility 50 Index | Élevé | 3min – 2h |
| R_75 | Volatility 75 Index | Élevé | 2min – 1h |
| R_100 | Volatility 100 Index | Extrême | 1min – 30min |
| 1HZ10V | Volatility 10 (1s) | Modéré | 1min – 30min |
| 1HZ100V | Volatility 100 (1s) | Extrême | 1min – 15min |

### Boom Indices ⚡ — BUY uniquement
| Symbole | Spike | Durée max |
|---------|-------|-----------|
| BOOM300N | ~1/300 ticks | 1h |
| BOOM500 | ~1/500 ticks | 1h30 |
| BOOM1000 | ~1/1000 ticks | 2h |

### Crash Indices ⚡ — SELL uniquement
| Symbole | Spike | Durée max |
|---------|-------|-----------|
| CRASH300N | ~1/300 ticks | 1h |
| CRASH500 | ~1/500 ticks | 1h30 |
| CRASH1000 | ~1/1000 ticks | 2h |

### Step Index
| Symbole | Description |
|---------|-------------|
| stpRNG | Mouvements réguliers ±0.1, spread minimal |

---

## Indicateurs et analyses

### Indicateurs calculés (`indicators.py`)

| Indicateur | Paramètres | Usage |
|-----------|-----------|-------|
| EMA | 20, 50, 100, 200 | Tendance, pullback, croisements |
| RSI | 14 (Wilder) | Surachat/survente, momentum |
| MACD | 12/26/9 | Croisements, histogram, accélération |
| ATR | 14 (Wilder H/L/C) | Volatilité réelle, calibrage TP/SL |
| Bollinger Bands | 20/2σ | Niveaux statistiques, squeeze |
| Support/Résistance | 30 bougies | Niveaux structurels |
| FVG | 60 bougies lookback | Zones d'imbalance SMC |

### Contexte marché (`market_context.py`)
- **Phase** : trending_up / trending_down / ranging / breakout
- **Structure** : pivots HH/HL/LH/LL détectés algorithmiquement
- **Régime de volatilité** : ATR% → low / medium / high / extreme

### Confirmation structurelle (`confirmation.py`)
3 bougies M15 consécutives doivent valider :
- EMA20 > EMA50 (BUY) ou EMA20 < EMA50 (SELL)
- RSI > 45 (BUY) ou RSI < 55 (SELL)
- MACD histogram dans le bon sens
- Prix de bon côté de l'EMA20

### Verrou de signal (`signal_lock.py`)
- Minimum **30 ticks** avant d'émettre quoi que ce soit
- Recalcul uniquement à la **clôture d'une bougie M5**
- Durée : **5min** si confiance ≥80%, **3min** sinon
- Invalidation immédiate si les conditions techniques cassent

---

## Fair Value Gaps (FVG)

Concept du **Smart Money Concept (SMC)**. Un FVG est une zone d'imbalance créée quand le marché se déplace si vite qu'il laisse un vide entre 3 bougies consécutives.

```
FVG Haussier : low[i] > high[i-2]  →  zone = [high[i-2], low[i]]
FVG Baissier : high[i] < low[i-2]  →  zone = [high[i], low[i-2]]
```

**Utilisation :**
- FVG haussier sous le prix → zone d'achat potentielle (rebond attendu)
- FVG baissier au-dessus → zone de vente potentielle
- Entrée idéale = **milieu de la zone** (midpoint)

**Intégration dans le système :**
- Détecté sur 60 dernières bougies M15
- FVG fort et proche → +8 pts de confiance
- FVG moyen et proche → +4 pts
- Prix dans la zone → message "Entrée optimale ⚡"
- Affiché sur le graphique en bougies (rectangles violets)
- Alertes de proximité à moins de 0.2% du niveau

**Force des FVG :**
| Force | Condition | Utilisation |
|-------|-----------|-------------|
| Fort ★ | Taille > 0.5×ATR | Entrée prioritaire |
| Moyen ◆ | Taille > 0.2×ATR | Entrée normale |
| Faible | Taille < 0.2×ATR | Informatif seulement |

---

## Les 3 stratégies

### Stratégie 1 — Trend + Pullback (seuil ≥ 80/100)

Entrer dans le sens de la tendance après un repli sur EMA.

| Condition | Points |
|-----------|--------|
| Tendance EMA50/200 | 30 |
| Pullback EMA20/50 (tolérance 0.5×ATR) | 30 |
| Bougie de confirmation (engulfing, pin bar) | 20 |
| RSI en zone favorable | 20 |

### Stratégie 2 — Breakout + Retest (seuil ≥ 85/100)

Cassure d'un niveau, retour pour le tester avant de reprendre.

| Condition | Points |
|-----------|--------|
| Cassure validée > 0.2×ATR | 40 |
| Retest du niveau cassé ±0.6×ATR | 30 |
| Bougie de confirmation post-retest | 20 |
| Filtre ATR (mouvement non épuisé < 2×ATR) | 10 |

### Stratégie 3 — Multi-TF H1/M15/M5 (seuil ≥ 70/100)

| Condition | Points |
|-----------|--------|
| Tendance H1 (EMA50 vs EMA200) | 30 |
| Confirmation M15 (pullback S/R + RSI) | 35 |
| Déclencheur M5 (MACD croise + engulfing) | 35 |

### Filtres anti-faux signaux

Signal **bloqué** si :
- Bougie M15 > 2×ATR moyen → mouvement épuisé
- Range < 1.5×ATR → consolidation trop étroite
- Stratégie 1 et 3 se contredisent → pénalité -10pts
- Moins de 2/3 stratégies actives

| Score final | Décision |
|-------------|---------|
| 90–100 | Très fort → entrer |
| 80–89 | Fort → entrer |
| 70–79 | Moyen → entrer avec prudence |
| < 70 | Ne pas entrer |

---

## Gestion du risque

### Mise recommandée

| Alignement MTF | Régime | Mise max |
|---------------|--------|----------|
| 4/4 TF | Calme | 3% du capital |
| 3/4 TF | Normal | 2% du capital |
| 2/4 TF | Normal | 1% du capital |
| < 2/4 | Tout | 0$ |
| Tout | Instable | 0$ |

La mise est modulée par la confiance : 60%→100% confiance = 50%→100% du plafond.

### Plan de position

Pour chaque signal BUY/SELL :

| Paramètre | Calcul |
|-----------|--------|
| Take Profit | ATR × facteur actif (1.5×–2.5×) |
| Stop Loss | ATR × 1.5 |
| Risk/Reward | TP/SL (idéal ≥ 1:1.5) |
| Durée | Adaptée à l'actif, max 24h |
| Répétitions | Budget série = 10% capital, max 5× |

---

## Graphique en bougies

Composant `CandleChart.tsx` — Lightweight Charts v4 (TradingView).

**Overlays :**
| Overlay | Couleur | Toggle |
|---------|---------|--------|
| EMA 20 | Bleu | ✓ |
| EMA 50 | Orange | ✓ |
| Bollinger Bands | Rouge/Vert pointillés | ✓ |
| FVG Zones | Violet (price lines haut/milieu/bas) | ✓ |
| Support | Bleu tirets | ✓ |
| Résistance | Orange tirets | ✓ |
| Signal BUY/SELL | Flèche verte/rouge sur bougie | auto |
| Marqueurs FVG | Flèche violette sur bougie | auto |

**Timeframes disponibles :** 1min · 5min · 15min · 1h (sélecteur dans l'interface)

**Fonctionnement :**
- À la connexion WebSocket → snapshot complet des bougies envoyé immédiatement
- Chaque tick → mise à jour de la bougie courante (high/low/close)
- EMA calculée côté frontend sur la série complète pour une ligne continue
- Bollinger calculé localement (SMA + écart-type sur 20 périodes)

### Changement d'actif en temps réel

Quand l'utilisateur sélectionne un nouvel actif dans `AssetSelector` :

**Backend — `POST /settings/symbol?symbol=R_75`**
1. Met à jour `_current_symbol`
2. Vide `tick_store` (supprime les ticks de l'ancien actif)
3. Vide `candle_store` sur les 4 TF
4. Réinitialise le verrou de signal (`signal_lock`)
5. Ferme la connexion Deriv → reconnexion automatique
6. Souscrit aux ticks + bougies du nouvel actif
7. Broadcast le snapshot complet au frontend après 1s

**Frontend — `setCurrentSymbol(symbol)`**
1. Vide `ticks`, `analysis`, `candles` dans le store
2. Reçoit `candles_snapshot` → graphique se recharge
3. Header mis à jour

---

Layout à 2 zones :

### Zone principale (toujours visible)
```
[Bannière de décision — ACHETEZ / VENDEZ / NE RIEN FAIRE]
[Sélecteur actif]   [Capital]
[Prix + tendance]   [Signal + verrou + compte à rebours]
[Graphique bougies — Lightweight Charts]
[▼ Voir l'analyse complète]
```

### Zone détaillée (dépliable)
```
[Compte Deriv — solde, positions, transactions]
[Ordres en attente — si signal < 70%]
[FVG Panel — zones d'imbalance]
[Contexte marché]   [Confirmation 3 bougies]
[3 Stratégies]      [Plan de position TP/SL]
[MTF Tableau]       [Flux de ticks]
```

### Composants

| Composant | Rôle |
|-----------|------|
| `DecisionBanner` | Message principal : ACHETEZ/VENDEZ/NE RIEN FAIRE avec FVG intégré |
| `CandleChart` | Graphique bougies Lightweight Charts avec tous les overlays |
| `PriceCard` | Prix 4 décimales + variation + tendance |
| `SignalCard` | Signal + 🔒 verrou + compte à rebours + mise |
| `AssetSelector` | Grille des actifs par famille (Volatility/Boom/Crash/Step) |
| `CapitalSettings` | Saisie capital + aperçu mises 1%/2%/3% |
| `AccountPanel` | Solde, type compte, positions ouvertes, historique |
| `FVGPanel` | Zones FVG avec force, distance, alertes proximité |
| `MarketContextCard` | Phase, structure, swing high/low, volatilité |
| `ConfirmationCard` | 3 bougies M15 + cercle de score + surveillance |
| `PendingOrdersCard` | Prix cibles avec confiance ≥70% |
| `StrategiesPanel` | Score des 3 stratégies, filtres, verdict |
| `PositionCard` | TP/SL/R:R/lots/durée/répétitions/sortie |
| `MTFPanel` | Tableau 4 TF avec EMA/RSI/MACD/ATR |
| `TickFeed` | Flux temps réel des derniers prix |

---

## API Backend

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/` | Statut + compteurs |
| GET | `/health` | Santé système |
| WS | `/market/ws` | WebSocket (ticks + analyse + bougies) |
| GET | `/market/last-tick` | Dernier tick |
| GET | `/market/ticks?limit=N` | N derniers ticks |
| GET | `/market/candles/{tf}` | Bougies d'un TF |
| GET | `/market/candles` | Bougies tous les TF |
| GET | `/analysis` | Analyse MTF complète |
| POST | `/settings/amount?amount=N` | Définir le capital |
| GET | `/settings/amount` | Lire le capital |
| POST | `/settings/symbol?symbol=X` | Changer l'actif |
| GET | `/assets` | Liste tous les actifs |
| GET | `/account/status` | Statut connexion compte |
| GET | `/account/info` | Solde, devise, loginid |
| GET | `/account/positions` | Positions ouvertes |
| GET | `/account/transactions?limit=N` | Historique |
| POST | `/account/connect` | Reconnexion compte |

### Messages WebSocket entrants

```json
// Tick + analyse
{ "type": "tick", "symbol": "R_50", "price": 90.4258, "timestamp": 1720864500,
  "analysis": { "signal": {...}, "fvgs": [...], "position": {...}, ... } }

// Snapshot initial des bougies (envoyé à la connexion)
{ "type": "candles_snapshot",
  "data": { "1min": [...], "5min": [...], "15min": [...], "1h": [...] } }

// Mise à jour bougie en cours (chaque tick)
{ "type": "candle_update", "timeframe": "5min", "granularity": 300,
  "candle": { "time": 1720864500, "open": 90.41, "high": 90.45, "low": 90.39, "close": 90.4258 } }
```

---

## Variables d'environnement

```env
DERIV_APP_ID=1089           # App ID Deriv (1089 = app démo publique)
DERIV_API_TOKEN=            # Token personnel (optionnel pour données publiques)
```

Créer un token API : https://app.deriv.com/account/api-token
Permissions nécessaires : **Read** + **Trade** (si vous souhaitez voir les positions)

> ⚠️ Ne jamais partager votre token API. Le mettre uniquement dans `backend/.env`.

---

## Phases de développement

| Phase | Statut | Contenu |
|-------|--------|---------|
| **Phase 1 — MVP** | ✅ | Connexion Deriv, ticks R_50, dashboard basique |
| **Phase 2 — Indicateurs** | ✅ | EMA, RSI, MACD, Bollinger, Support/Résistance |
| **Phase 3 — MTF** | ✅ | 4 timeframes, bougies OHLC, analyse pondérée |
| **Phase 4 — Stratégies** | ✅ | 3 stratégies, scorer, filtres anti-faux signaux |
| **Phase 5 — Flux pro** | ✅ | Contexte, confirmation 3 bougies, verrou, invalidation |
| **Phase 6 — Multi-actifs** | ✅ | Boom/Crash/Volatility/Step, position manager |
| **Phase 7 — FVG / SMC** | ✅ | Fair Value Gaps, zones d'imbalance, intégration signal |
| **Phase 8 — Graphique bougies** | ✅ | Lightweight Charts, EMA/BB/FVG/S/R sur le graphique |
| **Phase 9 — Compte Deriv** | ✅ | Solde temps réel, positions ouvertes, historique |
| **Phase 10 — IA/ML** | 🔲 | XGBoost/LSTM, prédictions, score de probabilité |
| **Phase 11 — Comptes users** | 🔲 | Auth, historique personnel, multi-utilisateurs |
| **Phase 12 — Automatisation** | 🔲 | Exécution auto des trades via API Deriv |

---

> **Avertissement** : Cet assistant est un outil d'aide à la décision. Il ne garantit aucun gain.
> Tout trading comporte un risque de perte en capital. Ne jamais trader avec de l'argent
> que vous ne pouvez pas vous permettre de perdre. Les indices synthétiques Deriv
> (Boom/Crash notamment) peuvent générer des pertes très rapides.
