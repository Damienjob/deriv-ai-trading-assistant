<!DOCTYPE html>

<html class="dark" lang="fr"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Deriv AI - Votre copilote IA pour des signaux de précision</title>
<!-- Fonts & Icons -->
<link href="https://fonts.googleapis.com" rel="preconnect"/>
<link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&amp;family=JetBrains+Mono:wght@500&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<!-- Tailwind CSS -->
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    "colors": {
                        "error": "#ffb4ab",
                        "surface-container-low": "#1c1b1b",
                        "outline": "#86948a",
                        "on-primary-container": "#00422b",
                        "surface-container-high": "#2a2a2a",
                        "on-secondary-container": "#83c2a9",
                        "primary-fixed-dim": "#4edea3",
                        "surface-dim": "#131313",
                        "surface-variant": "#353534",
                        "on-primary-fixed": "#002113",
                        "on-secondary-fixed": "#002117",
                        "on-background": "#e5e2e1",
                        "secondary": "#95d3ba",
                        "on-error-container": "#ffdad6",
                        "tertiary-container": "#67b191",
                        "background": "#131313",
                        "primary-container": "#10b981",
                        "on-tertiary-fixed": "#002115",
                        "tertiary-fixed-dim": "#8bd6b4",
                        "on-tertiary-container": "#00422e",
                        "surface-container-lowest": "#0e0e0e",
                        "primary-fixed": "#6ffbbe",
                        "secondary-fixed-dim": "#95d3ba",
                        "surface-tint": "#4edea3",
                        "surface-container": "#201f1f",
                        "tertiary-fixed": "#a6f2cf",
                        "outline-variant": "#3c4a42",
                        "tertiary": "#8bd6b4",
                        "inverse-on-surface": "#313030",
                        "on-error": "#690005",
                        "surface-container-highest": "#353534",
                        "on-secondary": "#003829",
                        "primary": "#4edea3",
                        "secondary-container": "#0b513d",
                        "on-surface": "#e5e2e1",
                        "error-container": "#93000a",
                        "inverse-surface": "#e5e2e1",
                        "secondary-fixed": "#b0f0d6",
                        "on-surface-variant": "#bbcabf",
                        "inverse-primary": "#006c49",
                        "surface-bright": "#3a3939",
                        "surface": "#131313",
                        "on-tertiary-fixed-variant": "#00513a",
                        "on-tertiary": "#003827",
                        "on-secondary-fixed-variant": "#0b513d",
                        "on-primary-fixed-variant": "#005236",
                        "on-primary": "#003824"
                    },
                    "borderRadius": {
                        "DEFAULT": "0.25rem",
                        "lg": "0.5rem",
                        "xl": "0.75rem",
                        "full": "9999px"
                    },
                    "spacing": {
                        "bento-gap": "1rem",
                        "grid-margin": "2rem",
                        "section-padding": "5rem",
                        "gutter": "1.5rem",
                        "card-padding": "1.5rem"
                    },
                    "fontFamily": {
                        "body-lg": ["Inter"],
                        "label-md": ["JetBrains Mono"],
                        "headline-sm": ["Inter"],
                        "display-lg": ["Inter"],
                        "headline-lg": ["Inter"],
                        "headline-md": ["Inter"],
                        "label-sm": ["JetBrains Mono"],
                        "body-md": ["Inter"],
                        "headline-lg-mobile": ["Inter"]
                    },
                    "fontSize": {
                        "body-lg": ["18px", {"lineHeight": "28px", "fontWeight": "400"}],
                        "label-md": ["14px", {"lineHeight": "20px", "letterSpacing": "0.05em", "fontWeight": "500"}],
                        "headline-sm": ["24px", {"lineHeight": "32px", "fontWeight": "600"}],
                        "display-lg": ["64px", {"lineHeight": "72px", "letterSpacing": "-0.04em", "fontWeight": "800"}],
                        "headline-lg": ["40px", {"lineHeight": "48px", "letterSpacing": "-0.02em", "fontWeight": "700"}],
                        "headline-md": ["32px", {"lineHeight": "40px", "fontWeight": "700"}],
                        "label-sm": ["12px", {"lineHeight": "16px", "fontWeight": "500"}],
                        "body-md": ["16px", {"lineHeight": "24px", "fontWeight": "400"}],
                        "headline-lg-mobile": ["32px", {"lineHeight": "40px", "fontWeight": "700"}]
                    }
                },
            },
        }
    </script>
<style>
        body {
            background-color: #0a0a0a;
            color: #e5e2e1;
            overflow-x: hidden;
        }

        .glass-card {
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            position: relative;
            overflow: hidden;
        }

        .glass-card::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
        }

        .emerald-glow {
            box-shadow: 0px 0px 20px rgba(16, 185, 129, 0.3);
        }

        .primary-glow-hover:hover {
            box-shadow: 0px 0px 25px rgba(78, 222, 163, 0.5);
            transform: translateY(-2px);
        }

        .decision-line {
            background: linear-gradient(90deg, #3c4a42 0%, #4edea3 100%);
        }

        .pulse-emerald {
            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; filter: drop-shadow(0 0 5px #4edea3); }
            50% { opacity: .7; filter: drop-shadow(0 0 15px #4edea3); }
        }

        .gradient-mesh {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: -1;
            background: radial-gradient(circle at 10% 10%, rgba(16, 185, 129, 0.05) 0%, transparent 40%),
                        radial-gradient(circle at 90% 90%, rgba(16, 185, 129, 0.05) 0%, transparent 40%);
        }
    </style>
</head>
<body class="font-body-md antialiased">
<div class="gradient-mesh"></div>
<!-- TopNavBar -->
<header class="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-outline-variant/30">
<div class="flex justify-between items-center h-20 px-grid-margin max-w-7xl mx-auto">
<div class="font-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">
                Deriv AI
            </div>
<nav class="hidden md:flex gap-8 items-center">
<a class="text-primary font-bold border-b-2 border-primary pb-1 font-body-md text-body-md" href="#">Dashboard</a>
<a class="text-on-surface-variant hover:text-on-surface transition-colors font-body-md text-body-md" href="#">Analysis</a>
<a class="text-on-surface-variant hover:text-on-surface transition-colors font-body-md text-body-md" href="#">Pricing</a>
</nav>
<button class="bg-primary text-on-primary px-6 py-2.5 rounded-lg font-bold emerald-glow transition-all duration-300 hover:scale-105 active:scale-95">
                Ouvrir le Dashboard
            </button>
</div>
</header>
<main class="pt-32 space-y-32 pb-32">
<!-- Hero Section -->
<section class="max-w-7xl mx-auto px-grid-margin grid lg:grid-cols-2 gap-16 items-center">
<div class="space-y-8">
<div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/40 bg-primary/10 text-primary font-label-md text-label-md">
<span class="material-symbols-outlined text-[18px]" style="font-variation-settings: 'FILL' 1;">auto_awesome</span>
                    AI SIGNAL COPILOT
                </div>
<h1 class="font-headline-lg text-headline-lg lg:text-display-lg leading-tight text-on-surface">
                    Votre copilote IA pour des <span class="text-primary">signaux de précision</span>
</h1>
<p class="text-on-surface-variant text-body-lg max-w-xl">
                    Un assistant d'analyse pour indices synthétiques : contexte marché, multi-timeframes, confirmation et zones clés (FVG). <br/>
<span class="font-label-sm tracking-wider opacity-70">NO DEPOSITS • NO RISK TO CAPITAL • PURE INTELLIGENCE</span>
</p>
<div class="flex flex-wrap gap-4 pt-4">
<button class="bg-primary text-on-primary px-8 py-4 rounded-xl font-bold text-body-md emerald-glow primary-glow-hover transition-all duration-300">
                        Ouvrir le Dashboard
                    </button>
<button class="border border-outline-variant hover:bg-surface-variant/30 px-8 py-4 rounded-xl font-bold text-body-md transition-all duration-300">
                        Voir le Flux de Décision
                    </button>
</div>
</div>
<div class="relative group">
<div class="absolute -inset-4 bg-primary/20 rounded-[2rem] blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
<div class="glass-card rounded-[2rem] p-1 shadow-2xl relative">
<img class="w-full h-auto rounded-[1.9rem]" data-alt="A sophisticated dark-mode trading interface display with neon emerald glowing line charts and data markers. The visualization shows intricate financial metrics and algorithmic connections in a 3D perspective, representing an advanced AI analytical platform. The style is technical and sleek with high-contrast UI elements and a subtle glassmorphic backdrop reflecting data points." src="https://lh3.googleusercontent.com/aida-public/AB6AXuCfvWjz5ClvRNYXJ70d-liJzvSMooA9dXn2gOBdN3Vmj2Fh6yJJ9hIOG8cTjLgeDp3qZfOx8GhIUa6NFfiFLFxsO-oKvR7WjD5U3thqvL90T0WLUy0TN1JLM9r1yYTUVLefTSNDzci9aTj5UqYrv4lPFvbEPtwAdWb1-UQZ76tWd5lTxxHD9xc4k0Kv1XIHN_VZHb4v1-CMQQIvX1J4sE6i2zXNdUSImqsf-lX1u53GrCd7ytQc3kAl"/>
</div>
</div>
</section>
<!-- Decision Flow -->
<section class="max-w-7xl mx-auto px-grid-margin space-y-16">
<div class="text-center space-y-4">
<h2 class="font-headline-lg text-headline-lg text-on-surface">Le Flux de Décision en 6 Étapes</h2>
<p class="text-on-surface-variant text-body-md">Comment l'IA valide chaque opportunité avant de la présenter.</p>
</div>
<div class="relative py-12 overflow-x-auto no-scrollbar">
<!-- Desktop Timeline Line -->
<div class="absolute top-[48px] left-0 w-full h-[2px] decision-line hidden md:block opacity-30"></div>
<div class="flex justify-between gap-8 min-w-[1000px] relative">
<!-- Step 1 -->
<div class="flex flex-col items-center text-center space-y-6 flex-1">
<div class="w-12 h-12 rounded-full glass-card border-primary/50 flex items-center justify-center text-primary emerald-glow relative z-10 bg-background pulse-emerald">
<span class="material-symbols-outlined">analytics</span>
</div>
<div class="space-y-2">
<h3 class="font-bold text-on-surface">1. Market Context</h3>
<p class="text-on-surface-variant text-label-sm">Analyse de la structure globale du marché</p>
</div>
</div>
<!-- Step 2 -->
<div class="flex flex-col items-center text-center space-y-6 flex-1">
<div class="w-12 h-12 rounded-full glass-card flex items-center justify-center text-primary relative z-10 bg-background">
<span class="material-symbols-outlined">stacked_line_chart</span>
</div>
<div class="space-y-2">
<h3 class="font-bold text-on-surface">2. MTF Alignment</h3>
<p class="text-on-surface-variant text-label-sm">Confluence de M1 à H4 pour une tendance claire</p>
</div>
</div>
<!-- Step 3 -->
<div class="flex flex-col items-center text-center space-y-6 flex-1">
<div class="w-12 h-12 rounded-full glass-card flex items-center justify-center text-primary relative z-10 bg-background">
<span class="material-symbols-outlined">architecture</span>
</div>
<div class="space-y-2">
<h3 class="font-bold text-on-surface">3. Strategies</h3>
<p class="text-on-surface-variant text-label-sm">Application des algorithmes SMC &amp; Price Action</p>
</div>
</div>
<!-- Step 4 -->
<div class="flex flex-col items-center text-center space-y-6 flex-1">
<div class="w-12 h-12 rounded-full glass-card flex items-center justify-center text-primary relative z-10 bg-background">
<span class="material-symbols-outlined">verified</span>
</div>
<div class="space-y-2">
<h3 class="font-bold text-on-surface">4. Confirmation</h3>
<p class="text-on-surface-variant text-label-sm">Validation momentum et timing</p>
</div>
</div>
<!-- Step 5 -->
<div class="flex flex-col items-center text-center space-y-6 flex-1">
<div class="w-12 h-12 rounded-full glass-card flex items-center justify-center text-primary relative z-10 bg-background">
<span class="material-symbols-outlined">query_stats</span>
</div>
<div class="space-y-2">
<h3 class="font-bold text-on-surface">5. FVG Detection</h3>
<p class="text-on-surface-variant text-label-sm">Ciblage des zones d'inefficience (FVG)</p>
</div>
</div>
<!-- Step 6 -->
<div class="flex flex-col items-center text-center space-y-6 flex-1">
<div class="w-12 h-12 rounded-full glass-card flex items-center justify-center text-primary relative z-10 bg-background">
<span class="material-symbols-outlined">notification_important</span>
</div>
<div class="space-y-2">
<h3 class="font-bold text-on-surface">6. Signal Lock</h3>
<p class="text-on-surface-variant text-label-sm">Alerte stable avec timing optimisé</p>
</div>
</div>
</div>
</div>
</section>
<!-- Arsenal Section -->
<section class="max-w-7xl mx-auto px-grid-margin space-y-16">
<div class="text-center space-y-4">
<h2 class="font-headline-lg text-headline-lg text-on-surface">Arsenal de Précision</h2>
<p class="text-on-surface-variant text-body-md">Conçu pour maximiser la justesse des signaux et sécuriser l'approche.</p>
</div>
<div class="grid md:grid-cols-2 lg:grid-cols-4 gap-bento-gap">
<!-- Card 1 -->
<div class="glass-card p-card-padding rounded-2xl flex flex-col gap-4 group">
<div class="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
<span class="material-symbols-outlined">target</span>
</div>
<div class="space-y-2">
<h3 class="font-bold text-headline-sm">Précision des Signaux</h3>
<p class="text-on-surface-variant text-body-md">Un signal n'apparaît que lorsqu'une confluence forte est atteinte via le flux de décision.</p>
</div>
<div class="mt-auto flex gap-2">
<span class="px-2 py-1 rounded bg-surface-container-high text-[10px] font-bold text-primary tracking-widest">STRICT FILTERS</span>
<span class="px-2 py-1 rounded bg-surface-container-high text-[10px] font-bold text-primary tracking-widest">NO NOISE</span>
</div>
</div>
<!-- Card 2 -->
<div class="glass-card p-card-padding rounded-2xl flex flex-col gap-4">
<div class="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
<span class="material-symbols-outlined">calculate</span>
</div>
<div class="space-y-2">
<h3 class="font-bold text-headline-sm">Calcul du Risque</h3>
<p class="text-on-surface-variant text-body-md">Chaque signal inclut une mise suggérée et une gestion du risque basée sur votre capital.</p>
</div>
</div>
<!-- Card 3 -->
<div class="glass-card p-card-padding rounded-2xl flex flex-col gap-4">
<div class="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
<span class="material-symbols-outlined">grid_view</span>
</div>
<div class="space-y-2">
<h3 class="font-bold text-headline-sm">SMC Auto-Detection</h3>
<p class="text-on-surface-variant text-body-md">Identification des zones clés (FVG / OB) et support/résistance pour un timing précis.</p>
</div>
</div>
<!-- Card 4 -->
<div class="glass-card p-card-padding rounded-2xl flex flex-col gap-4">
<div class="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
<span class="material-symbols-outlined">verified_user</span>
</div>
<div class="space-y-2">
<h3 class="font-bold text-headline-sm">Sécurité &amp; Intelligence</h3>
<p class="text-on-surface-variant text-body-md">L'application n'exécute pas de trades. Elle fournit l'intelligence et vous gardez 100% le contrôle.</p>
</div>
<div class="mt-auto">
<span class="px-2 py-1 rounded bg-surface-container-high text-[10px] font-bold text-primary tracking-widest uppercase">Pure Intelligence</span>
</div>
</div>
</div>
</section>
<!-- Pricing Section -->
<section class="max-w-7xl mx-auto px-grid-margin space-y-16">
<div class="text-center space-y-4">
<h2 class="font-headline-lg text-headline-lg text-on-surface">Activez votre Copilote</h2>
<p class="text-on-surface-variant text-body-md">Choisissez le niveau d'assistance qui vous convient.</p>
</div>
<div class="grid md:grid-cols-3 gap-8 items-end max-w-5xl mx-auto">
<!-- Free Plan -->
<div class="glass-card p-8 rounded-3xl space-y-8 h-fit">
<div class="space-y-2 text-center">
<span class="font-label-md text-on-surface-variant">EXPLORATEUR</span>
<h3 class="font-display-lg text-headline-lg">GRATUIT</h3>
</div>
<ul class="space-y-4">
<li class="flex items-center gap-3 text-on-surface-variant">
<span class="material-symbols-outlined text-primary text-sm">check_circle</span>
                            Dashboard live
                        </li>
<li class="flex items-center gap-3 text-on-surface-variant">
<span class="material-symbols-outlined text-primary text-sm">check_circle</span>
                            Flux de décision
                        </li>
<li class="flex items-center gap-3 text-on-surface-variant">
<span class="material-symbols-outlined text-primary text-sm">check_circle</span>
                            Alertes avancées
                        </li>
</ul>
<button class="w-full py-4 rounded-xl border border-outline-variant hover:bg-surface-variant/30 font-bold transition-all">
                        Commencer
                    </button>
</div>
<!-- Pro Plan -->
<div class="glass-card p-8 rounded-3xl space-y-8 border-primary/50 relative transform scale-105 shadow-[0_0_40px_rgba(16,185,129,0.1)]">
<div class="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-on-primary px-6 py-1 rounded-full font-bold text-label-sm">
                        Populaire
                    </div>
<div class="space-y-2 text-center">
<span class="font-label-md text-on-surface-variant">PRO</span>
<h3 class="font-display-lg text-headline-lg">5€<span class="text-body-md font-normal text-on-surface-variant">/mois</span></h3>
<p class="text-label-sm text-primary">Temps réel + validations complètes</p>
</div>
<ul class="space-y-4">
<li class="flex items-center gap-3">
<span class="material-symbols-outlined text-primary text-sm">check_circle</span>
                            MTF + confirmation
                        </li>
<li class="flex items-center gap-3">
<span class="material-symbols-outlined text-primary text-sm">check_circle</span>
                            Zones FVG
                        </li>
<li class="flex items-center gap-3">
<span class="material-symbols-outlined text-primary text-sm">check_circle</span>
                            Gestion du risque
                        </li>
<li class="flex items-center gap-3">
<span class="material-symbols-outlined text-primary text-sm">check_circle</span>
                            Support prioritaire
                        </li>
</ul>
<button class="w-full py-4 rounded-xl bg-primary text-on-primary font-bold emerald-glow transition-all">
                        Get Signals Now
                    </button>
</div>
<!-- Institutional Plan -->
<div class="glass-card p-8 rounded-3xl space-y-8 h-fit">
<div class="space-y-2 text-center">
<span class="font-label-md text-on-surface-variant">INSTITUTIONNEL</span>
<h3 class="font-display-lg text-headline-lg">51€<span class="text-body-md font-normal text-on-surface-variant">/an</span></h3>
</div>
<ul class="space-y-4">
<li class="flex items-center gap-3 text-on-surface-variant">
<span class="material-symbols-outlined text-primary text-sm">check_circle</span>
                            Tout le pack Pro
                        </li>
<li class="flex items-center gap-3 text-on-surface-variant">
<span class="material-symbols-outlined text-primary text-sm">check_circle</span>
                            Accès illimité
                        </li>
<li class="flex items-center gap-3 text-on-surface-variant">
<span class="material-symbols-outlined text-primary text-sm">check_circle</span>
                            API Access
                        </li>
</ul>
<button class="w-full py-4 rounded-xl border border-outline-variant hover:bg-surface-variant/30 font-bold transition-all">
                        Accès annuel
                    </button>
</div>
</div>
</section>
<!-- CTA / Final Section -->
<section class="max-w-3xl mx-auto px-grid-margin text-center space-y-12">
<div class="space-y-4">
<h2 class="font-headline-lg text-headline-lg text-on-surface">Recevez vos premiers signaux aujourd'hui</h2>
<p class="text-on-surface-variant text-body-md">Choisissez le niveau d'assistance qui vous convient.</p>
</div>
<button class="bg-primary text-on-primary px-12 py-5 rounded-2xl font-bold text-body-lg emerald-glow primary-glow-hover transition-all duration-300">
                Ouvrir le Dashboard
            </button>
</section>
</main>
<!-- Footer -->
<footer class="bg-surface-container-lowest border-t border-outline-variant/20 py-12">
<div class="flex flex-col md:flex-row justify-between items-center px-grid-margin gap-bento-gap max-w-7xl mx-auto">
<div class="text-on-surface font-bold font-headline-sm">
                Deriv AI
            </div>
<div class="flex gap-8 text-on-surface-variant font-label-sm text-label-sm">
<a class="hover:text-primary transition-colors" href="#">Inter</a>
<a class="hover:text-primary transition-colors" href="#">Resources</a>
<a class="hover:text-primary transition-colors" href="#">Privacy</a>
<a class="hover:text-primary transition-colors" href="#">Terms</a>
</div>
<div class="flex items-center gap-4">
<a class="text-on-surface-variant hover:text-on-surface transition-colors" href="#">
<svg class="w-6 h-6 fill-current" viewbox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"></path></svg>
</a>
<p class="text-on-surface-variant font-label-sm text-label-sm opacity-80">© Copyright 2024 · Deriv AI</p>
</div>
</div>
</footer>
<script>
        // Simple scroll reveal interaction
        const observerOptions = {
            threshold: 0.1
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('opacity-100');
                    entry.target.classList.remove('opacity-0', 'translate-y-4');
                }
            });
        }, observerOptions);

        document.querySelectorAll('.glass-card').forEach(card => {
            card.classList.add('transition-all', 'duration-700', 'opacity-0', 'translate-y-4');
            observer.observe(card);
        });
    </script>
</body></html>