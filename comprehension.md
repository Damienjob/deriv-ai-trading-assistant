# comprehension.md — Comprendre le code backend

Ce fichier explique le backend en langage simple, sans jargon inutile.
Chaque fichier est expliqué avec son rôle et les concepts clés.

---

## Structure du backend

```
backend/
└── app/
    ├── main.py              ← Point d'entrée, chef d'orchestre
    ├── deriv_client.py      ← Connexion à Deriv
    ├── tick_store.py        ← Mémoire des prix reçus
    ├── candle_store.py      ← Mémoire des bougies OHLC
    ├── assets.py            ← Catalogue des actifs
    ├── config.py            ← Variables d'environnement
    ├── connection_manager.py← Gestion des clients WebSocket
    ├── account.py           ← Connexion compte Deriv
    ├── routers/
    │   ├── market.py        ← Routes WebSocket + REST marché
    │   └── account.py       ← Routes REST compte
    └── analysis/
        ├── engine.py        ← Moteur de décision (le cerveau)
        ├── indicators.py    ← Calculs mathématiques
        ├── market_context.py← Phase et structure du marché
        ├── signal_lock.py   ← Verrou de signal
        ├── confirmation.py  ← Validation sur N bougies
        ├── position_manager.py ← TP/SL/mise
        ├── pending_order.py ← Prix cibles si signal faible
        └── strategies/
            ├── scorer.py        ← Orchestrateur des 4 stratégies
            ├── trend_pullback.py← Stratégie 1
            ├── breakout_retest.py← Stratégie 2
            ├── multi_tf.py      ← Stratégie 3
            └── p2dro.py         ← Stratégie 4 (prioritaire)
```

---

## `main.py` — Le chef d'orchestre

C'est le fichier qui démarre tout. Il crée l'application FastAPI et lance deux processus en arrière-plan au démarrage :

```python
@app.on_event("startup")
async def startup_event():
    asyncio.create_task(run_deriv_connection())  # connexion Deriv
    asyncio.create_task(_connect_account(...))   # connexion compte
```

**`run_deriv_connection()`** est une boucle infinie avec reconnexion automatique :
```python
while True:
    await deriv_client.connect()
    asyncio.create_task(deriv_client.poll_ticks(symbol, interval=0.5))
    await deriv_client.fetch_tick_history(symbol, count=30)
    for gran in TIMEFRAMES:
        await deriv_client.fetch_candles(symbol, gran, count=200)
    await listen_task  # attend jusqu'à déconnexion
    await asyncio.sleep(5)  # puis reconnecte
```

**`on_tick_received()`** est appelé à chaque nouveau prix :
```python
async def on_tick_received(tick_data):
    tick_store.add(tick)           # 1. Mémoriser le prix
    result = analyze(...)          # 2. Analyser
    await manager.broadcast(msg)   # 3. Envoyer au frontend
```

**Changement d'actif** (`POST /settings/symbol`) :
Vide les stores, réinitialise le verrou, ferme la connexion Deriv.
La boucle `while True` redémarre automatiquement avec le nouvel actif.

---

## `deriv_client.py` — La connexion à Deriv

Utilise la bibliothèque `websockets` pour se connecter à l'API Deriv.

**Pourquoi du polling et pas une souscription ?**
L'`app_id=1089` (démo publique) ne supporte pas `subscribe:1`.
On simule donc un flux temps réel en demandant les 2 derniers ticks toutes les 0.5 secondes :

```python
async def poll_ticks(self, symbol, interval=0.5):
    while self.connected:
        await self._send({"ticks_history": symbol, "count": 2, "end": "latest", "style": "ticks"})
        await asyncio.sleep(interval)
```

**La boucle d'écoute `listen()`** reçoit tous les messages Deriv et les dispatche :
```python
async for raw in self.ws:
    msg = json.loads(raw)
    if msg["msg_type"] == "history":
        asyncio.create_task(_process_tick_history(msg))    # ticks historiques
        asyncio.create_task(_process_history_as_tick(msg)) # dernier tick → analyse
    elif msg["msg_type"] == "candles":
        asyncio.create_task(_process_candles_history(msg)) # bougies initiales
    elif msg["msg_type"] == "ohlc":
        asyncio.create_task(_process_ohlc(msg))            # bougie en cours
```

`create_task()` est utilisé pour ne pas bloquer la boucle d'écoute pendant le traitement.

---

## `tick_store.py` et `candle_store.py` — La mémoire

**`TickStore`** : buffer circulaire de 500 ticks.
```python
_ticks: Deque[Tick] = deque(maxlen=500)  # les 500 derniers ticks
```
Quand le buffer est plein, le plus ancien tick est automatiquement supprimé.

**`CandleStore`** : un buffer de 250 bougies par timeframe.
```python
_stores: dict[int, Deque[Candle]]  # granularity → deque de bougies
```

La méthode `add_candle()` est intelligente :
```python
def add_candle(self, candle):
    if store[-1].timestamp == candle.timestamp:
        store[-1] = candle  # même bougie → mise à jour (bougie en cours)
    else:
        store.append(candle)  # nouvelle bougie → ajout
```

---

## `analysis/indicators.py` — Les calculs mathématiques

Tous les indicateurs sont implémentés **sans bibliothèque externe** (pas de pandas, pas de ta-lib).
Ils opèrent sur des listes Python simples.

### EMA (Exponential Moving Average)
```python
def ema(prices, period):
    k = 2 / (period + 1)  # facteur de lissage
    val = sum(prices[:period]) / period  # SMA initiale
    for p in prices[period:]:
        val = p * k + val * (1 - k)  # lissage exponentiel
    return val
```
L'EMA donne plus de poids aux prix récents qu'une moyenne simple.

### RSI (Relative Strength Index)
Mesure la force du momentum sur 14 périodes.
- RSI > 70 → surachat (prix a trop monté → risque de retournement)
- RSI < 30 → survente (prix a trop baissé → rebond potentiel)
- RSI entre 45-55 → neutre

### MACD
Différence entre EMA12 et EMA26. L'histogramme (MACD - Signal) mesure l'accélération.
- Histogramme > 0 et croissant → accélération haussière
- Histogramme < 0 et décroissant → accélération baissière

### ATR (Average True Range)
Mesure la volatilité réelle en tenant compte des gaps :
```python
true_range = max(high - low, abs(high - close_prev), abs(low - close_prev))
```
Utilisé pour calibrer les TP et SL (TP = ATR × facteur, SL = ATR × 1.5).

### ADX (Average Directional Index)
Mesure la **force** de la tendance (pas sa direction) :
- ADX < 20 → marché en range (EMA/MACD peu fiables)
- ADX 20-25 → tendance faible
- ADX 25-40 → tendance modérée à forte ✓
- ADX > 40 → tendance très forte (potentiel épuisement)

### FVG (Fair Value Gap)
Détecte les zones d'imbalance entre 3 bougies consécutives :
```python
# FVG haussier : le bas de la bougie 3 est au-dessus du haut de la bougie 1
if lows[i] > highs[i-2]:
    fvg_zone = (highs[i-2], lows[i])  # zone entre les deux bougies
```
Ces zones agissent comme des aimants — le prix tend à y revenir.

---

## `analysis/market_context.py` — La phase du marché

Avant d'analyser les indicateurs, on détermine dans quel type de marché on est.

**Détection des pivots** (swing highs/lows) :
```python
# Un pivot high = le plus haut parmi ses 3 voisins de chaque côté
if all(highs[i] >= highs[j] for j in range(i-3, i+4) if j != i):
    pivot_highs.append((i, highs[i]))
```

**Structure de marché** :
- 2 derniers pivots hauts croissants + 2 derniers pivots bas croissants → **HH+HL = haussier**
- 2 derniers pivots hauts décroissants + 2 derniers pivots bas décroissants → **LH+LL = baissier**

**Garde importante** : si la structure est baissière (LH+LL) et que le signal est BUY → signal bloqué.
Un signal BUY contre une structure baissière = faux signal.

---

## `analysis/signal_lock.py` — Le verrou de signal

C'est la pièce la plus importante pour la stabilité.

**Problème sans verrou** : le signal change toutes les 24 secondes (bruit du marché).
**Solution** : on verrouille le signal à la clôture d'une bougie M15 et on ne recalcule pas avant la prochaine.

```python
def should_recalculate(self, current_candle_epoch):
    if self._tick_count < 30:
        return False  # pas encore assez de données
    if self._locked is None:
        return True   # pas de signal → calculer
    if not self._locked.is_valid:
        return True   # verrou expiré → recalculer
    if current_candle_epoch > self._last_candle_epoch:
        return True   # nouvelle bougie M15 → recalculer
    return False      # signal encore valide → garder
```

**Invalidation immédiate** : même pendant le verrou, si les conditions cassent (support rompu, EMA inversée, RSI extrême), le verrou est cassé et le signal passe à NEUTRAL.

---

## `analysis/confirmation.py` — La validation sur N bougies

Un signal n'est actionnable que si les conditions sont vraies sur **3 bougies consécutives**.

```python
for i in range(3):  # 3 bougies
    sub_closes = closes[:len(closes) - i]  # sous-série jusqu'à cette bougie
    e20 = ema(sub_closes, 20)
    e50 = ema(sub_closes, 50)
    r14 = rsi(sub_closes, 14)
    m   = macd(sub_closes)

    if direction == "BUY":
        candle_ok = (e20 > e50) and (r14 > 45) and (m["histogram"] > 0) and (plus_di > minus_di)

    if not candle_ok:
        break  # une bougie échoue → confirmation échouée
```

Si la confirmation échoue → `confirmation_ok = False` → mise = 0$ → pas de verrou.

**Profil Price Action** (étape 4b) : si un pattern de bougie fort est détecté sur M5 (Engulfing, Pinbar, Marubozu), il peut valider le signal même sans les 3 bougies indicateurs.

---

## `analysis/strategies/scorer.py` — L'orchestrateur

Lance les 4 stratégies et cherche un consensus.

**Règle de consensus** : minimum 3/4 stratégies doivent être d'accord.
P2dro (stratégie 4) compte double car c'est la méthode prioritaire.

```python
effective_buy = len(buy_sigs) + (1 if p2dro_buy else 0)

if effective_buy >= 3:
    final_dir = "BUY"
    avg_score = moyenne des scores des stratégies BUY
```

**Bonus de concordance** :
- 4/4 stratégies d'accord → +8 pts
- 3/4 stratégies d'accord → +5 pts
- P2dro confirme → +10 pts supplémentaires

**Filtres anti-faux signaux** :
```python
# Range trop étroit → marché sans direction
if (resistance - support) / atr < 1.5:
    filtered_out = True

# Bougie trop grande → mouvement épuisé
if abs(close[-1] - open[-1]) > 2 * atr_mean:
    filtered_out = True
```

---

## `analysis/engine.py` — Le cerveau (flux complet)

La fonction `analyze()` orchestre tout dans l'ordre :

```python
def analyze(symbol, base_amount):
    # 0. Vérifier le verrou
    if not signal_lock.should_recalculate(candle_epoch):
        return signal_verrouillé + check_invalidation()

    # 1. Contexte marché (M15)
    result.context = compute_market_context(...)

    # 2. Analyse par TF
    for gran in TIMEFRAMES:
        result.timeframes[label] = _analyze_tf(gran)

    # GARDE 1 : volatilité extrême → bloquer
    if result.global_regime == "unstable":
        return signal_NEUTRAL

    # Vote MTF
    if mtf_bull >= 3: signal = "BUY"
    elif mtf_bear >= 3: signal = "SELL"

    # GARDE 2 : structure contradictoire → bloquer
    if signal == "BUY" and context.structure == "bearish":
        signal = "NEUTRAL"

    # 3. Stratégies
    result.strategies = run_strategies(...)
    # GARDE 3 : scorer bloqué → annuler
    if strategies.filtered_out:
        signal = "NEUTRAL"

    # 4. Confirmation 3 bougies
    result.confirmation = check_confirmation(...)
    if not confirmation.confirmed:
        confirmation_ok = False  # signal visible mais pas actionnable

    # 4b. Price Action M5
    result.price_action = check_price_action_confirmation(...)

    # 5. FVG
    result.fvgs = detect_fvg(...)

    # 6. Verrou
    if signal_actionnable and confidence >= 60:
        signal_lock.lock(signal, duration=900 ou 600)
```

**Les 4 gardes** sont les filtres de sécurité qui bloquent les faux signaux :
1. Volatilité extrême → stop
2. Structure contradictoire → stop
3. Scorer bloqué → stop
4. Confirmation échouée → signal visible mais mise = 0$

---

## `assets.py` — Le catalogue des actifs

Chaque actif a un profil complet :
```python
Asset(
    symbol="R_50",
    family="volatility",
    risk_profile="high",
    volatility_factor=1.5,  # TP = ATR × 1.5
    min_duration=3,          # durée min conseillée (minutes)
    max_duration=120,        # durée max conseillée (minutes)
)
```

Le `volatility_factor` est utilisé par `position_manager.py` pour calibrer le TP selon l'actif.
Les Boom/Crash ont un facteur de 2.5 car leurs mouvements sont plus amples.

---

## Concepts clés à retenir

| Concept | Explication simple |
|---------|-------------------|
| `deque(maxlen=N)` | Liste circulaire — quand elle est pleine, le plus ancien élément est supprimé automatiquement |
| `asyncio.create_task()` | Lance une fonction en arrière-plan sans bloquer le reste |
| `WebSocket` | Connexion persistante bidirectionnelle (pas de requête/réponse comme HTTP) |
| `Zustand` (frontend) | Gestionnaire d'état global React — remplace Redux, plus simple |
| `EMA` | Moyenne mobile qui réagit plus vite aux prix récents |
| `ATR` | Mesure combien le prix bouge en moyenne — sert à calibrer TP/SL |
| `ADX` | Mesure si le marché est en tendance ou en range — filtre les faux signaux |
| `FVG` | Zone de prix "vide" que le marché tend à combler — niveau d'entrée optimal |
| `Signal Lock` | Le signal est figé pendant 10-15 min pour éviter les changements parasites |
| `Confirmation` | 3 bougies consécutives doivent valider avant d'entrer — réduit les faux signaux |
