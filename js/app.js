// ============================================
// AKOLABS - Gestion de l'installation PWA
// ============================================

var PWA = {
    deferredPrompt: null,

    init: function() {
        // 1. Ecouter l'event d'installation (Android / Chrome)
        window.addEventListener('beforeinstallprompt', function(e) {
            // Empecher l'affichage natif par defaut
            e.preventDefault();
            // Sauvegarder l'event pour le declencher plus tard
            PWA.deferredPrompt = e;
            
            // Afficher notre belle banniere apres 3 secondes
            setTimeout(function() {
                PWA.showInstallBanner();
            }, 3000);
        });

        // 2. Ecouter si l'app a ete installee avec succes
        window.addEventListener('appinstalled', function(e) {
            PWA.hideInstallBanner();
            Utils.showToast('AKOLABS est installee avec succes ! 🎉', 'success', 4000);
        });

        // 3. Gerer les iPhones (Safari iOS ne supporte pas l'installation auto)
        PWA.checkIos();
    },

    showInstallBanner: function() {
        // Ne pas afficher si l'utilisateur l'a deja fermee
        // Ne pas afficher si dismissé dans les 7 derniers jours
        var dismissed = localStorage.getItem('akolabs_pwa_dismissed');
        if (dismissed) {
            var elapsed = Date.now() - parseInt(dismissed);
            if (elapsed < 7 * 24 * 3600 * 1000) return; // 7 jours
        }
        // Ne pas afficher si déjà installé
        if (window.matchMedia('(display-mode: standalone)').matches) return;

        var existing = document.getElementById('pwa-install-banner');
        if (existing) return;

        var banner = document.createElement('div');
        banner.id = 'pwa-install-banner';
        banner.className = 'pwa-install-banner';
        
        banner.innerHTML = ''
            + '<div class="pwa-info">'
            + '  <img src="assets/images/logo.png" class="pwa-icon" alt="">'
            + '  <div>'
            + '    <div class="pwa-text-title">Installer AKOLABS</div>'
            + '    <div class="pwa-text-desc">Ajoutez l\'app sur votre ecran d\'accueil</div>'
            + '  </div>'
            + '</div>'
            + '<div class="pwa-actions">'
            + '  <button class="pwa-btn-install" onclick="PWA.install()">Installer</button>'
            + '  <button class="pwa-btn-close" onclick="PWA.dismiss()"><i class="fas fa-times"></i></button>'
            + '</div>';

        document.body.appendChild(banner);

        // Animation d'apparition
        requestAnimationFrame(function() {
            setTimeout(function() {
                banner.classList.add('show');
            }, 100);
        });
    },

    install: async function() {
        if (!PWA.deferredPrompt) {
            PWA.hideInstallBanner();
            return;
        }
        
        // Afficher le prompt natif d'installation
        PWA.deferredPrompt.prompt();
        
        // Attendre la reponse de l'utilisateur
        var choiceResult = await PWA.deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
            console.log('[PWA] Utilisateur a accepte l\'installation');
        } else {
            console.log('[PWA] Utilisateur a refuse l\'installation');
        }
        
        PWA.deferredPrompt = null;
        PWA.hideInstallBanner();
    },

    dismiss: function() {
        PWA.hideInstallBanner();
        localStorage.setItem('akolabs_pwa_dismissed', 'true');
    },

    hideInstallBanner: function() {
        var banner = document.getElementById('pwa-install-banner');
        if (banner) {
            banner.classList.remove('show');
            setTimeout(function() { banner.remove(); }, 500);
        }
    },


    // Déclencher depuis le profil (bouton manuel)
    triggerFromProfile: function() {
        // Réinitialiser le dismissed pour permettre l'affichage
        localStorage.removeItem('akolabs_pwa_dismissed');
        
        if (PWA.deferredPrompt) {
            PWA.install();
        } else if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
            // iOS : afficher les instructions
            PWA.showInstallBanner();
        } else if (window.matchMedia('(display-mode: standalone)').matches) {
            Utils.showToast('L\'app est déjà installée ! ✅', 'success');
        } else {
            // Android sans prompt disponible : afficher le banner
            PWA.showInstallBanner();
            Utils.showToast('Utilisez le menu de votre navigateur → "Ajouter à l\'écran d\'accueil"', 'info', 5000);
        }
    },

    checkIos: function() {
        var isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
        var isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator.standalone);

        // Si c'est un iPhone et que l'app n'est pas installee
        if (isIos && !isInStandaloneMode && localStorage.getItem('akolabs_pwa_ios_dismissed') !== 'true') {
            setTimeout(function() {
                var tooltip = document.createElement('div');
                tooltip.className = 'pwa-ios-tooltip';
                tooltip.id = 'pwa-ios-tooltip';
                tooltip.innerHTML = 'Pour installer AKOLABS : appuyez sur <strong>Partager</strong> <i class="fas fa-external-link-alt"></i> en bas, puis <strong>Sur l\'écran d\'accueil</strong> <i class="fas fa-plus-square"></i>.<br><button onclick="document.getElementById(\'pwa-ios-tooltip\').style.display=\'none\'; localStorage.setItem(\'akolabs_pwa_ios_dismissed\', \'true\');" style="margin-top:10px;background:#4B0082;color:white;border:none;padding:5px 15px;border-radius:10px;font-weight:bold;">Compris</button>';
                
                document.body.appendChild(tooltip);
                tooltip.style.display = 'block';
            }, 4000);
        }
    }
};

// ============================================
// AKOLABS - Application Principale
// ============================================

var App = {
    user: null,
    profile: null,
    isInitialized: false,
    sessionCheckTimer: null,

    init: async function() {
        console.log('[AKOLABS] v' + CONFIG.APP_VERSION + ' - Initialisation...');
        PWA.init();

        // Initialiser EmailJS
        try {
            if (typeof emailjs !== 'undefined') {
                emailjs.init(CONFIG.EMAILJS_PUBLIC_KEY);
                console.log('[EmailJS] Initialise');
            }
        } catch(e) { console.log('[EmailJS] Erreur init:', e); }

        try {
            if (!Onboarding.isCompleted()) {
                App.hideSplash();
                Onboarding.show();
                App.waitForOnboarding();
                return;
            }

            if (!Onboarding.isTermsAccepted()) {
                App.hideSplash();
                Onboarding.showTerms();
                App.waitForTerms();
                return;
            }

            await App.checkAuthAndStart();
        } catch (error) {
            console.error('[App] Erreur init:', error);
            App.hideSplash();
            App.showError('Erreur de connexion. Verifiez votre connexion internet.');
        }
    },

    waitForOnboarding: function() {
        var check = setInterval(function() {
            if (Onboarding.isCompleted()) {
                clearInterval(check);
                if (!Onboarding.isTermsAccepted()) {
                    App.waitForTerms();
                } else {
                    App.checkAuthAndStart();
                }
            }
        }, 500);
    },

    waitForTerms: function() {
        var check = setInterval(function() {
            if (Onboarding.isTermsAccepted()) {
                clearInterval(check);
                App.checkAuthAndStart();
            }
        }, 500);
    },

    checkAuthAndStart: async function() {
        try {
            var sessionResult = await db.auth.getSession();
            var session = sessionResult.data.session;

            if (!session) {
                console.log('[App] Aucune session trouvee');
                App.hideSplash();
                App.showLoginPage();
                return;
            }

            console.log('[App] Session trouvee pour:', session.user.email);

            var profileResult = await db
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (profileResult.error || !profileResult.data) {
                console.error('[App] Profil introuvable');
                await db.auth.signOut();
                App.hideSplash();
                App.showLoginPage();
                return;
            }

            var profile = profileResult.data;

            if (!profile.is_app_purchased) {
                console.log('[App] Acces non achete');
                await db.auth.signOut();
                App.hideSplash();
                App.showLoginPage('Votre acces n\'est pas encore active.');
                return;
            }

            // ── VÉRIFICATION ABONNEMENT ──
            // Les anciens membres (lifetime) ont subscription_plan = 'lifetime' ou null
            // Pro/Premium : vérifier expiration
            var plan = profile.subscription_plan || 'lifetime';
            var expiresAt = profile.subscription_expires_at ? new Date(profile.subscription_expires_at) : null;
            var now = new Date();

            if ((plan === 'pro' || plan === 'premium') && expiresAt && expiresAt < now) {
                // Abonnement expiré → rétrograder en starter
                console.log('[App] Abonnement', plan, 'expiré le', expiresAt);
                try {
                    await db.from('users')
                        .update({ subscription_plan: 'expired_' + plan })
                        .eq('id', profile.id);
                    profile.subscription_plan = 'expired_' + plan;
                    profile._subscription_expired = true;
                    profile._expired_plan = plan;
                } catch(e) { console.warn('[App] Update expiration:', e); }
            }

            // Calculer jours restants et exposer globalement
            App.subscriptionDaysLeft = null;
            if (expiresAt && expiresAt > now) {
                App.subscriptionDaysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
            }
            App.subscriptionPlan = plan;

            await App.handleDeviceBinding(profile);

            App.user = session.user;
            // S'assurer que l'email est toujours disponible dans profile
            if (!profile.email && session.user.email) {
                profile.email = session.user.email;
            }
            App.profile = profile;
            App.isInitialized = true;

            // === TRACKING ===
            setTimeout(function() {
                if (typeof Tracking !== 'undefined') {
                    Tracking.logAppOpen();
                    Tracking.checkPopups('app_open', null);
                }
            }, 1000);

            // === PUSH NOTIFICATIONS ===
            setTimeout(function() {
                if (typeof Push !== 'undefined') {
                    Push.init();
                }
            }, 3000);

            // === EMAIL MARKETING ===
            setTimeout(function() {
                if (typeof EmailMarketing !== 'undefined') {
                    // Traiter les emails en attente
                    EmailMarketing.processQueue();
                    // Déclencher séquence inscription (J+1)
                    if (App.profile && !App.profile._email_signup_triggered) {
                        var signupDate = new Date(App.user.created_at);
                        var hoursSinceSignup = (Date.now() - signupDate.getTime()) / 3600000;
                        if (hoursSinceSignup < 2) {
                            // Nouvel inscrit — planifier bienvenue J+1
                            EmailMarketing.trigger('signup');
                        }
                    }
                }
            }, 4000);

            // Navigation depuis click sur notification push
            navigator.serviceWorker.addEventListener('message', function(event) {
                if (event.data && event.data.type === 'PUSH_NAVIGATE' && event.data.url) {
                    Router.navigate(event.data.url);
                }
            });

            App.updateHeader();
                        // Charger le badge des notifications
            try {
                await NotificationsPage.loadNotifications();
            } catch(e) {}
            App.registerRoutes();
            App.hideSplash();
            App.showApp();
            Router.init();
            App.startSessionCheck();
            App.updateLoginStreak();

            await db.from('users')
                .update({ last_login: new Date().toISOString() })
                .eq('id', App.profile.id);

            console.log('[App] Initialise avec succes');

            setTimeout(function() {
                var name = App.profile.full_name || 'Utilisateur';
                var firstName = name.split(' ')[0];
                Utils.showToast('Bon retour, ' + firstName + ' ! 👋', 'success', 3000);
            }, 1500);

        } catch (error) {
            console.error('[App] Erreur auth:', error);
            App.hideSplash();
            App.showLoginPage();
        }
    },

        handleDeviceBinding: async function(profile) {
        var currentDeviceId = await Utils.getDeviceId();

        if (!profile.device_id) {
            // Premier appareil, on le lie
            await db.from('users')
                .update({ device_id: currentDeviceId })
                .eq('id', profile.id);
            console.log('[App] Device lie:', currentDeviceId);

        } else if (profile.device_id !== currentDeviceId) {
            // Un autre appareil etait lie avant
            // On met a jour vers CET appareil (le nouveau)
            console.log('[App] Nouveau device detecte, mise a jour');
            await db.from('users')
                .update({ device_id: currentDeviceId })
                .eq('id', profile.id);
        }
    },
    
    startSessionCheck: function() {
        App.sessionCheckTimer = setInterval(async function() {
            try {
                var myDeviceId = await Utils.getDeviceId();

                var result = await db
                    .from('users')
                    .select('device_id')
                    .eq('id', App.profile.id)
                    .single();

                if (!result.data) return;

                // Si le device_id en base est different du mien,
                // ca veut dire qu'un AUTRE appareil s'est connecte apres moi
                if (result.data.device_id && result.data.device_id !== myDeviceId) {
                    console.log('[App] Autre appareil detecte:', result.data.device_id, 'vs moi:', myDeviceId);
                    clearInterval(App.sessionCheckTimer);
                    await db.auth.signOut();
                    
                    Utils.showToast(
                        'Votre compte a ete connecte sur un autre appareil.',
                        'warning',
                        10000
                    );

                    setTimeout(function() {
                        window.location.reload();
                    }, 3000);
                }
            } catch (e) {
                // Erreur reseau, on ignore
            }
        }, CONFIG.SESSION_CHECK_INTERVAL);
    },
    registerRoutes: function() {
        Router.register('/home', {
            render: async function() { return await HomePage.render(); },
            init: async function() { await HomePage.init(); }
        });

                Router.register('/section/:id', {
            render: async function(params) { return await SectionDetail.render(params); },
            init: async function(params) { await SectionDetail.init(params); }
        });

                Router.register('/webview/:id', {
            render: async function(params) { return await SectionWebview.render(params); },
            init: async function(params) { await SectionWebview.init(params); }
        });

        Router.register('/formation/:id', {
            render: async function(params) { return await FormationDetail.render(params); },
            init: async function(params) { await FormationDetail.init(params); }
        });
        Router.register('/formation/:id', {
            render: async function(params) {
                return App.renderPlaceholder('Formation', 'fa-graduation-cap', 'Formation - Etape 10');
            },
            init: function() {}
        });

                Router.register('/affiliation', {
            render: async function() { return await AffiliationPage.render(); },
            init: async function() { await AffiliationPage.init(); }
        });

        Router.register('/files', {
            render: async function() { return await FilesPage.render(); },
            init: async function() { await FilesPage.init(); }
        });

        Router.register('/notifications', {
            render: async function() { return await NotificationsPage.render(); },
            init: async function() { await NotificationsPage.init(); }
        });

        Router.register('/profile', {
            render: async function() { return await ProfilePage.render(); },
            init: async function() { await ProfilePage.init(); }
        });
        Router.register('/profile', {
            render: async function() {
                return App.renderPlaceholder('Mon Profil', 'fa-user', 'Profil - Etape 14');
            },
            init: function() {}
        });
    },

    renderPlaceholder: function(title, icon, message) {
        var h = '';
        h += '<div style="text-align:center;padding:60px 20px;">';
        h += '<div style="width:80px;height:80px;margin:0 auto 20px;background:rgba(255,255,255,0.08);border:1px solid rgba(212,175,55,0.2);border-radius:20px;display:flex;align-items:center;justify-content:center;font-size:32px;color:#D4AF37;">';
        h += '<i class="fas ' + icon + '"></i>';
        h += '</div>';
        h += '<h2 style="font-family:Cinzel,serif;color:#D4AF37;margin-bottom:8px;">' + title + '</h2>';
        h += '<p style="color:#8E8E9E;font-size:14px;max-width:280px;margin:0 auto;">' + message + '</p>';
        h += '</div>';
        return h;
    },

    updateHeader: function() {
        if (!App.profile) return;
        var avatar = document.getElementById('user-avatar');
        if (avatar) {
            avatar.src = App.profile.avatar_url || CONFIG.DEFAULT_AVATAR;
            avatar.onerror = function() { avatar.src = CONFIG.DEFAULT_AVATAR; };
        }
    },

    updateLoginStreak: async function() {
        try {
            var today = new Date().toISOString().split('T')[0];
            var lastLogin = App.profile.last_login
                ? new Date(App.profile.last_login).toISOString().split('T')[0]
                : null;

            var newStreak = App.profile.login_streak || 0;
            if (lastLogin === today) return;

            var yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            var yesterdayStr = yesterday.toISOString().split('T')[0];

            if (lastLogin === yesterdayStr) {
                newStreak += 1;
            } else {
                newStreak = 1;
            }

            await db.from('users')
                .update({ login_streak: newStreak })
                .eq('id', App.profile.id);

            App.profile.login_streak = newStreak;
        } catch (e) {}
    },

    hideSplash: function() {
        var splash = document.getElementById('splash-screen');
        if (splash) {
            splash.classList.add('fade-out');
            setTimeout(function() { splash.style.display = 'none'; }, 600);
        }
    },

    showApp: function() {
        var app = document.getElementById('app');
        if (app) {
            app.style.display = 'flex';
            app.style.opacity = '0';
            requestAnimationFrame(function() {
                app.style.transition = 'opacity 0.4s ease';
                app.style.opacity = '1';
            });
        }
    },

    showLoginPage: function(message) {
        var app = document.getElementById('app');
        if (app) app.style.display = 'none';

        var existing = document.getElementById('login-page');
        if (existing) existing.remove();

        var page = document.createElement('div');
        page.id = 'login-page';
        page.className = 'login-container';

        var h = '';
        h += '<div class="login-card">';
        h += '<img src="assets/images/logo.png" alt="AKOLABS" class="login-logo" onerror="this.style.display=\'none\'">';
        h += '<h1 class="login-title">AKOLABS</h1>';
        h += '<p class="login-subtitle">' + (message || 'Connectez-vous pour acceder') + '</p>';
        h += '<div class="input-group">';
        h += '<label class="input-label">Email</label>';
        h += '<input type="email" class="input-field" id="login-email" placeholder="votre@email.com">';
        h += '</div>';
        h += '<div class="input-group" style="position:relative;">';
        h += '<label class="input-label">Mot de passe</label>';
        h += '<input type="password" class="input-field" id="login-password" placeholder="Votre mot de passe" style="padding-right:44px;">';
        h += '<span class="login-show-password" onclick="App.togglePassword()"><i class="fas fa-eye" id="password-eye-icon"></i></span>';
        h += '</div>';
        h += '<button class="btn btn-primary btn-block btn-lg mt-lg" id="btn-login" onclick="App.handleLogin()">';
        h += '<span class="btn-text">Se connecter</span>';
        h += '</button>';
        h += '<div class="login-divider">ou</div>';
        h += '<button class="btn btn-outline btn-block" onclick="window.open(\'' + CONFIG.LANDING_URL + '\', \'_blank\')">';
        h += '<i class="fas fa-shopping-cart"></i> Acheter l\'acces';
        h += '</button>';
        h += '</div>';

        page.innerHTML = h;
        document.body.appendChild(page);

        var pwd = document.getElementById('login-password');
        if (pwd) {
            pwd.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') App.handleLogin();
            });
        }
    },

    togglePassword: function() {
        var input = document.getElementById('login-password');
        var icon = document.getElementById('password-eye-icon');
        if (!input || !icon) return;
        if (input.type === 'password') {
            input.type = 'text';
            icon.className = 'fas fa-eye-slash';
        } else {
            input.type = 'password';
            icon.className = 'fas fa-eye';
        }
    },

    showError: function(message) {
        var app = document.getElementById('app');
        if (app) app.style.display = 'none';
        var page = document.createElement('div');
        page.className = 'login-container';
        page.innerHTML = '<div class="login-card" style="text-align:center;"><i class="fas fa-wifi" style="font-size:48px;color:#DC3545;margin-bottom:20px;"></i><h2 style="color:#F8F9FA;font-size:18px;margin-bottom:8px;">Oops !</h2><p style="color:#8E8E9E;font-size:14px;margin-bottom:24px;">' + message + '</p><button class="btn btn-primary" onclick="window.location.reload()"><i class="fas fa-redo"></i> Reessayer</button></div>';
        document.body.appendChild(page);
    },

    handleLogin: async function() {
        var emailEl = document.getElementById('login-email');
        var passwordEl = document.getElementById('login-password');
        var btn = document.getElementById('btn-login');

        var email = emailEl ? emailEl.value.trim() : '';
        var password = passwordEl ? passwordEl.value : '';

        if (!email || !password) {
            Utils.showToast('Remplissez tous les champs', 'warning');
            return;
        }

        if (!Utils.isValidEmail(email)) {
            Utils.showToast('Email invalide', 'error');
            return;
        }

        btn.classList.add('btn-loading');
        btn.disabled = true;

        try {
            var result = await db.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (result.error) throw result.error;

            Utils.showToast('Connexion reussie !', 'success');
            setTimeout(function() { window.location.reload(); }, 1000);
        } catch (error) {
            var msg = 'Erreur de connexion';
            if (error.message && error.message.indexOf('Invalid login') !== -1) {
                msg = 'Email ou mot de passe incorrect';
            }
            Utils.showToast(msg, 'error');
        }

        btn.classList.remove('btn-loading');
        btn.disabled = false;
    },

    logout: async function() {
        try {
            await db.auth.signOut();
            if (App.sessionCheckTimer) clearInterval(App.sessionCheckTimer);
        } catch (e) {}
        window.location.reload();
    }
};

document.addEventListener('DOMContentLoaded', function() {
    App.init();
});
// ============================================================
// AKO LAZY LOADER — IntersectionObserver pour images .ako-lazy
// Remplace loading="lazy" natif (non fiable sur Android WebView)
// ============================================================
var AkoLazy = {
    observer: null,

    init: function() {
        if (!('IntersectionObserver' in window)) {
            // Fallback : charger toutes les images directement
            AkoLazy.loadAll();
            return;
        }
        AkoLazy.observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    AkoLazy.loadImg(entry.target);
                    AkoLazy.observer.unobserve(entry.target);
                }
            });
        }, {
            rootMargin: '200px 0px', // Précharger 200px avant que l'image entre dans l'écran
            threshold: 0
        });

        AkoLazy.observe();
    },

    observe: function() {
        // Observer toutes les images .ako-lazy présentes dans le DOM
        var imgs = document.querySelectorAll('img.ako-lazy[data-src]');
        for (var i = 0; i < imgs.length; i++) {
            AkoLazy.observer.observe(imgs[i]);
        }
    },

    loadImg: function(img) {
        var src = img.getAttribute('data-src');
        if (!src) return;
        img.src = src;
        img.removeAttribute('data-src');
        img.classList.remove('ako-lazy');
    },

    loadAll: function() {
        var imgs = document.querySelectorAll('img.ako-lazy[data-src]');
        for (var i = 0; i < imgs.length; i++) {
            AkoLazy.loadImg(imgs[i]);
        }
    },

    // Appeler après chaque rendu dynamique (home, sections, etc.)
    refresh: function() {
        if (AkoLazy.observer) {
            AkoLazy.observe();
        } else {
            AkoLazy.loadAll();
        }
    }
};

// Init au chargement
document.addEventListener('DOMContentLoaded', function() {
    AkoLazy.init();
});
