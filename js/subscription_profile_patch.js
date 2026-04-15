// ============================================
// AKOLABS — Patch Abonnement pour ProfilePage
// À charger APRÈS profile.js dans index.html
// ============================================

(function() {
    // Attendre que ProfilePage soit défini
    function patchProfilePage() {
        if (typeof ProfilePage === 'undefined') {
            setTimeout(patchProfilePage, 100);
            return;
        }

        // Sauvegarder les fonctions originales
        var _originalRender = ProfilePage.render;
        var _originalInit   = ProfilePage.init;

        // ── HELPER : Carte abonnement HTML ──
        function buildSubscriptionCard() {
            var profile = App.profile;
            if (!profile) return '';

            var plan = profile.subscription_plan || 'lifetime';
            var expiresAt = profile.subscription_expires_at ? new Date(profile.subscription_expires_at) : null;
            var now = new Date();
            var isExpired = plan && plan.indexOf('expired_') === 0;
            var landingUrl = (CONFIG.LANDING_URL || '/app-store/');

            // Calculs
            var daysLeft = null;
            var expiredPlan = null;
            if (isExpired) {
                expiredPlan = plan.replace('expired_', '');
            } else if (expiresAt && expiresAt > now) {
                daysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
            }

            // Infos visuelles selon le plan
            var planDisplay = {
                'lifetime' : { label: 'Accès à vie',  icon: 'fa-infinity',     color: '#D4AF37', bg: 'rgba(212,175,55,0.12)',  badge: '♾️' },
                'starter'  : { label: 'Starter',      icon: 'fa-star-half-alt',color: '#6BB5FF', bg: 'rgba(107,181,255,0.12)', badge: '⭐' },
                'pro'      : { label: 'Pro',           icon: 'fa-bolt',         color: '#3DDB7D', bg: 'rgba(61,219,125,0.12)',  badge: '⚡' },
                'premium'  : { label: 'Premium',       icon: 'fa-gem',          color: '#A78BFA', bg: 'rgba(167,139,250,0.12)', badge: '💎' }
            };

            var displayPlan = isExpired ? expiredPlan : plan;
            var info = planDisplay[displayPlan] || planDisplay['lifetime'];

            var h = '';
            h += '<div style="background:var(--color-surface,#1A1A2E);border:1px solid var(--color-border,rgba(255,255,255,0.08));border-radius:20px;padding:20px;margin-bottom:20px;">';
            h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">';
            h += '<div style="font-family:Cinzel,serif;font-size:14px;font-weight:700;color:var(--color-accent,#D4AF37);">';
            h += '<i class="fas fa-credit-card" style="margin-right:8px;"></i>Mon abonnement';
            h += '</div>';
            h += '</div>';

            // Badge plan
            h += '<div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;">';
            h += '<div style="width:52px;height:52px;border-radius:14px;background:' + info.bg + ';border:1px solid ' + info.color + ';display:flex;align-items:center;justify-content:center;font-size:22px;">' + info.badge + '</div>';
            h += '<div>';
            h += '<div style="font-size:18px;font-weight:700;color:' + info.color + ';font-family:Cinzel,serif;">' + info.label + '</div>';

            if (isExpired) {
                h += '<div style="font-size:12px;color:#D93B3B;font-weight:600;">⚠️ Abonnement expiré</div>';
            } else if (plan === 'lifetime') {
                h += '<div style="font-size:12px;color:var(--color-text-muted,#8E8E9E);">Accès illimité — aucune expiration</div>';
            } else if (daysLeft !== null) {
                var dayColor = daysLeft <= 3 ? '#D93B3B' : daysLeft <= 7 ? '#E67E22' : '#3DDB7D';
                h += '<div style="font-size:12px;color:' + dayColor + ';font-weight:600;">';
                h += '<i class="fas fa-clock" style="margin-right:4px;"></i>' + daysLeft + ' jour' + (daysLeft > 1 ? 's' : '') + ' restant' + (daysLeft > 1 ? 's' : '');
                h += '</div>';
            }

            h += '</div>';
            h += '</div>';

            // Barre de progression (pour Pro et Premium)
            if (!isExpired && expiresAt && (plan === 'pro' || plan === 'premium')) {
                var totalDays = plan === 'pro' ? 30 : 90;
                var usedDays = totalDays - (daysLeft || 0);
                var pct = Math.max(0, Math.min(100, Math.round((usedDays / totalDays) * 100)));
                var barColor = daysLeft <= 3 ? '#D93B3B' : daysLeft <= 7 ? '#E67E22' : info.color;
                h += '<div style="margin-bottom:14px;">';
                h += '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--color-text-muted,#8E8E9E);margin-bottom:6px;">';
                h += '<span>Début</span>';
                h += '<span>' + (daysLeft || 0) + ' j restants sur ' + totalDays + '</span>';
                h += '<span>Fin</span>';
                h += '</div>';
                h += '<div style="background:rgba(255,255,255,0.06);border-radius:10px;height:8px;overflow:hidden;">';
                h += '<div style="width:' + pct + '%;height:100%;background:' + barColor + ';border-radius:10px;transition:width .5s ease;"></div>';
                h += '</div>';
                if (expiresAt) {
                    var expStr = expiresAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
                    h += '<div style="text-align:right;font-size:10px;color:var(--color-text-muted,#8E8E9E);margin-top:4px;">Expire le ' + expStr + '</div>';
                }
                h += '</div>';
            }

            // Ce qui est inclus
            var inclus = [];
            if (plan === 'lifetime' || plan === 'pro' || plan === 'premium') {
                inclus = ['Tout le catalogue AKOLABS', 'App Prime + IA 2 + Ebook', 'Formations complètes', 'Affiliation 10%'];
            } else if (plan === 'starter') {
                inclus = ['Universe (outils IA)', 'Learning de base', 'Affiliation 10%'];
            } else if (isExpired) {
                inclus = ['Accès limité (plan Starter)'];
            }

            if (inclus.length > 0) {
                h += '<div style="margin-bottom:16px;">';
                h += '<div style="font-size:11px;color:var(--color-text-muted,#8E8E9E);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">Inclus</div>';
                h += '<div style="display:flex;flex-direction:column;gap:5px;">';
                inclus.forEach(function(item) {
                    h += '<div style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--color-text-secondary,#AEAEBE);">';
                    h += '<i class="fas fa-check-circle" style="color:#3DDB7D;flex-shrink:0;"></i>' + item;
                    h += '</div>';
                });
                h += '</div>';
                h += '</div>';
            }

            // Boutons
            if (isExpired || plan === 'starter') {
                var btnLabel = isExpired ? 'Renouveler mon accès' : 'Passer au plan Pro';
                var btnPlan  = isExpired ? (expiredPlan || 'pro') : 'pro';
                h += '<button onclick="window.open(\'' + landingUrl + '?plan=' + btnPlan + '\', \'_blank\')" ';
                h += 'style="width:100%;padding:13px;background:linear-gradient(135deg,#D4AF37,#C9A84C);color:#1A0A00;border:none;border-radius:50px;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px;">';
                h += '<i class="fas fa-redo"></i>' + btnLabel;
                h += '</button>';
            } else if (plan === 'pro' || plan === 'premium') {
                h += '<button onclick="window.open(\'' + landingUrl + '?plan=' + plan + '\', \'_blank\')" ';
                h += 'style="width:100%;padding:11px;background:rgba(255,255,255,0.06);color:var(--color-text-secondary,#AEAEBE);border:1px solid rgba(255,255,255,0.12);border-radius:50px;font-size:12px;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px;">';
                h += '<i class="fas fa-redo"></i> Renouveler mon abonnement';
                h += '</button>';
            }

            h += '</div>';
            return h;
        }

        // ── PATCH render() — injecter la carte abonnement ──
        ProfilePage.render = async function() {
            var originalHtml = await _originalRender.call(this);

            // Injecter la carte abonnement avant la section "Paramètres" ou à la fin
            // On cherche un ancre fiable dans le HTML rendu
            var injected = false;

            // Essai 1 : avant la div qui contient "Déconnexion" ou "logout"
            if (originalHtml.indexOf('logout') !== -1 || originalHtml.indexOf('Déconnexion') !== -1) {
                var insertPoint = originalHtml.lastIndexOf('<div', originalHtml.indexOf('logout'));
                if (insertPoint > 0) {
                    originalHtml = originalHtml.slice(0, insertPoint)
                        + '<div id="sub-card-inject"></div>'
                        + originalHtml.slice(insertPoint);
                    injected = true;
                }
            }

            // Essai 2 : avant le dernier grand bloc si pas trouvé
            if (!injected) {
                originalHtml = '<div id="sub-card-inject"></div>' + originalHtml;
            }

            return originalHtml;
        };

        // ── PATCH init() — remplir la carte après rendu ──
        ProfilePage.init = async function(params) {
            if (_originalInit) await _originalInit.call(this, params);

            // Injecter la carte dans le placeholder
            var placeholder = document.getElementById('sub-card-inject');
            if (placeholder) {
                placeholder.innerHTML = buildSubscriptionCard();
            }
        };

        console.log('[SubPatch] ProfilePage patché avec gestion abonnement');
    }

    // Démarrer le patch dès que le DOM est prêt
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', patchProfilePage);
    } else {
        patchProfilePage();
    }
})();
