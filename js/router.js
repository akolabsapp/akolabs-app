// ============================================
// AKOLABS - SPA Router (Hash-based)
// ============================================

const Router = {
    routes: [],
    currentRoute: null,
    previousRoute: null,
    mainContainer: null,
    onBeforeRoute: null, // hook

    // ---- Enregistrer une route ----
    register(path, handler) {
        this.routes.push({
            path,
            regex: this._pathToRegex(path),
            keys: this._extractKeys(path),
            handler
        });
    },

    // ---- Naviguer vers une route ----
    navigate(path) {
        window.location.hash = '#' + path;
    },

    // ---- Remplacer la route actuelle (sans historique) ----
    replace(path) {
        window.location.replace('#' + path);
    },

    // ---- Retour arrière ----
    back() {
        window.history.back();
    },

    // ---- Convertir un path en regex ----
    _pathToRegex(path) {
        const pattern = path
            .replace(/\//g, '\\/')
            .replace(/:([^\/]+)/g, '([^\\/]+)');
        return new RegExp('^' + pattern + '$');
    },

    // ---- Extraire les noms des paramètres ----
    _extractKeys(path) {
        const keys = [];
        const matches = path.matchAll(/:([^\/]+)/g);
        for (const match of matches) {
            keys.push(match[1]);
        }
        return keys;
    },

    // ---- Trouver la route correspondante ----
    _matchRoute(hash) {
        for (const route of this.routes) {
            const match = hash.match(route.regex);
            if (match) {
                const params = {};
                route.keys.forEach((key, i) => {
                    params[key] = decodeURIComponent(match[i + 1]);
                });
                return { route, params };
            }
        }
        return null;
    },

    // ---- Gérer le changement de route ----
    async handleRoute() {
        const hash = window.location.hash.slice(1) || '/home';
        const matched = this._matchRoute(hash);

        if (!matched) {
            console.warn('[Router] Route non trouvée:', hash);
            this.navigate('/home');
            return;
        }

        const { route, params } = matched;

        // Hook avant navigation
        if (this.onBeforeRoute) {
            const canProceed = await this.onBeforeRoute(hash, params);
            if (canProceed === false) return;
        }

        this.previousRoute = this.currentRoute;
        this.currentRoute = hash;

        const container = this.mainContainer || document.getElementById('main-content');
        if (!container) return;

        // Afficher le loader
        container.innerHTML = `
            <div class="page-loader">
                <div class="spinner"></div>
            </div>
        `;

        try {
            // Rendre la page
            const html = await route.handler.render(params);

            // Transition
            container.innerHTML = `<div class="page-enter">${html}</div>`;

            // Initialiser la page
            if (route.handler.init) {
                await route.handler.init(params);
            }

            // Mettre à jour la navigation
            this._updateBottomNav(hash);

            // Scroll en haut
            container.scrollTo(0, 0);

            // Tracker la vue
            if (typeof Analytics !== 'undefined') {
                Analytics.track('page_view', { page: hash });
            }

        } catch (error) {
            console.error('[Router] Erreur de rendu:', error);
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Erreur de chargement</h3>
                    <p>${error.message || 'Une erreur est survenue'}</p>
                    <button class="btn btn-primary mt-lg" onclick="Router.navigate('/home')">
                        <i class="fas fa-home"></i> Retour à l'accueil
                    </button>
                </div>
            `;
        }
    },

    // ---- Mettre à jour le footer nav ----
    _updateBottomNav(hash) {
        const page = hash.split('/')[1]; // /home -> home
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            const isActive = item.dataset.page === page;
            item.classList.toggle('active', isActive);
        });

        // Afficher/masquer header et bottom nav pour certaines pages
        const fullScreenPages = ['webview', 'onboarding', 'login'];
        const isFullScreen = fullScreenPages.includes(page);

        const header = document.getElementById('app-header');
        const bottomNav = document.getElementById('bottom-nav');
        const mainContent = document.getElementById('main-content');

        if (header) header.style.display = isFullScreen ? 'none' : 'flex';
        if (bottomNav) bottomNav.style.display = isFullScreen ? 'none' : 'flex';
        if (mainContent) {
            mainContent.style.marginTop = isFullScreen ? '0' : 'var(--header-height)';
            mainContent.style.marginBottom = isFullScreen ? '0' : 'var(--bottom-nav-height)';
        }
    },

    // ---- Obtenir le paramètre de recherche ----
    getQuery(key) {
        const hash = window.location.hash;
        const queryIndex = hash.indexOf('?');
        if (queryIndex === -1) return null;
        const params = new URLSearchParams(hash.slice(queryIndex));
        return params.get(key);
    },

    // ---- Initialiser le router ----
    init() {
        this.mainContainer = document.getElementById('main-content');

        window.addEventListener('hashchange', () => this.handleRoute());

        // Gérer le premier chargement
        this.handleRoute();

        console.log('[Router] Initialisé avec', this.routes.length, 'routes');
    }
};