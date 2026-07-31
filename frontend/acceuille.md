<!DOCTYPE html>

<html class="dark" lang="fr"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Quantum Terminal | Copilote de Signaux IA</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;family=JetBrains+Mono:wght@500&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    "colors": {
                        "background": "#0b1326",
                        "outline": "#8c909f",
                        "on-secondary-fixed-variant": "#005236",
                        "on-primary-fixed": "#001a42",
                        "on-background": "#dae2fd",
                        "inverse-surface": "#dae2fd",
                        "surface-tint": "#adc6ff",
                        "primary-fixed-dim": "#adc6ff",
                        "warning-amber": "#F59E0B",
                        "tertiary": "#ffb2b7",
                        "on-primary-fixed-variant": "#004395",
                        "on-secondary-container": "#00311f",
                        "error": "#ffb4ab",
                        "surface": "#0b1326",
                        "surface-container-low": "#131b2e",
                        "error-container": "#93000a",
                        "on-error-container": "#ffdad6",
                        "surface-container": "#171f33",
                        "on-surface": "#dae2fd",
                        "secondary-container": "#00a572",
                        "on-tertiary": "#67001b",
                        "on-tertiary-fixed-variant": "#92002a",
                        "tertiary-fixed-dim": "#ffb2b7",
                        "surface-dim": "#0b1326",
                        "surface-container-highest": "#2d3449",
                        "chart-grid": "#1E293B",
                        "smc-purple": "#8B5CF6",
                        "on-tertiary-fixed": "#40000d",
                        "surface-container-high": "#222a3d",
                        "on-tertiary-container": "#5b0017",
                        "on-secondary-fixed": "#002113",
                        "tertiary-fixed": "#ffdadb",
                        "on-primary-container": "#00285d",
                        "inverse-primary": "#005ac2",
                        "fvg-fill": "rgba(139, 92, 246, 0.1)",
                        "primary-container": "#4d8eff",
                        "on-surface-variant": "#c2c6d6",
                        "on-primary": "#002e6a",
                        "surface-container-lowest": "#060e20",
                        "secondary": "#4edea3",
                        "outline-variant": "#424754",
                        "surface-variant": "#2d3449",
                        "primary": "#adc6ff",
                        "primary-fixed": "#d8e2ff",
                        "tertiary-container": "#ff516a",
                        "on-secondary": "#003824",
                        "surface-bright": "#31394d",
                        "inverse-on-surface": "#283044",
                        "surface-glass": "rgba(30, 41, 59, 0.7)",
                        "secondary-fixed-dim": "#4edea3",
                        "secondary-fixed": "#6ffbbe",
                        "on-error": "#690005"
                    },
                    "borderRadius": {
                        "DEFAULT": "0.125rem",
                        "lg": "0.25rem",
                        "xl": "0.5rem",
                        "full": "0.75rem"
                    },
                    "spacing": {
                        "section-gap": "32px",
                        "container-margin": "24px",
                        "card-padding": "20px",
                        "unit": "4px",
                        "gutter-md": "16px"
                    },
                    "fontFamily": {
                        "headline-md": ["Inter"],
                        "display-xl": ["Inter"],
                        "body-md": ["Inter"],
                        "headline-lg": ["Inter"],
                        "label-sm": ["Inter"],
                        "data-mono": ["JetBrains Mono"],
                        "body-lg": ["Inter"]
                    },
                    "fontSize": {
                        "headline-md": ["24px", {"lineHeight": "32px", "fontWeight": "600"}],
                        "display-xl": ["48px", {"lineHeight": "56px", "letterSpacing": "-0.02em", "fontWeight": "700"}],
                        "body-md": ["16px", {"lineHeight": "24px", "fontWeight": "400"}],
                        "headline-lg": ["32px", {"lineHeight": "40px", "fontWeight": "600"}],
                        "label-sm": ["12px", {"lineHeight": "16px", "fontWeight": "600"}],
                        "data-mono": ["14px", {"lineHeight": "20px", "fontWeight": "500"}],
                        "body-lg": ["18px", {"lineHeight": "28px", "fontWeight": "400"}]
                    }
                }
            }
        }
    </script>
<style>
        body {
            background-color: #0b1326;
            color: #dae2fd;
            overflow-x: hidden;
        }
        .glass-panel {
            background: rgba(30, 41, 59, 0.7);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .hero-gradient {
            background: radial-gradient(circle at 50% 50%, rgba(77, 142, 255, 0.15) 0%, transparent 70%);
        }
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .ticker-wrap {
            width: 100%;
            overflow: hidden;
            background: rgba(11, 19, 38, 0.8);
            border-bottom: 1px solid rgba(140, 144, 159, 0.1);
        }
        .ticker-move {
            display: inline-block;
            white-space: nowrap;
            animation: ticker 30s linear infinite;
        }
        @keyframes ticker {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
        }
        .flow-step {
            @apply relative flex flex-col items-center text-center p-6;
        }
        .flow-line::after {
            content: '';
            position: absolute;
            top: 2rem;
            right: -50%;
            width: 100%;
            height: 2px;
            background: linear-gradient(90deg, #adc6ff 0%, transparent 100%);
            z-index: 0;
        }
    </style>
</head>
<body class="font-body-md text-body-md">
<!-- Top Navigation -->
<header class="fixed top-0 w-full z-50 bg-surface-glass backdrop-blur-xl border-b border-outline-variant/10 shadow-sm">
<nav class="flex justify-between items-center h-16 px-6 w-full max-w-7xl mx-auto">
<div class="font-headline-md text-headline-md font-bold text-primary tracking-tight">
                QUANTUM TERMINAL
            </div>
<div class="hidden md:flex items-center gap-8">
<a class="text-on-surface-variant font-medium hover:text-primary transition-colors" href="#flow">Flux de Décision</a>
<a class="text-on-surface-variant font-medium hover:text-primary transition-colors" href="#features">Arsenal Pro</a>
<a class="text-on-surface-variant font-medium hover:text-primary transition-colors" href="#pricing">Tarifs</a>
<a class="bg-primary text-on-primary font-bold px-6 py-2 rounded-xl active:scale-95 duration-100 transition-all" href="#">Get Signals Now</a>
</div>
<div class="flex items-center gap-4">
<span class="material-symbols-outlined text-primary cursor-pointer">analytics</span>
<span class="material-symbols-outlined text-on-surface-variant cursor-pointer">notifications</span>
</div>
</nav>
</header>
<main class="pt-16">
<!-- Hero Section -->
<section class="relative min-h-[850px] flex items-center justify-center overflow-hidden py-20">
<div class="hero-gradient absolute inset-0"></div>
<div class="relative z-10 max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
<div class="space-y-8">
<div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-label-sm text-label-sm">
<span class="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                        AI SIGNAL COPILOT V2.4
                    </div>
<h1 class="font-display-xl text-display-xl text-on-background leading-tight">
                        Votre Copilote IA pour des <span class="text-primary">Signaux de Précision</span>.
                    </h1>
<p class="font-body-lg text-body-lg text-on-surface-variant max-w-xl">
                        Quantum Terminal n'est pas une plateforme de gestion. C'est une intelligence pure qui analyse les flux institutionnels pour vous livrer des points d'entrée optimaux.
                        <span class="block mt-4 font-bold text-primary tracking-wide">NO DEPOSITS • NO RISK TO CAPITAL • PURE INTELLIGENCE</span>
</p>
<div class="flex flex-wrap gap-4 pt-4">
<button class="bg-primary text-on-primary font-headline-md text-body-md px-8 py-4 rounded-xl font-bold hover:shadow-[0_0_20px_rgba(173,198,255,0.4)] transition-all active:scale-95">
                            Get Signals Now
                        </button>
<button class="glass-panel text-on-surface font-bold px-8 py-4 rounded-xl hover:bg-surface-variant/30 transition-all">
                            Voir le Flux de Décision
                        </button>
</div>
</div>
<div class="relative">
<div class="glass-panel p-2 rounded-2xl shadow-2xl overflow-hidden">
<img class="w-full h-auto rounded-xl" data-alt="A high-tech trading terminal interface displayed on a sleek glass monitor. The screen shows complex financial charts with neon green and red candlesticks, technical indicators like EMA and FVG zones, and a prominent 'Decision Banner' reading 'QUANTUM SIGNAL'. The environment is a dark, sophisticated futuristic trading room with subtle blue ambient lighting and a clean, institutional aesthetic." src="https://lh3.googleusercontent.com/aida-public/AB6AXuA0dtWrvZxSJGIIsElpLNb-2X8czExvbFq13ibMbN1TOZcqEP9DpFGpfKpPJiYXKm8pbgGgjlv9R_b5oFmn2G1BAIT8HC7WsPHAin7j-IrtkbY2iw3BuoF3999ESVBesdwzCCC2J9RkxiDY9dBOdfM0ALwPUPoZyFhLwyjFVH1EeR1Z-JJJvqf4v4hVisei8pQqEPjYdGbAVUgu9edm7RO8ZlTDuhlWo19NJ7zDpyUGxW0nZakb7VetaA"/>
<div class="absolute -bottom-6 -left-6 glass-panel p-4 rounded-xl border border-secondary/30 shadow-lg animate-bounce duration-[3000ms]">
<div class="flex items-center gap-3 mb-2">
<div class="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center">
<span class="material-symbols-outlined text-secondary">verified</span>
</div>
<div>
<div class="font-label-sm text-label-sm text-secondary">SIGNAL LOCK</div>
<div class="font-data-mono text-data-mono">V75 - SELL @ 452.10</div>
</div>
</div>
<div class="text-xs text-on-surface-variant opacity-60">Confiance IA: 98.4%</div>
</div>
</div>
</div>
</div>
</section>
<!-- 6-Step Decision Flow -->
<section class="py-24 bg-surface-container-lowest/30" id="flow">
<div class="max-w-7xl mx-auto px-6">
<div class="text-center mb-16 space-y-4">
<h2 class="font-headline-lg text-headline-lg text-on-background">Le Flux de Décision en 6 Étapes</h2>
<p class="text-on-surface-variant max-w-2xl mx-auto">Comment notre IA valide chaque opportunité avant de vous la présenter.</p>
</div>
<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
<!-- Step 1 -->
<div class="glass-panel p-6 rounded-2xl text-center space-y-4 border-b-2 border-primary/20">
<div class="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary font-bold">1</div>
<h4 class="font-bold text-sm">Market Context</h4>
<p class="text-xs text-on-surface-variant">Analyse de la structure globale du marché.</p>
</div>
<!-- Step 2 -->
<div class="glass-panel p-6 rounded-2xl text-center space-y-4 border-b-2 border-primary/20">
<div class="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary font-bold">2</div>
<h4 class="font-bold text-sm">MTF Alignment</h4>
<p class="text-xs text-on-surface-variant">Confluence de M1 à H4 pour une tendance claire.</p>
</div>
<!-- Step 3 -->
<div class="glass-panel p-6 rounded-2xl text-center space-y-4 border-b-2 border-primary/20">
<div class="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary font-bold">3</div>
<h4 class="font-bold text-sm">Strategies</h4>
<p class="text-xs text-on-surface-variant">Application des algorithmes SMC &amp; Price Action.</p>
</div>
<!-- Step 4 -->
<div class="glass-panel p-6 rounded-2xl text-center space-y-4 border-b-2 border-secondary/20">
<div class="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center mx-auto text-secondary font-bold">4</div>
<h4 class="font-bold text-sm">Confirmation</h4>
<p class="text-xs text-on-surface-variant">Validation par indicateurs de momentum (RSI/MACD).</p>
</div>
<!-- Step 5 -->
<div class="glass-panel p-6 rounded-2xl text-center space-y-4 border-b-2 border-secondary/20">
<div class="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center mx-auto text-secondary font-bold">5</div>
<h4 class="font-bold text-sm">FVG Detection</h4>
<p class="text-xs text-on-surface-variant">Ciblage des zones d'inefficience (Fair Value Gap).</p>
</div>
<!-- Step 6 -->
<div class="glass-panel p-6 rounded-2xl text-center space-y-4 border-b-2 border-primary shadow-[0_0_15px_rgba(173,198,255,0.2)]">
<div class="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto text-on-primary font-bold">6</div>
<h4 class="font-bold text-sm">Signal Lock</h4>
<p class="text-xs text-on-surface-variant">Génération de l'alerte avec Risk/Reward optimal.</p>
</div>
</div>
</div>
</section>
<!-- Market Ticker -->
<div class="ticker-wrap py-3">
<div class="ticker-move">
<span class="px-8 font-data-mono text-data-mono text-secondary">BOOM 300: 1024.08 (+0.42%)</span>
<span class="px-8 font-data-mono text-data-mono text-error">CRASH 500: 4946.16 (-0.12%)</span>
<span class="px-8 font-data-mono text-data-mono text-secondary">V10 INDEX: 142.92 (+1.05%)</span>
<span class="px-8 font-data-mono text-data-mono text-secondary">STEP INDEX: 8902.11 (+0.05%)</span>
<span class="px-8 font-data-mono text-data-mono text-secondary">BOOM 300: 1024.08 (+0.42%)</span>
<span class="px-8 font-data-mono text-data-mono text-error">CRASH 500: 4946.16 (-0.12%)</span>
<span class="px-8 font-data-mono text-data-mono text-secondary">V10 INDEX: 142.92 (+1.05%)</span>
<span class="px-8 font-data-mono text-data-mono text-secondary">STEP INDEX: 8902.11 (+0.05%)</span>
</div>
</div>
<!-- Professional Arsenal -->
<section class="py-24 max-w-7xl mx-auto px-6" id="features">
<div class="text-center mb-16 space-y-4">
<h2 class="font-headline-lg text-headline-lg text-on-background">Arsenal de Précision</h2>
<p class="text-on-surface-variant max-w-2xl mx-auto">Conçu pour maximiser la justesse des signaux et sécuriser votre approche mathématique.</p>
</div>
<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
<!-- Accuracy -->
<div class="md:col-span-2 glass-panel p-8 rounded-2xl relative overflow-hidden group">
<div class="relative z-10">
<span class="material-symbols-outlined text-4xl text-primary mb-6">target</span>
<h3 class="font-headline-md text-headline-md mb-4">Précision des Signaux (94%+)</h3>
<p class="text-on-surface-variant mb-6 max-w-md">Notre algorithme n'émet un signal que lorsqu'une probabilité statistique supérieure à 90% est atteinte via le flux de décision en 6 étapes.</p>
<div class="flex gap-2">
<span class="px-3 py-1 rounded bg-surface-container-high text-xs font-data-mono">STRICT FILTERS</span>
<span class="px-3 py-1 rounded bg-surface-container-high text-xs font-data-mono">NO NOISE</span>
</div>
</div>
</div>
<!-- Risk Calculator -->
<div class="glass-panel p-8 rounded-2xl border-l-4 border-secondary">
<span class="material-symbols-outlined text-4xl text-secondary mb-6">calculate</span>
<h3 class="font-headline-md text-headline-md mb-4">Calcul du Risque</h3>
<p class="text-on-surface-variant">Chaque signal inclut le lot exact à utiliser selon votre capital pour ne jamais dépasser 1% de risque par trade.</p>
</div>
<!-- SMC/FVG -->
<div class="glass-panel p-8 rounded-2xl">
<span class="material-symbols-outlined text-4xl text-tertiary mb-6">grid_view</span>
<h3 class="font-headline-md text-headline-md mb-4">SMC Auto-Detection</h3>
<p class="text-on-surface-variant">Identification chirurgicale des Order Blocks et Fair Value Gaps. L'IA voit ce que l'œil humain ignore.</p>
</div>
<!-- Decision Support -->
<div class="md:col-span-2 glass-panel p-8 rounded-2xl flex flex-col md:flex-row items-center gap-8">
<div class="flex-1">
<span class="material-symbols-outlined text-4xl text-warning-amber mb-6">security</span>
<h3 class="font-headline-md text-headline-md mb-4">Sécurité &amp; Intelligence</h3>
<p class="text-on-surface-variant">Quantum Terminal ne traite pas pour vous. Nous fournissons l'intelligence, vous gardez 100% de la souveraineté sur vos fonds. Aucun dépôt n'est possible.</p>
</div>
<div class="w-full md:w-64 h-40 bg-surface-container-highest rounded-xl flex items-center justify-center border border-outline-variant/20">
<div class="text-center p-4">
<div class="font-data-mono text-xl text-primary">PURE</div>
<div class="font-headline-md text-on-surface">INTELLIGENCE</div>
</div>
</div>
</div>
</div>
</section>
<!-- Pricing Section -->
<section class="py-24 max-w-7xl mx-auto px-6" id="pricing">
<div class="text-center mb-16">
<h2 class="font-headline-lg text-headline-lg mb-4">Activez votre Copilote</h2>
<p class="text-on-surface-variant">Choisissez le niveau d'intelligence requis pour votre trading.</p>
</div>
<div class="grid md:grid-cols-3 gap-8">
<!-- Basic -->
<div class="glass-panel p-8 rounded-2xl flex flex-col">
<div class="mb-8">
<div class="text-on-surface-variant font-bold mb-2">EXPLORATEUR</div>
<div class="text-4xl font-bold font-display-xl">GRATUIT</div>
<div class="text-sm opacity-50">Signaux basiques sur 3 indices</div>
</div>
<ul class="space-y-4 mb-8 flex-1">
<li class="flex items-center gap-2 text-sm"><span class="material-symbols-outlined text-secondary text-lg">check_circle</span> 3 Indices Synthétiques</li>
<li class="flex items-center gap-2 text-sm"><span class="material-symbols-outlined text-secondary text-lg">check_circle</span> Flux M15 / H1</li>
<li class="flex items-center gap-2 text-sm opacity-30"><span class="material-symbols-outlined text-lg">cancel</span> Calcul de Risque Auto</li>
</ul>
<button class="w-full py-3 rounded-xl border border-primary/30 text-primary font-bold hover:bg-primary/10 transition-all">Start Analysis</button>
</div>
<!-- Professional -->
<div class="glass-panel p-8 rounded-2xl flex flex-col border-2 border-primary shadow-[0_0_40px_rgba(173,198,255,0.2)] relative">
<div class="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-on-primary px-4 py-1 rounded-full text-xs font-bold tracking-widest">POPULAIRE</div>
<div class="mb-8">
<div class="text-primary font-bold mb-2">PROFESSIONNEL</div>
<div class="text-4xl font-bold font-display-xl">49€<span class="text-lg opacity-50">/mois</span></div>
<div class="text-sm opacity-50">L'intelligence totale en temps réel</div>
</div>
<ul class="space-y-4 mb-8 flex-1">
<li class="flex items-center gap-2 text-sm"><span class="material-symbols-outlined text-secondary text-lg">check_circle</span> Tous les Indices (Boom/Crash/V)</li>
<li class="flex items-center gap-2 text-sm"><span class="material-symbols-outlined text-secondary text-lg">check_circle</span> Flux de Décision 6 Étapes Complet</li>
<li class="flex items-center gap-2 text-sm"><span class="material-symbols-outlined text-secondary text-lg">check_circle</span> Calculateur de Risque Chirurgical</li>
<li class="flex items-center gap-2 text-sm"><span class="material-symbols-outlined text-secondary text-lg">check_circle</span> Alertes Signal Lock Prioritaires</li>
</ul>
<button class="w-full py-3 rounded-xl bg-primary text-on-primary font-bold hover:shadow-[0_0_15px_rgba(173,198,255,0.4)] transition-all">Get Signals Now</button>
</div>
<!-- Institutional -->
<div class="glass-panel p-8 rounded-2xl flex flex-col">
<div class="mb-8">
<div class="text-on-surface-variant font-bold mb-2">INSTITUTIONNEL</div>
<div class="text-4xl font-bold font-display-xl">199€<span class="text-lg opacity-50">/an</span></div>
<div class="text-sm opacity-50">Accès Premium illimité</div>
</div>
<ul class="space-y-4 mb-8 flex-1">
<li class="flex items-center gap-2 text-sm"><span class="material-symbols-outlined text-secondary text-lg">check_circle</span> Tout le pack Professionnel</li>
<li class="flex items-center gap-2 text-sm"><span class="material-symbols-outlined text-secondary text-lg">check_circle</span> Signaux "Low Drawdown" VIP</li>
<li class="flex items-center gap-2 text-sm"><span class="material-symbols-outlined text-secondary text-lg">check_circle</span> Support Prioritaire 24/7</li>
</ul>
<button class="w-full py-3 rounded-xl border border-primary/30 text-primary font-bold hover:bg-primary/10 transition-all">Accès Annuel</button>
</div>
</div>
</section>
<!-- CTA Final -->
<section class="py-24 relative overflow-hidden bg-primary/5">
<div class="relative z-10 max-w-4xl mx-auto px-6 text-center space-y-8">
<h2 class="font-display-xl text-display-xl">Recevez vos premiers signaux aujourd'hui</h2>
<p class="text-body-lg text-on-surface-variant">Rejoignez 5,000+ traders qui valident leurs décisions avec l'IA la plus précise du marché.</p>
<div class="flex justify-center">
<button class="bg-primary text-on-primary font-headline-md px-12 py-6 rounded-2xl font-bold shadow-xl hover:scale-105 transition-all">
                        GET SIGNALS NOW
                    </button>
</div>
<p class="text-xs opacity-50 italic">Pas de carte requise. Aucun dépôt de fonds nécessaire.</p>
</div>
</section>
</main>
<!-- Footer -->
<footer class="bg-surface-container-lowest border-t border-outline-variant/10 py-16">
<div class="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-12">
<div class="col-span-2 space-y-6">
<div class="font-headline-md text-primary font-bold tracking-tight">QUANTUM TERMINAL</div>
<p class="text-on-surface-variant text-sm max-w-sm">
                    Quantum Terminal est un assistant IA de génération de signaux. Nous fournissons des analyses de probabilité. <b>Nous ne gérons pas vos fonds, nous n'acceptons aucun dépôt.</b> Le trading comporte des risques réels de perte de capital. Notre outil est une aide à la décision mathématique.
                </p>
<div class="flex gap-4">
<span class="material-symbols-outlined cursor-pointer hover:text-primary">public</span>
<span class="material-symbols-outlined cursor-pointer hover:text-primary">share</span>
<span class="material-symbols-outlined cursor-pointer hover:text-primary">forum</span>
</div>
</div>
<div class="space-y-4">
<div class="font-bold">Copilote</div>
<ul class="space-y-2 text-sm text-on-surface-variant">
<li><a class="hover:text-primary" href="#">Signaux Live</a></li>
<li><a class="hover:text-primary" href="#">Flux de Décision</a></li>
<li><a class="hover:text-primary" href="#">Précision Algorithmique</a></li>
<li><a class="hover:text-primary" href="#">Documentation</a></li>
</ul>
</div>
<div class="space-y-4">
<div class="font-bold">Légal</div>
<ul class="space-y-2 text-sm text-on-surface-variant">
<li><a class="hover:text-primary" href="#">Mentions Légales</a></li>
<li><a class="hover:text-primary" href="#">Confidentialité</a></li>
<li><a class="hover:text-primary" href="#">Avertissement Risques</a></li>
</ul>
</div>
</div>
<div class="max-w-7xl mx-auto px-6 mt-16 pt-8 border-t border-outline-variant/5 text-center text-xs opacity-40">
            © 2024 QUANTUM TERMINAL. AI SIGNAL COPILOT. NO RISK TO CAPITAL • PURE INTELLIGENCE.
        </div>
</footer>
<script>
        document.addEventListener('DOMContentLoaded', () => {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('opacity-100', 'translate-y-0');
                        entry.target.classList.remove('opacity-0', 'translate-y-10');
                    }
                });
            }, { threshold: 0.1 });

            document.querySelectorAll('.glass-panel').forEach(el => {
                el.classList.add('transition-all', 'duration-700', 'opacity-0', 'translate-y-10');
                observer.observe(el);
            });
        });

        window.addEventListener('mousemove', (e) => {
            const moveX = (e.clientX - window.innerWidth / 2) * 0.01;
            const moveY = (e.clientY - window.innerHeight / 2) * 0.01;
            document.querySelectorAll('.hero-gradient').forEach(el => {
                el.style.transform = `translate(${moveX}px, ${moveY}px)`;
            });
        });
    </script>
</body></html>