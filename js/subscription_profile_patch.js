// ============================================================
// AKOLABS — Patch Abonnement pour ProfilePage v2
// Gère : free_trial, monthly, quarterly + plans legacy
// ============================================================

(function() {
    function patchProfilePage() {
        if (typeof ProfilePage === 'undefined') {
            setTimeout(patchProfilePage, 100);
            return;
        }

        var _originalRender = ProfilePage.render;
        var _originalInit   = ProfilePage.init;

        function buildSubscriptionCard() {
            var profile = App.profile;
            if (!profile) return '';

            var plan       = profile.subscription_plan || 'lifetime';
            var expiresAt  = profile.subscription_expires_at ? new Date(profile.subscription_expires_at) : null;
            var now        = new Date();
            var isExpired  = plan && plan.indexOf('expired_') === 0;
            var isLegacy   = ['lifetime','starter','pro','premium'].indexOf(plan) !== -1;
            var isNewPlan  = plan === 'free_trial' || plan === 'monthly' || plan === 'quarterly';
            var isNewExpired = plan === 'expired_monthly' || plan === 'expired_quarterly';

            // Infos visuelles par plan
            var planDisplay = {
                'lifetime'         : { label: 'Accès à vie',    icon: 'fa-infinity',      color: '#D4AF37', bg: 'rgba(212,175,55,0.12)',  badge: '♾️' },
                'starter'          : { label: 'Starter',        icon: 'fa-star-half-alt', color: '#6BB5FF', bg: 'rgba(107,181,255,0.12)', badge: '⭐' },
                'pro'              : { label: 'Pro',            icon: 'fa-bolt',          color: '#3DDB7D', bg: 'rgba(61,219,125,0.12)',  badge: '⚡' },
                'premium'          : { label: 'Premium',        icon: 'fa-gem',           color: '#A78BFA', bg: 'rgba(167,139,250,0.12)', badge: '💎' },
                'free_trial'       : { label: 'Essai Gratuit',  icon: 'fa-gift',          color: '#FFB347', bg: 'rgba(255,179,71,0.12)',  badge: '🎁' },
                'monthly'          : { label: 'Mensuel',        icon: 'fa-calendar',      color: '#3DDB7D', bg: 'rgba(61,219,125,0.12)',  badge: '⚡' },
                'quarterly'        : { label: 'Trimestriel',    icon: 'fa-gem',           color: '#A78BFA', bg: 'rgba(167,139,250,0.12)', badge: '💎' },
                'expired_pro'      : { label: 'Pro (expiré)',   icon: 'fa-bolt',          color: '#D93B3B', bg: 'rgba(217,59,59,0.10)',   badge: '⚠️' },
                'expired_premium'  : { label: 'Premium (expiré)',icon: 'fa-gem',          color: '#D93B3B', bg: 'rgba(217,59,59,0.10)',   badge: '⚠️' },
                'expired_monthly'  : { label: 'Mensuel (expiré)',icon: 'fa-calendar',     color: '#D93B3B', bg: 'rgba(217,59,59,0.10)',   badge: '⚠️' },
                'expired_quarterly': { label: 'Trimestriel (expiré)',icon: 'fa-gem',      color: '#D93B3B', bg: 'rgba(217,59,59,0.10)',   badge: '⚠️' }
            };
            var info = planDisplay[plan] || planDisplay['lifetime'];

            // Calculs
            var daysLeft = null;
            if ((plan === 'pro' || plan === 'premium' || plan === 'monthly' || plan === 'quarterly') && expiresAt && expiresAt > now) {
                daysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
            }

            // Essai gratuit
            var trialDaysLeft = null;
            if (plan === 'free_trial') {
                var trialStart = profile.free_trial_started_at
                    ? new Date(profile.free_trial_started_at)
                    : new Date(profile.created_at || Date.now());
                trialDaysLeft = Math.max(0, 30 - Math.floor((now - trialStart) / (1000 * 60 * 60 * 24)));
            }

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

            if (isExpired || isNewExpired) {
                h += '<div style="font-size:12px;color:#D93B3B;font-weight:600;">⚠️ Abonnement expiré — Renouveler</div>';
            } else if (plan === 'lifetime') {
                h += '<div style="font-size:12px;color:var(--color-text-muted,#8E8E9E);">Accès illimité — aucune expiration</div>';
            } else if (plan === 'free_trial') {
                if (trialDaysLeft > 0) {
                    var tColor = trialDaysLeft <= 5 ? '#E67E22' : '#FFB347';
                    h += '<div style="font-size:12px;color:' + tColor + ';font-weight:600;">';
                    h += '<i class="fas fa-clock" style="margin-right:4px;"></i>' + trialDaysLeft + ' jour' + (trialDaysLeft > 1 ? 's' : '') + ' restant' + (trialDaysLeft > 1 ? 's' : '') + ' (essai gratuit)';
                    h += '</div>';
                } else {
                    h += '<div style="font-size:12px;color:#D93B3B;font-weight:600;">⚠️ Essai expiré — Abonnez-vous</div>';
                }
            } else if (daysLeft !== null) {
                var dayColor = daysLeft <= 3 ? '#D93B3B' : daysLeft <= 7 ? '#E67E22' : '#3DDB7D';
                h += '<div style="font-size:12px;color:' + dayColor + ';font-weight:600;">';
                h += '<i class="fas fa-clock" style="margin-right:4px;"></i>' + daysLeft + ' jour' + (daysLeft > 1 ? 's' : '') + ' restant' + (daysLeft > 1 ? 's' : '');
                h += '</div>';
            }
            h += '</div>';
            h += '</div>';

            // Barre de progression (monthly/quarterly)
            if ((plan === 'monthly' || plan === 'quarterly') && daysLeft !== null && expiresAt) {
                var totalDays = plan === 'monthly' ? 30 : 90;
                var usedDays  = totalDays - daysLeft;
                var pct       = Math.max(0, Math.min(100, Math.round((usedDays / totalDays) * 100)));
                var barColor  = daysLeft <= 3 ? '#D93B3B' : daysLeft <= 7 ? '#E67E22' : info.color;
                h += '<div style="margin-bottom:14px;">';
                h += '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--color-text-muted,#8E8E9E);margin-bottom:6px;">';
                h += '<span>Début</span><span>' + daysLeft + ' j restants sur ' + totalDays + '</span><span>Fin</span>';
                h += '</div>';
                h += '<div style="background:rgba(255,255,255,0.06);border-radius:10px;height:8px;overflow:hidden;">';
                h += '<div style="width:' + pct + '%;height:100%;background:' + barColor + ';border-radius:10px;transition:width .5s ease;"></div>';
                h += '</div>';
                var expStr = expiresAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
                h += '<div style="text-align:right;font-size:10px;color:var(--color-text-muted,#8E8E9E);margin-top:4px;">Expire le ' + expStr + '</div>';
                h += '</div>';
            }

            // Barre de progression essai gratuit
            if (plan === 'free_trial' && trialDaysLeft !== null) {
                var usedTrial = 30 - trialDaysLeft;
                var pctTrial  = Math.max(0, Math.min(100, Math.round((usedTrial / 30) * 100)));
                var barT      = trialDaysLeft <= 5 ? '#E67E22' : '#FFB347';
                h += '<div style="margin-bottom:14px;">';
                h += '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--color-text-muted,#8E8E9E);margin-bottom:6px;">';
                h += '<span>Début</span><span>' + trialDaysLeft + ' j / 30</span><span>Fin</span>';
                h += '</div>';
                h += '<div style="background:rgba(255,255,255,0.06);border-radius:10px;height:8px;overflow:hidden;">';
                h += '<div style="width:' + pctTrial + '%;height:100%;background:' + barT + ';border-radius:10px;"></div>';
                h += '</div>';
                h += '</div>';
            }

            // Ce qui est inclus
            var inclus = [];
            if (plan === 'lifetime' || plan === 'pro' || plan === 'premium' || plan === 'monthly' || plan === 'quarterly') {
                inclus = ['Tout le catalogue AKOLABS', 'App Prime + IA 2 + Ebook', 'Formations complètes', 'Affiliation 10%'];
            } else if (plan === 'starter') {
                inclus = ['Universe (outils IA)', 'Learning de base', 'Affiliation 10%'];
            } else if (plan === 'free_trial') {
                inclus = ['Sections gratuites uniquement', 'Affiliation 10%'];
            } else if (isExpired || isNewExpired) {
                inclus = ['Accès limité aux sections gratuites'];
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

            // Boutons d'action
            if (plan === 'free_trial' || isExpired || isNewExpired || plan === 'starter') {
                // Abonnement via modal in-app (nouveaux utilisateurs)
                if (plan === 'free_trial' || isNewExpired) {
                    h += '<button onclick="SubscriptionModal.show()" ';
                    h += 'style="width:100%;padding:13px;background:linear-gradient(135deg,#D4AF37,#C9A84C);color:#1A0A00;border:none;border-radius:50px;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:8px;">';
                    h += '<i class="fas fa-crown"></i>';
                    h += plan === 'free_trial' ? 'S\'abonner — dès 3 500 F / mois' : 'Renouveler mon abonnement';
                    h += '</button>';
                } else {
                    // Legacy expiré → landing page
                    var legacyLanding = (CONFIG.LANDING_URL || '/app-store/');
                    h += '<button onclick="window.open(\'' + legacyLanding + '\', \'_blank\')" ';
                    h += 'style="width:100%;padding:13px;background:linear-gradient(135deg,#D4AF37,#C9A84C);color:#1A0A00;border:none;border-radius:50px;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px;">';
                    h += '<i class="fas fa-redo"></i>';
                    h += (plan === 'starter') ? 'Passer au plan Pro' : 'Renouveler mon accès';
                    h += '</button>';
                }
            } else if (plan === 'monthly' || plan === 'quarterly') {
                // Renouveler via modal in-app
                h += '<button onclick="SubscriptionModal.show()" ';
                h += 'style="width:100%;padding:11px;background:rgba(255,255,255,0.06);color:var(--color-text-secondary,#AEAEBE);border:1px solid rgba(255,255,255,0.12);border-radius:50px;font-size:12px;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px;">';
                h += '<i class="fas fa-redo"></i> Renouveler / Changer de plan';
                h += '</button>';
            } else if (plan === 'pro' || plan === 'premium') {
                // Legacy pro/premium → landing
                var ll2 = (CONFIG.LANDING_URL || '/app-store/');
                h += '<button onclick="window.open(\'' + ll2 + '?plan=' + plan + '\', \'_blank\')" ';
                h += 'style="width:100%;padding:11px;background:rgba(255,255,255,0.06);color:var(--color-text-secondary,#AEAEBE);border:1px solid rgba(255,255,255,0.12);border-radius:50px;font-size:12px;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px;">';
                h += '<i class="fas fa-redo"></i> Renouveler mon abonnement';
                h += '</button>';
            }

            h += '</div>';
            return h;
        }

        // ── PATCH render() ──
        ProfilePage.render = async function() {
            var originalHtml = await _originalRender.call(this);
            var injected = false;
            if (originalHtml.indexOf('logout') !== -1 || originalHtml.indexOf('Déconnexion') !== -1) {
                var insertPoint = originalHtml.lastIndexOf('<div', originalHtml.indexOf('logout'));
                if (insertPoint > 0) {
                    originalHtml = originalHtml.slice(0, insertPoint)
                        + '<div id="sub-card-inject"></div>'
                        + originalHtml.slice(insertPoint);
                    injected = true;
                }
            }
            if (!injected) {
                originalHtml = '<div id="sub-card-inject"></div>' + originalHtml;
            }
            return originalHtml;
        };

        // ── PATCH init() ──
        ProfilePage.init = async function(params) {
            if (_originalInit) await _originalInit.call(this, params);
            var placeholder = document.getElementById('sub-card-inject');
            if (placeholder) {
                placeholder.innerHTML = buildSubscriptionCard();
            }
        };

        console.log('[SubPatch v2] ProfilePage patché avec gestion abonnement');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', patchProfilePage);
    } else {
        patchProfilePage();
    }
})();
