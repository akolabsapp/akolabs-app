// ============================================
// AKOLABS - Page Accueil
// ============================================

var HomePage = {
    sections: [],
    formations: [],
    apkSections: [],
    userAccess: [],
    searchTimeout: null,

    render: async function() {
        var profile = App.profile;
        var firstName = (profile.full_name || 'Utilisateur').split(' ')[0];
        var streak = profile.login_streak || 0;
        var level = profile.level || 'Bronze';

        var levelIcons = {
            Bronze: 'fa-medal',
            Silver: 'fa-medal',
            Gold: 'fa-crown',
            Diamond: 'fa-gem'
        };
        var levelIcon = levelIcons[level] || 'fa-medal';

        var streakHTML = '';
        if (streak > 1) {
            streakHTML = '<div class="welcome-streak">'
                + '<i class="fas fa-fire"></i> '
                + streak + ' jours consecutifs'
                + '</div>';
        }

        var html = '';

        // Welcome
        html += '<div class="welcome-section">';
        html += '<div class="welcome-greeting">Bon retour 👋</div>';
        html += '<div class="welcome-name">Bienvenue, <span class="accent">' + firstName + '</span></div>';
        html += streakHTML;
        html += '</div>';

        // Search
        html += '<div class="search-bar">';
        html += '<i class="fas fa-search search-icon"></i>';
        html += '<input type="text" id="home-search" placeholder="Rechercher un outil, une formation..." oninput="HomePage.handleSearch(this.value)">';
        html += '<span class="search-clear" id="search-clear" onclick="HomePage.clearSearch()"><i class="fas fa-times"></i></span>';
        html += '</div>';

        // Search results
        html += '<div id="search-results" style="display:none;"></div>';

        // Main content
        html += '<div id="home-main-content">';

        // Bannière abonnement (expiration / renouvellement)
        html += '<div id="subscription-banner"></div>';

        // Bannière offre flash
        html += '<div id="flash-sale-banner"></div>';

        // Progress card
        html += '<div class="progress-card">';
        html += '<div class="progress-card-header">';
        html += '<span class="progress-card-title">Votre progression</span>';
        html += '<span class="progress-card-value" id="progress-text">Chargement...</span>';
        html += '</div>';
        html += '<div class="progress-bar"><div class="progress-fill" id="progress-fill" style="width:0%"></div></div>';
        html += '<div class="progress-card-level"><i class="fas ' + levelIcon + '"></i> Niveau ' + level + '</div>';
        html += '</div>';

        // Quick stats
        html += '<div class="quick-stats">';
        html += '<div class="quick-stat-item"><div class="quick-stat-icon"><i class="fas fa-unlock"></i></div><div class="quick-stat-value" id="stat-unlocked">-</div><div class="quick-stat-label">Debloques</div></div>';
        html += '<div class="quick-stat-item"><div class="quick-stat-icon"><i class="fas fa-mobile-alt"></i></div><div class="quick-stat-value" id="stat-apk">-</div><div class="quick-stat-label">App Prime</div></div>';
        html += '<div class="quick-stat-item"><div class="quick-stat-icon"><i class="fas fa-globe"></i></div><div class="quick-stat-value" id="stat-universe">-</div><div class="quick-stat-label">Universe</div></div>';
        html += '<div class="quick-stat-item"><div class="quick-stat-icon"><i class="fas fa-graduation-cap"></i></div><div class="quick-stat-value" id="stat-learning">-</div><div class="quick-stat-label">Learning</div></div>';
        html += '</div>';

        // Dynamic sections
        html += '<div id="featured-section"></div>';
        html += '<div id="apk-section"></div>';
        html += '<div id="universe-section"></div>';
        html += '<div id="learning-section"></div>';
        html += '<div id="coming-soon-section"></div>';
        html += '<div style="height:32px;"></div>';

        html += '</div>';

        return html;
    },

    init: async function() {
        // Charger flash sales EN PARALLÈLE avec les données sections
        var flashPromise = (typeof FlashSale !== 'undefined')
            ? FlashSale.load()
            : Promise.resolve([]);

        await Promise.all([HomePage.loadData(), flashPromise]);

        // Afficher la bannière flash (données disponibles)
        if (typeof FlashSale !== 'undefined') {
            FlashSale.renderHomeBanner('flash-sale-banner');
        }

        // Construire les cartes avec prix flash déjà disponibles
        HomePage.renderAllSections();
        HomePage.updateProgress();
        HomePage.updateStats();
        HomePage.renderSubscriptionBanner();

        try {
            await db.from('app_analytics').insert({
                event_type: 'page_view',
                user_id: App.profile.id,
                metadata: { page: 'home' }
            });
        } catch(e) {}
    },

    loadData: async function() {
        try {
            var sectionsResult = await db
                .from('sections')
                .select('*')
                .eq('is_active', true)
                .order('order_index');

            if (sectionsResult.data) {
                HomePage.sections = [];
                HomePage.formations = [];
                HomePage.apkSections = [];
                for (var i = 0; i < sectionsResult.data.length; i++) {
                    var s = sectionsResult.data[i];
                    if (s.type === 'apk') {
                        HomePage.apkSections.push(s);
                    } else if (s.type === 'webview') {
                        HomePage.sections.push(s);
                    } else if (s.type === 'drive') {
                        HomePage.formations.push(s);
                    }
                }
            }

            var accessResult = await db
                .from('user_sections')
                .select('section_id')
                .eq('user_id', App.profile.id)
                .eq('is_active', true);

            if (accessResult.data) {
                HomePage.userAccess = [];
                for (var j = 0; j < accessResult.data.length; j++) {
                    HomePage.userAccess.push(accessResult.data[j].section_id);
                }
            }
        } catch (e) {
            console.error('[Home] Erreur chargement:', e);
        }
    },

    hasAccess: function(sectionId) {
        // Sections toujours accessibles depuis user_sections
        var inUserAccess = HomePage.userAccess.indexOf(sectionId) !== -1;
        if (!inUserAccess) return false;

        // Vérifier si l'abonnement est expiré
        var plan = App.profile ? (App.profile.subscription_plan || 'lifetime') : 'lifetime';
        var isExpired = plan && plan.indexOf('expired_') === 0;

        if (isExpired) {
            // Plan expiré → accès Starter uniquement
            // Chercher la section dans la liste pour savoir son titre
            var allSecs = HomePage.sections.concat(HomePage.formations).concat(HomePage.apkSections);
            var sec = null;
            for (var i = 0; i < allSecs.length; i++) {
                if (allSecs[i].id === sectionId) { sec = allSecs[i]; break; }
            }
            if (!sec) return true; // Section inconnue, laisser passer
            // Sections exclues du Starter
            var starterExcluded = ['akolabs app prime', 'akolabs ia 2', 'akolabs ebook', 'akolabs learning'];
            var titleLower = (sec.title || '').toLowerCase();
            for (var j = 0; j < starterExcluded.length; j++) {
                if (titleLower.indexOf(starterExcluded[j]) !== -1) return false;
            }
        }

        return true;
    },

    renderAllSections: function() {
        HomePage.renderFeatured();
        HomePage.renderAppPrime();
        HomePage.renderUniverse();
        HomePage.renderLearning();
        HomePage.renderComingSoon();
    },

    renderFeatured: function() {
        var container = document.getElementById('featured-section');
        if (!container) return;

        var allItems = HomePage.sections.concat(HomePage.formations).concat(HomePage.apkSections);
        var featured = null;

        for (var i = 0; i < allItems.length; i++) {
            if (allItems[i].is_featured && !allItems[i].is_coming_soon) {
                featured = allItems[i];
                break;
            }
        }

        if (!featured) {
            var now = new Date().getTime();
            for (var j = 0; j < allItems.length; j++) {
                var sec = allItems[j];
                if (sec.promo_price && sec.promo_end_date) {
                    if (new Date(sec.promo_end_date).getTime() > now) {
                        featured = sec;
                        break;
                    }
                }
            }
        }

        if (!featured) {
            container.innerHTML = '';
            return;
        }

        var icon = featured.type === 'webview' ? 'fa-globe' : 'fa-graduation-cap';
        var tag = featured.promo_price ? '🔥 PROMO EN COURS' : '⭐ RECOMMANDE';

        var h = '';
        h += '<div class="featured-banner" onclick="Router.navigate(\'/section/' + featured.id + '\')">';
        h += '<div class="featured-banner-icon"><i class="fas ' + icon + '"></i></div>';
        h += '<div class="featured-banner-content">';
        h += '<div class="featured-banner-tag">' + tag + '</div>';
        h += '<div class="featured-banner-title">' + featured.title + '</div>';
        h += '<div class="featured-banner-desc">' + Utils.truncate(featured.description || '', 60) + '</div>';
        h += '</div>';
        h += '<div class="featured-banner-arrow"><i class="fas fa-chevron-right"></i></div>';
        h += '</div>';

        container.innerHTML = h;
        if (typeof AkoLazy !== 'undefined') AkoLazy.refresh();
    },

    renderAppPrime: function() {
        var container = document.getElementById('apk-section');
        if (!container) return;

        var active = [];
        for (var i = 0; i < HomePage.apkSections.length; i++) {
            if (!HomePage.apkSections[i].is_coming_soon) active.push(HomePage.apkSections[i]);
        }

        if (active.length === 0) {
            container.innerHTML = '';
            return;
        }

        var cardsHTML = '';
        for (var j = 0; j < active.length; j++) {
            cardsHTML += HomePage.buildSectionCard(active[j]);
        }

        var h = '';
        h += '<div style="margin-bottom:32px;">';
        h += '<div class="home-section-header">';
        h += '<div class="home-section-title-group">';
        h += '<div class="home-section-icon"><i class="fas fa-mobile-alt"></i></div>';
        h += '<div><div class="home-section-title">AKOLABS App Prime</div>';
        h += '<div class="home-section-subtitle">Applications Android premium à télécharger</div></div>';
        h += '</div>';
        h += '<span class="home-section-count">' + active.length + ' app' + (active.length > 1 ? 's' : '') + '</span>';
        h += '</div>';
        h += cardsHTML;
        h += '</div>';

        container.innerHTML = h;
        if (typeof AkoLazy !== 'undefined') AkoLazy.refresh();
    },

    renderUniverse: function() {
        var container = document.getElementById('universe-section');
        if (!container) return;

        var active = [];
        for (var i = 0; i < HomePage.sections.length; i++) {
            if (!HomePage.sections[i].is_coming_soon) {
                active.push(HomePage.sections[i]);
            }
        }

        if (active.length === 0) {
            container.innerHTML = '';
            return;
        }

        var cardsHTML = '';
        for (var j = 0; j < active.length; j++) {
            cardsHTML += HomePage.buildSectionCard(active[j]);
        }

        var h = '';
        h += '<div style="margin-bottom:32px;">';
        h += '<div class="home-section-header">';
        h += '<div class="home-section-title-group">';
        h += '<div class="home-section-icon"><i class="fas fa-globe"></i></div>';
        h += '<div><div class="home-section-title">' + CONFIG.UNIVERSE_TITLE + '</div>';
        h += '<div class="home-section-subtitle">Outils digitaux premium</div></div>';
        h += '</div>';
        h += '<span class="home-section-count">' + active.length + ' outils</span>';
        h += '</div>';
        h += cardsHTML;
        h += '</div>';

        container.innerHTML = h;
        if (typeof AkoLazy !== 'undefined') AkoLazy.refresh();
    },

    renderLearning: function() {
        var container = document.getElementById('learning-section');
        if (!container) return;

        var active = [];
        for (var i = 0; i < HomePage.formations.length; i++) {
            if (!HomePage.formations[i].is_coming_soon) {
                active.push(HomePage.formations[i]);
            }
        }

        if (active.length === 0) {
            container.innerHTML = '';
            return;
        }

        var cardsHTML = '';
        for (var j = 0; j < active.length; j++) {
            cardsHTML += HomePage.buildFormationCard(active[j]);
        }

        var h = '';
        h += '<div style="margin-bottom:32px;">';
        h += '<div class="home-section-header">';
        h += '<div class="home-section-title-group">';
        h += '<div class="home-section-icon"><i class="fas fa-graduation-cap"></i></div>';
        h += '<div><div class="home-section-title">' + CONFIG.LEARNING_TITLE + '</div>';
        h += '<div class="home-section-subtitle">Formations completes</div></div>';
        h += '</div>';
        h += '<span class="home-section-count">' + active.length + ' formations</span>';
        h += '</div>';
        h += cardsHTML;
        h += '</div>';

        container.innerHTML = h;
        if (typeof AkoLazy !== 'undefined') AkoLazy.refresh();
    },

    renderComingSoon: function() {
        var container = document.getElementById('coming-soon-section');
        if (!container) return;

        var allItems = HomePage.sections.concat(HomePage.formations).concat(HomePage.apkSections);
        var comingSoon = [];
        for (var i = 0; i < allItems.length; i++) {
            if (allItems[i].is_coming_soon) {
                comingSoon.push(allItems[i]);
            }
        }

        if (comingSoon.length === 0) {
            container.innerHTML = '';
            return;
        }

        var cardsHTML = '';
        for (var j = 0; j < comingSoon.length; j++) {
            var cs = comingSoon[j];
            cardsHTML += '<div class="coming-soon-card">';
            cardsHTML += '<div class="coming-soon-icon"><i class="fas fa-lock"></i></div>';
            cardsHTML += '<div class="coming-soon-title">' + cs.title + '</div>';
            cardsHTML += '<div class="coming-soon-desc">' + (cs.description || 'Bientot disponible') + '</div>';
            cardsHTML += '<span class="badge badge-coming" style="margin-top:12px;"><i class="fas fa-clock"></i> Prochainement</span>';
            cardsHTML += '</div>';
        }

        var h = '';
        h += '<div style="margin-bottom:32px;">';
        h += '<div class="home-section-header">';
        h += '<div class="home-section-title-group">';
        h += '<div class="home-section-icon"><i class="fas fa-rocket"></i></div>';
        h += '<div><div class="home-section-title">Coming Soon</div>';
        h += '<div class="home-section-subtitle">Bientot dans AKOLABS</div></div>';
        h += '</div>';
        h += '</div>';
        h += cardsHTML;
        h += '</div>';

        container.innerHTML = h;
        if (typeof AkoLazy !== 'undefined') AkoLazy.refresh();
    },

    buildSectionCard: function(section) {
        var hasAccess = HomePage.hasAccess(section.id);
        var isFree = section.is_free;
        var hasPromo = section.promo_price && section.promo_price < section.price;

        if (hasPromo && section.promo_end_date) {
            if (new Date(section.promo_end_date).getTime() < new Date().getTime()) {
                hasPromo = false;
            }
        }

        // Offre flash
        var flash = (typeof FlashSale !== 'undefined') ? FlashSale.forSection(section.id) : null;
        var flashBadge = flash ? FlashSale.renderBadge(flash) : '';

        // Badges
        var badgesHTML = '';
        if (isFree) badgesHTML += '<span class="badge badge-free"><i class="fas fa-gift"></i> Gratuit</span>';
        if (hasPromo) badgesHTML += '<span class="badge badge-hot"><i class="fas fa-fire"></i> Promo</span>';
        if (section.is_featured) badgesHTML += '<span class="badge badge-premium"><i class="fas fa-star"></i> Premium</span>';
        if (flash) badgesHTML += '<span class="badge" style="background:#D93B3B;color:#fff;">⚡ Flash</span>';
        if (section.type === 'apk') badgesHTML += '<span class="badge" style="background:rgba(75,0,130,0.85);color:#C9A84C;border:1px solid rgba(201,168,76,0.4);"><i class="fas fa-download"></i> APK</span>';

        // Access
        var accessHTML = '';
        if (hasAccess || isFree) {
            accessHTML = '<div class="section-card-access"><span class="access-unlocked"><i class="fas fa-check"></i> Acces</span></div>';
        }

        // Banner
        var bannerHTML = '';
        if (section.banner_url) {
            var bSrc = section.banner_url || '';
            if (bSrc && bSrc.indexOf('res.cloudinary.com') !== -1) bSrc = bSrc.replace('/upload/', '/upload/f_auto,q_auto:good,w_400,h_150,c_fill/');
            bannerHTML = '<img data-src="' + bSrc + '" class="section-card-banner ako-lazy" alt="" decoding="async" style="width:100%;height:150px;object-fit:cover;opacity:0;transition:opacity .35s" onload="this.style.opacity=1">';
        } else {
            bannerHTML = '<div class="section-card-banner"><span class="section-card-banner-placeholder">' + section.title.charAt(0) + '</span></div>';
        }

        // Price
        var priceHTML = '';
        if (hasAccess || isFree) {
            priceHTML = '<span class="section-card-price-free"><i class="fas fa-check-circle"></i> Accessible</span>';
        } else if (flash) {
            var flashPrice = FlashSale.getPrice(flash, section.price);
            priceHTML = '<span class="section-card-price-old">' + Utils.formatPrice(section.price) + '</span>';
            priceHTML += '<span class="section-card-price-current" style="color:#D93B3B;">⚡ ' + Utils.formatPrice(flashPrice) + '</span>';
        } else if (hasPromo) {
            priceHTML = '<span class="section-card-price-old">' + Utils.formatPrice(section.price) + '</span>';
            priceHTML += '<span class="section-card-price-current">' + Utils.formatPrice(section.promo_price) + '</span>';
        } else {
            priceHTML = '<span class="section-card-price-current">' + Utils.formatPrice(section.price) + '</span>';
        }

        // Button
        var btnHTML = '';
        if (hasAccess || isFree) {
            btnHTML = '<span class="section-card-btn section-card-btn-unlocked"><i class="fas fa-external-link-alt"></i> Ouvrir</span>';
        } else {
            btnHTML = '<span class="section-card-btn"><i class="fas fa-lock"></i> Debloquer</span>';
        }

        // Users
        var usersHTML = '';
        if (section.total_users > 0) {
            usersHTML = '<span class="section-card-users"><i class="fas fa-users"></i> ' + section.total_users + '</span>';
        }

        // Route — TOUS les types passent par /section/ d'abord (page descriptive obligatoire)
        // L'accès direct webview/formation se fait depuis la page de détail
        var route = '/section/' + section.id;

        // Bouton APK spécifique
        if (section.type === 'apk') {
            if (hasAccess || isFree) {
                btnHTML = '<span class="section-card-btn section-card-btn-unlocked"><i class="fas fa-download"></i> Télécharger</span>';
            } else {
                btnHTML = '<span class="section-card-btn"><i class="fas fa-lock"></i> Débloquer</span>';
            }
        }

        var h = '';
        h += '<div class="section-card" onclick="Router.navigate(\'' + route + '\')">';
        h += '<div style="position:relative;">';
        h += bannerHTML;
        h += '<div class="section-card-badges">' + badgesHTML + '</div>';
        h += flashBadge;
        h += accessHTML;
        h += '</div>';
        h += '<div class="section-card-body">';
        h += '<div class="section-card-title">' + section.title + '</div>';
        h += '<div class="section-card-desc">' + (section.description || '') + '</div>';
        h += '<div class="section-card-footer">';
        h += '<div class="section-card-price">' + priceHTML + '</div>';
        h += '<div style="display:flex;align-items:center;gap:12px;">' + usersHTML + btnHTML + '</div>';
        h += '</div>';
        h += '</div>';
        h += '</div>';

        return h;
    },

    buildFormationCard: function(formation) {
        var hasAccess = HomePage.hasAccess(formation.id);
        var isFree = formation.is_free;
        var hasPromo = formation.promo_price && formation.promo_price < formation.price;

        if (hasPromo && formation.promo_end_date) {
            if (new Date(formation.promo_end_date).getTime() < new Date().getTime()) {
                hasPromo = false;
            }
        }

        // Badges
        var badgesHTML = '';
        if (isFree) badgesHTML += '<span class="badge badge-free" style="font-size:9px;padding:2px 8px;"><i class="fas fa-gift"></i> Gratuit</span>';
        if (hasPromo) badgesHTML += '<span class="badge badge-hot" style="font-size:9px;padding:2px 8px;"><i class="fas fa-fire"></i> Promo</span>';
        if (hasAccess) badgesHTML += '<span class="badge badge-free" style="font-size:9px;padding:2px 8px;"><i class="fas fa-check"></i> Acquis</span>';

        
        // Thumb (On utilise custom_logo_url en priorité)
        var thumbHTML = '';
        var imageUrl = formation.custom_logo_url || formation.banner_url;
        
        if (imageUrl) {
            var tSrc = imageUrl || '';
            if (tSrc && tSrc.indexOf('res.cloudinary.com') !== -1) tSrc = tSrc.replace('/upload/', '/upload/f_auto,q_auto:good,w_200,h_200,c_fill/');
            thumbHTML = '<img data-src="' + tSrc + '" class="formation-thumb ako-lazy" alt="" decoding="async" style="opacity:0;transition:opacity .35s" onload="this.style.opacity=1" onerror="this.outerHTML=\'<div class=\\\'formation-thumb\\\'><span class=\\\'formation-thumb-placeholder\\\'>📚</span></div>\'">';
        } else {
            thumbHTML = '<div class="formation-thumb"><span class="formation-thumb-placeholder">📚</span></div>';
        }
        // Duration
        var durationHTML = '';
        if (formation.duration_estimate) {
            durationHTML = '<span><i class="fas fa-clock"></i> ' + formation.duration_estimate + '</span>';
        }

        // Price
        var priceHTML = '';
        if (hasAccess || isFree) {
            priceHTML = '<span style="color:#28A745;font-weight:600;font-size:12px;"><i class="fas fa-check-circle"></i> Accessible</span>';
        } else if (hasPromo) {
            priceHTML = '<span style="text-decoration:line-through;color:#6C6C7E;font-size:11px;">' + Utils.formatPrice(formation.price) + '</span>';
            priceHTML += ' <span style="color:#D4AF37;font-weight:700;font-size:13px;">' + Utils.formatPrice(formation.promo_price) + '</span>';
        } else {
            priceHTML = '<span style="color:#D4AF37;font-weight:700;font-size:13px;">' + Utils.formatPrice(formation.price) + '</span>';
        }

        // Route
        var route = (hasAccess || isFree) ? '/formation/' + formation.id : '/section/' + formation.id;

        var h = '';
        h += '<div class="formation-card" onclick="Router.navigate(\'' + route + '\')">';
        h += thumbHTML;
        h += '<div class="formation-info">';
        h += '<div class="formation-badges">' + badgesHTML + '</div>';
        h += '<div class="formation-title">' + formation.title + '</div>';
        h += '<div class="formation-meta">' + durationHTML;
        h += '<span><i class="fas fa-users"></i> ' + (formation.total_users || 0) + '</span>';
        h += '</div>';
        h += '<div class="formation-price-row">' + priceHTML + '</div>';
        h += '</div>';
        h += '</div>';

        return h;
    },

    updateProgress: function() {
        var allItems = HomePage.sections.concat(HomePage.formations).concat(HomePage.apkSections);
        var nonCS = [];
        for (var i = 0; i < allItems.length; i++) {
            if (!allItems[i].is_coming_soon) nonCS.push(allItems[i]);
        }

        var total = nonCS.length;
        var unlocked = 0;
        for (var j = 0; j < nonCS.length; j++) {
            if (HomePage.hasAccess(nonCS[j].id) || nonCS[j].is_free) unlocked++;
        }

        var percent = total > 0 ? Math.round((unlocked / total) * 100) : 0;

        var progressText = document.getElementById('progress-text');
        var progressFill = document.getElementById('progress-fill');

        if (progressText) progressText.textContent = unlocked + '/' + total + ' debloques';
        if (progressFill) {
            setTimeout(function() {
                progressFill.style.width = percent + '%';
            }, 300);
        }
    },

    updateStats: function() {
        var allItems = HomePage.sections.concat(HomePage.formations).concat(HomePage.apkSections);
        var unlocked = 0;
        for (var i = 0; i < allItems.length; i++) {
            if (HomePage.hasAccess(allItems[i].id) || allItems[i].is_free) unlocked++;
        }

        var el1 = document.getElementById('stat-unlocked');
        var el2 = document.getElementById('stat-universe');
        var el3 = document.getElementById('stat-learning');
        var el4 = document.getElementById('stat-apk');

        if (el1) el1.textContent = unlocked;
        if (el2) el2.textContent = HomePage.sections.length;
        if (el3) el3.textContent = HomePage.formations.length;
        if (el4) el4.textContent = HomePage.apkSections.length;
    },

    handleSearch: function(query) {
        var clearBtn = document.getElementById('search-clear');
        if (clearBtn) {
            if (query.length > 0) {
                clearBtn.classList.add('visible');
            } else {
                clearBtn.classList.remove('visible');
            }
        }

        clearTimeout(HomePage.searchTimeout);
        HomePage.searchTimeout = setTimeout(function() {
            HomePage.performSearch(query.trim().toLowerCase());
        }, 300);
    },

    performSearch: function(query) {
        var resultsDiv = document.getElementById('search-results');
        var mainDiv = document.getElementById('home-main-content');

        if (!query || query.length < 2) {
            if (resultsDiv) resultsDiv.style.display = 'none';
            if (mainDiv) mainDiv.style.display = 'block';
            return;
        }

        var allItems = HomePage.sections.concat(HomePage.formations);
        var results = [];

        for (var i = 0; i < allItems.length; i++) {
            var s = allItems[i];
            var searchText = ((s.title || '') + ' ' + (s.description || '') + ' ' + (s.category || '')).toLowerCase();
            if (searchText.indexOf(query) !== -1) {
                results.push(s);
            }
        }

        if (mainDiv) mainDiv.style.display = 'none';
        if (resultsDiv) resultsDiv.style.display = 'block';

        if (results.length === 0) {
            resultsDiv.innerHTML = '<div class="search-no-results"><i class="fas fa-search"></i><p>Aucun resultat pour "' + query + '"</p></div>';
            return;
        }

        var html = '<div class="search-results">';
        html += '<div class="search-results-title">' + results.length + ' resultat(s) pour "' + query + '"</div>';

        for (var j = 0; j < results.length; j++) {
            if (results[j].type === 'webview') {
                html += HomePage.buildSectionCard(results[j]);
            } else {
                html += HomePage.buildFormationCard(results[j]);
            }
        }

        html += '</div>';
        resultsDiv.innerHTML = html;
    },

    clearSearch: function() {
        var input = document.getElementById('home-search');
        var clearBtn = document.getElementById('search-clear');
        var resultsDiv = document.getElementById('search-results');
        var mainDiv = document.getElementById('home-main-content');

        if (input) { input.value = ''; input.focus(); }
        if (clearBtn) clearBtn.classList.remove('visible');
        if (resultsDiv) resultsDiv.style.display = 'none';
        if (mainDiv) mainDiv.style.display = 'block';
    },

    // ── BANNIÈRE ABONNEMENT ──
    renderSubscriptionBanner: function() {
        var container = document.getElementById('subscription-banner');
        if (!container) return;

        var profile = App.profile;
        if (!profile) return;

        var plan = profile.subscription_plan || 'lifetime';
        var expiresAt = profile.subscription_expires_at ? new Date(profile.subscription_expires_at) : null;
        var now = new Date();
        var daysLeft = App.subscriptionDaysLeft;
        var isExpired = plan && plan.indexOf('expired_') === 0;
        var landingUrl = CONFIG.LANDING_URL || '/app-store/';

        // Fonction de renouvellement globale (évite les conflits de quotes)
        window._akoRenew = function(p) { window.open(landingUrl + '?plan=' + p, '_blank'); };

        // ── Cas 1 : Abonnement expiré ──
        if (isExpired) {
            var expiredPlan = plan.replace('expired_', '');
            var expLabel = expiredPlan.charAt(0).toUpperCase() + expiredPlan.slice(1);
            var div = document.createElement('div');
            div.style.cssText = 'background:linear-gradient(135deg,#D93B3B,#C0392B);border-radius:16px;padding:16px;margin-bottom:16px;display:flex;align-items:flex-start;gap:12px;';
            div.innerHTML = '<i class="fas fa-exclamation-circle" style="color:#fff;font-size:22px;flex-shrink:0;margin-top:2px;"></i>'
                + '<div style="flex:1;">'
                + '<div style="color:#fff;font-weight:700;font-size:14px;margin-bottom:4px;">Votre abonnement a expiré</div>'
                + '<div style="color:rgba(255,255,255,0.85);font-size:12px;margin-bottom:12px;">Ton plan <strong>' + expLabel + '</strong> est terminé. Renouvelle pour récupérer ton accès complet.</div>'
                + '</div>';
            var btn = document.createElement('button');
            btn.style.cssText = 'background:#fff;color:#D93B3B;border:none;border-radius:20px;padding:8px 16px;font-weight:700;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;';
            btn.innerHTML = '<i class="fas fa-redo"></i> Renouveler maintenant';
            btn.addEventListener('click', function() { window._akoRenew(expiredPlan); });
            div.querySelector('div[style*="flex:1"]').appendChild(btn);
            container.innerHTML = '';
            container.appendChild(div);
            return;
        }

        // ── Cas 2 : Bientôt expiré (≤ 7 jours) ──
        if (daysLeft !== null && daysLeft <= 7 && daysLeft > 0) {
            var color = daysLeft <= 2 ? '#E67E22' : '#F39C12';
            var jLabel = daysLeft + ' jour' + (daysLeft > 1 ? 's' : '');
            var div2 = document.createElement('div');
            div2.style.cssText = 'background:linear-gradient(135deg,' + color + ',#D35400);border-radius:16px;padding:14px;margin-bottom:16px;display:flex;align-items:flex-start;gap:12px;';
            div2.innerHTML = '<i class="fas fa-clock" style="color:#fff;font-size:20px;flex-shrink:0;margin-top:2px;"></i>'
                + '<div style="flex:1;">'
                + '<div style="color:#fff;font-weight:700;font-size:13px;margin-bottom:3px;">⚡ Abonnement bientôt expiré</div>'
                + '<div style="color:rgba(255,255,255,0.9);font-size:12px;margin-bottom:10px;">Il te reste <strong>' + jLabel + '</strong>. Renouvelle avant expiration.</div>'
                + '</div>';
            var currentPlan = plan;
            var btn2 = document.createElement('button');
            btn2.style.cssText = 'background:#fff;color:' + color + ';border:none;border-radius:20px;padding:7px 14px;font-weight:700;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;';
            btn2.innerHTML = '<i class="fas fa-redo"></i> Renouveler (' + jLabel + ' restants)';
            btn2.addEventListener('click', function() { window._akoRenew(currentPlan); });
            div2.querySelector('div[style*="flex:1"]').appendChild(btn2);
            container.innerHTML = '';
            container.appendChild(div2);
            return;
        }

        // ── Cas 3 : Plan Starter ──
        if (plan === 'starter') {
            var div3 = document.createElement('div');
            div3.style.cssText = 'background:linear-gradient(135deg,#4B0082,#5D1494);border-radius:16px;padding:14px;margin-bottom:16px;display:flex;align-items:flex-start;gap:12px;';
            div3.innerHTML = '<i class="fas fa-star" style="color:#D4AF37;font-size:20px;flex-shrink:0;margin-top:2px;"></i>'
                + '<div style="flex:1;">'
                + '<div style="color:#D4AF37;font-weight:700;font-size:13px;margin-bottom:3px;">Plan Starter actif</div>'
                + '<div style="color:rgba(255,255,255,0.8);font-size:12px;margin-bottom:10px;">Passe au plan Pro pour debloquer <strong style="color:#D4AF37;">App Prime, IA 2, Ebook et Learning complet</strong>.</div>'
                + '</div>';
            var btn3 = document.createElement('button');
            btn3.style.cssText = 'background:linear-gradient(135deg,#D4AF37,#C9A84C);color:#1A0A00;border:none;border-radius:20px;padding:7px 14px;font-weight:700;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;';
            btn3.innerHTML = '<i class="fas fa-arrow-up"></i> Passer au Pro — 1 500 F';
            btn3.addEventListener('click', function() { window._akoRenew('pro'); });
            div3.querySelector('div[style*="flex:1"]').appendChild(btn3);
            container.innerHTML = '';
            container.appendChild(div3);
            return;
        }

        // Lifetime ou Pro actif >7 jours : pas de bannière
        container.innerHTML = '';
    }
};