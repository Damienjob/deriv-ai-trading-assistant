# Deriv AI Trading Assistant — Présentation complète

**Un copilote d'analyse de marché connecté en temps réel à Deriv.**
Conçu pour les traders sérieux qui veulent des décisions structurées, pas des intuitions.

---

## Le problème que tout trader connaît

Tu regardes un graphique. Tu vois un signal haussier sur M5. Tu entres. 30 secondes après, le signal s'inverse. Tu sors en perte. Puis le marché repart dans ta direction initiale.

Ce n'est pas un manque de compétence. C'est le **bruit du marché** — des micro-mouvements qui déclenchent de faux signaux sur un seul timeframe. La solution professionnelle : analyser plusieurs timeframes simultanément, attendre une confirmation structurelle, et ne jamais entrer sur un signal isolé.

C'est exactement ce que fait cet assistant. Automatiquement. En temps réel.

---

## Ce que l'assistant analyse à chaque tick

### 1. Analyse multi-timeframe simultanée (4 TF)

À chaque prix reçu, l'assistant analyse **4 timeframes en parallèle** :

| Timeframe | Rôle | Poids |
|-----------|------|-------|
| 1h | Direction macro — tendance de fond | 4 |
| 15min | Zone d'entrée — structure principale | 3 |
| 5min | Timing — déclencheur | 2 |
| 1min | Confirmation immédiate | 1 |

Sur chaque timeframe, 8 indicateurs sont calculés :
- **EMA 20/50/200** — direction de tendance et croisements
- **RSI 14** — momentum, surachat/survente
- **MACD 12/26/9** — accélération et croisements
- **ATR 14** — volatilité réelle (sert à calibrer TP et SL)
- **Bollinger Bands 20/2σ** — niveaux statistiques de prix
- **Support / Résistance** — niveaux structurels sur 30 bougies
- **ADX 14** — force de la tendance (filtre les marchés en range)
- **FVG** — Fair Value Gaps (zones d'imbalance Smart Money)

Un signal BUY sur M1 qui contredit H1 est **automatiquement bloqué**. L'assistant n'émet un signal que quand au moins 3 timeframes sur 4 sont alignés dans la même direction.

---

### 2. Contexte de marché (avant tout signal)

Avant même de regarder les indicateurs, l'assistant détermine dans quel type de marché on est :

- **Phase** : tendance haussière / tendance baissière / range / breakout
- **Structure** : HH+HL (haussier) / LH+LL (baissier) / mixte
- **Volatilité** : faible / modérée / élevée / extrême

Si la structure est baissière (LH+LL) et que les indicateurs donnent un BUY → signal bloqué. Un BUY contre une structure baissière est un faux signal dans 80% des cas.

Si la volatilité est extrême → aucune entrée possible, peu importe les indicateurs.

---

### 3. Les 4 stratégies en parallèle

L'assistant ne se base pas sur une seule stratégie. Il en lance **4 simultanément** et cherche un consensus :

**Stratégie 1 — Trend + Pullback** (seuil ≥ 80/100)
Entrer dans le sens de la tendance après un repli sur EMA.
Conditions : tendance EMA50/200 confirmée + pullback sur EMA20/50 (tolérance 0.5×ATR) + bougie de confirmation + RSI favorable.

**Stratégie 2 — Breakout + Retest** (seuil ≥ 85/100)
Cassure d'un niveau clé, retour pour le tester, puis reprise.
Conditions : cassure validée > 0.2×ATR + retest ±0.6×ATR + bougie de confirmation + mouvement non épuisé (< 2×ATR).

**Stratégie 3 — Multi-TF H1/M15/M5** (seuil ≥ 70/100)
Alignement de 3 timeframes : tendance H1 + zone d'entrée M15 + déclencheur M5 (MACD croise + engulfing).

**Stratégie 4 — P2dro** (seuil ≥ 75/100) — méthode prioritaire
Pin Bar sur niveau clé + divergence RSI + ligne de tendance H1/M30.
Cette stratégie compte **double** dans le consensus car elle est la plus précise.

**Règle de consensus** : minimum 3/4 stratégies doivent être d'accord.
Si P2dro est actif + 1 autre stratégie → signal valide (P2dro compte double).

**Filtres anti-faux signaux** :
- Range trop étroit (< 1.5×ATR) → marché sans direction → signal bloqué
- Dernière bougie M15 > 2×ATR → mouvement épuisé → signal bloqué
- Stratégies 1 et 3 en contradiction → pénalité -10 pts

---

### 4. Confirmation structurelle — 3 bougies consécutives

C'est le filtre le plus important contre les faux signaux.

Un signal n'est **actionnable** que si les conditions sont vraies sur **3 bougies M15 consécutives** :
1. EMA20 > EMA50 (BUY) ou EMA20 < EMA50 (SELL)
2. RSI > 45 (BUY) ou RSI < 55 (SELL)
3. MACD histogram dans le bon sens
4. +DI > -DI (BUY) ou -DI > +DI (SELL) — pression directionnelle confirmée

Si une seule bougie échoue → signal visible dans l'interface mais **mise = 0$, pas d'entrée**.

**Confirmation Price Action M5** (en parallèle) :
Si un pattern de bougie fort est détecté sur M5 (Engulfing, Pinbar, Marubozu) sur un niveau clé (FVG, Order Block, Support, EMA), il peut valider le signal même sans les 3 bougies indicateurs. C'est le feu vert immédiat pour les traders qui veulent entrer plus tôt.

---

### 5. Fair Value Gaps (Smart Money Concept)

L'assistant détecte les **zones d'imbalance** sur les 60 dernières bougies M15.

Un FVG est créé quand le marché se déplace si vite qu'il laisse un vide entre 3 bougies :
```
FVG haussier : low[bougie 3] > high[bougie 1]  →  zone d'achat potentielle
FVG baissier : high[bougie 3] < low[bougie 1]  →  zone de vente potentielle
```

Ces zones agissent comme des aimants — le prix tend à y revenir avant de reprendre sa direction.

**Intégration dans le signal** :
- FVG fort (> 0.5×ATR) et proche → +8 pts de confiance
- FVG moyen (> 0.2×ATR) et proche → +4 pts
- Prix dans la zone FVG → message "Entrée optimale ⚡" + +5 pts supplémentaires
- Affiché sur le graphique en zones colorées

---

### 6. Verrou de signal — stabilité garantie

**Le problème** : sans verrou, le signal change toutes les 24 secondes (bruit du marché).

**La solution** : le signal est verrouillé à la clôture d'une bougie M15 et ne change pas avant la prochaine.

```
10h00:00  Bougie M15 clôture  →  Analyse complète  →  Signal BUY verrouillé 15min
10h00:25  Tick reçu           →  Prix mis à jour   →  Signal BUY maintenu
10h07:43  Tick reçu           →  Check invalidation →  Signal BUY maintenu (pas de cassure)
10h15:00  Nouvelle bougie M15 →  Analyse complète  →  Nouveau signal calculé
```

**Durée du verrou** : 15 minutes si confiance ≥ 80%, 10 minutes sinon.

**Invalidation immédiate** (même pendant le verrou) :
- BUY invalidé si : support cassé (- 0.5×ATR), EMA20 < EMA50, RSI < 32
- SELL invalidé si : résistance cassée (+ 0.5×ATR), EMA20 > EMA50, RSI > 68

Quand le signal est invalidé → bannière rouge ⚠ "Signal invalidé — ne pas entrer".

---

## Le plan de position — tout est calculé automatiquement

Quand un signal est confirmé et actionnable, l'assistant génère un **plan de position complet** :

### Take Profit et Stop Loss

Basés sur l'ATR (volatilité réelle de l'actif) :
- **Stop Loss** = ATR × 1.5 (protège le capital)
- **Take Profit** = ATR × facteur actif (adapté à chaque actif)

Le facteur varie selon l'actif :
| Actif | Facteur TP | Logique |
|-------|-----------|---------|
| Volatility 10/25 | 1.5× | Mouvements modérés |
| Volatility 50/75 | 1.5–1.8× | Mouvements plus amples |
| Volatility 100 | 2.0× | Très volatil |
| Boom/Crash | 2.5× | Spikes importants |
| Step Index | 1.2× | Mouvements réguliers |

En marché calme → TP élargi à 1.2× le facteur normal (plus de marge).
En marché instable → SL resserré à 1.0× ATR (protection renforcée).

### Mise recommandée

Calculée selon 3 critères :

| Alignement MTF | Mise max |
|---------------|---------|
| 4/4 TF alignés | 3% du capital |
| 3/4 TF alignés | 2% du capital |
| 2/4 TF alignés | 1% du capital |
| < 2/4 TF | 0$ — ne pas entrer |

La mise est ensuite modulée par la confiance :
- Confiance 60% → 50% du plafond
- Confiance 80% → 75% du plafond
- Confiance 100% → 100% du plafond

**Exemple concret** : capital 500$, 3/4 TF alignés, confiance 80%
→ Plafond = 2% × 500$ = 10$ → Mise = 10$ × 75% = **7.50$**

### Risk/Reward

Calculé automatiquement : TP distance / SL distance.
Un R:R ≥ 1.5 est requis pour que le signal soit considéré comme rentable sur le long terme.

### Répétitions

L'assistant calcule combien de fois tu peux répéter la même position sans risquer le capital :
- Budget série = 10% du capital max
- Maximum 5 répétitions consécutives
- Règle : arrêter après 2 SL consécutifs

### Durée estimée

Adaptée à chaque actif :
- Volatility 100 (1s) : 1–15 minutes
- Volatility 50 : 3–120 minutes
- Step Index : 5–480 minutes

---

## Les ordres en attente — quand le signal est insuffisant

Quand la confiance est < 70% ou que le signal n'est pas encore confirmé, l'assistant ne dit pas juste "attendre". Il calcule les **prix cibles précis** où entrer pour obtenir ≥ 70% de confiance.

Ces niveaux sont basés sur :
- Support / Résistance structurels
- Niveaux de Fibonacci (38.2%, 50%, 61.8%)
- Bandes de Bollinger (BB basse pour BUY, BB haute pour SELL)
- EMA dynamiques (EMA20 et EMA50 comme zones d'appui)

Pour chaque niveau, l'assistant simule la confiance estimée si le prix y arrive et n'affiche que les niveaux qui atteindraient ≥ 70%.

**Exemple** : prix actuel 90.42, signal faible BUY 55%
→ "Attendre que le prix recule vers 90.18 (EMA50 — support dynamique). Confiance estimée à ce niveau : 74%."

---

## Les actifs disponibles

### Volatility Indices — pour tous les profils
| Symbole | Volatilité | Profil | Durée conseillée |
|---------|-----------|--------|-----------------|
| R_10 | 10% | Modéré | 5min – 4h |
| R_25 | 25% | Modéré | 5min – 3h |
| R_50 | 50% | Élevé | 3min – 2h |
| R_75 | 75% | Élevé | 2min – 1h |
| R_100 | 100% | Extrême | 1min – 30min |
| 1HZ50V | 50% (1s) | Élevé | 1min – 1h |
| 1HZ100V | 100% (1s) | Extrême | 1min – 15min |

### Boom Indices — BUY uniquement ⚡
Spikes haussiers aléatoires. L'assistant ne génère que des signaux BUY sur ces actifs.
| Symbole | Fréquence spike | Durée max |
|---------|----------------|-----------|
| BOOM300N | ~1/300 ticks | 1h |
| BOOM500 | ~1/500 ticks | 1h30 |
| BOOM1000 | ~1/1000 ticks | 2h |

### Crash Indices — SELL uniquement ⚡
Spikes baissiers aléatoires. L'assistant ne génère que des signaux SELL sur ces actifs.
| Symbole | Fréquence spike | Durée max |
|---------|----------------|-----------|
| CRASH300N | ~1/300 ticks | 1h |
| CRASH500 | ~1/500 ticks | 1h30 |
| CRASH1000 | ~1/1000 ticks | 2h |

### Step Index — le plus régulier
Mouvements de ±0.1 réguliers, spread minimal. Idéal pour les stratégies de range.

---

## Comment utiliser l'assistant — guide pas à pas

### Étape 1 — Ouvrir le Dashboard

Sélectionne ton actif dans le sélecteur. Commence par **Volatility 50 (1s)** si tu veux un bon équilibre entre fréquence de signaux et volatilité.

### Étape 2 — Définir ton capital

Entre ton capital dans "Capital Settings". L'assistant affiche immédiatement les mises à 1%, 2% et 3% pour que tu visualises les montants réels.

### Étape 3 — Lire la bannière de décision

La bannière principale affiche l'une de ces 4 situations :

**✅ ACHETEZ** — Signal BUY confirmé, actionnable maintenant
→ Confiance, mise recommandée, TP, SL, durée estimée

**✅ VENDEZ** — Signal SELL confirmé, actionnable maintenant
→ Mêmes informations

**⏳ Attendre** — Signal visible mais pas encore confirmé sur 3 bougies
→ L'assistant te dit combien de bougies ont validé (ex : "2/3 bougies")
→ Les ordres en attente te donnent les prix cibles

**⛔ Ne pas entrer** — Volatilité extrême, structure contradictoire, ou stratégies bloquées
→ L'assistant explique pourquoi en langage clair

### Étape 4 — Lire le plan de position

Quand le signal est ✅, le panneau "Plan de position" affiche :
```
Direction  : BUY
Entrée     : 90.4258
Take Profit: 90.5812  (+15.54 pips)
Stop Loss  : 90.3421  (-8.37 pips)
Risk/Reward: 1.86
Mise       : 2.00$ (2% du capital)
Gain pot.  : +3.72$
Perte max  : -2.00$
Durée      : 3–120 minutes
Répétitions: max 3x (arrêter après 2 SL consécutifs)
```

Tu copies ces valeurs dans Deriv et tu places le trade.

### Étape 5 — Surveiller l'invalidation

Pendant que le trade est ouvert, l'assistant surveille tick par tick si les conditions cassent.
Si la bannière passe en rouge ⚠ "Signal invalidé" → sors de ta position immédiatement.

### Étape 6 — Utiliser le graphique

Le graphique Lightweight Charts affiche :
- Bougies OHLC en temps réel (sélecteur 1min / 5min / 15min / 1h)
- EMA20 (bleu) et EMA50 (orange) — tendance
- Bollinger Bands (rouge/vert pointillés) — niveaux statistiques
- Zones FVG (violet) — zones d'imbalance Smart Money
- Support (bleu tirets) et Résistance (orange tirets)
- Flèche verte/rouge sur la bougie du signal

---

## Ce que l'assistant ne fait pas

- Il **n'exécute pas** les trades automatiquement — tu gardes le contrôle total
- Il **ne garantit pas** les gains — aucun outil ne peut le faire
- Il **ne remplace pas** ton jugement — il l'augmente avec des données structurées

---

## Pourquoi faire confiance à ce système

**Transparence totale** : l'assistant explique chaque décision. Tu vois exactement quels indicateurs ont voté, quelles stratégies sont actives, pourquoi le signal est bloqué ou confirmé.

**Pas de boîte noire** : tous les calculs sont déterministes et reproductibles. EMA, RSI, MACD, ATR, ADX, FVG — des indicateurs éprouvés, pas des algorithmes opaques.

**Conçu pour éviter les pertes** : les 4 gardes de sécurité (volatilité extrême, structure contradictoire, scorer bloqué, confirmation échouée) bloquent les entrées risquées avant même que tu les voies.

**Adapté aux Synthetic Indices** : les seuils de volatilité, les facteurs TP/SL et les durées sont calibrés spécifiquement pour les indices synthétiques Deriv — pas des paramètres génériques copiés du forex.

---

## Règles d'or pour être rentable

1. **Ne jamais entrer si la confiance est < 70%** — attends le prochain signal
2. **Toujours respecter le Stop Loss** — ne jamais le déplacer
3. **Boom = BUY uniquement, Crash = SELL uniquement** — jamais l'inverse
4. **Maximum 3% du capital par trade** — même si tu es très confiant
5. **Arrêter après 2 SL consécutifs** — le marché n'est pas dans ta direction, attendre
6. **Ne pas trader en volatilité extrême** — l'assistant bloque automatiquement, fais confiance

---

## Démarrage rapide

```bash
# Backend (Python 3.12 requis)
cd backend
py -3.12 -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python run.py
# → http://localhost:8000

# Frontend
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

Pour voir ton solde et tes positions Deriv, ajoute ton token API dans `backend/.env` :
```
DERIV_API_TOKEN=ton_token_ici
```
Créer un token : https://app.deriv.com/account/api-token (permissions : Read + Trade)

---

> ⚠️ Cet assistant est un outil d'aide à la décision. Il ne garantit aucun gain.
> Tout trading comporte un risque de perte en capital.
> Ne jamais trader avec de l'argent que tu ne peux pas te permettre de perdre.
> Les indices synthétiques Deriv (Boom/Crash notamment) peuvent générer des pertes très rapides.
