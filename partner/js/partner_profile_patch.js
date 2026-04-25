// ============================================
// PARTNER — Patch ProfilePage abonnement
// À charger APRÈS profile.js
// ============================================

(function() {
    function patchProfilePage() {
        if (typeof ProfilePage === 'undefined') {
            setTimeout(patchProfilePage, 100);
            return;
        }

        var _originalRender = ProfilePage.render;
        var _originalInit = ProfilePage.init;

        function buildSubscriptionCard() {
            var profile = App.profile;
            if (!profile) return '';

            var plan = profile.subscription_plan || 'lifetime';
            var expiresAt = profile.subscription_expires_at ? new Date(profile.subscription_expires_at) : null;
            var now = new Date();
            var isExpired = plan && plan.indexOf('expired_') === 0;
            var landingUrl = CONFIG.LANDING_URL || '/app-store/';

            var daysLeft = null;
            var expiredPlan = null;
            if (isExpired) {
                expiredPlan = plan.replace('expired_', '');
            } else if (expiresAt && expiresAt > now) {
                daysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
            }

            var planDisplay = {
                'lifetime': { label: 'Accès à vie',  icon: 'fa-infinity',      color: '#D4AF37', bg: 'rgba(212,175,55,0.12)',  badge: '♾️' },
                'starter':  { label: 'Starter',      icon: 'fa-star-half-alt', color: '#6BB5FF', bg: 'rgba(107,181,255,0.12)', badge: '⭐' },
                'pro':      { label: 'Pro',           icon: 'fa-bolt',          color: '#3DDB7D', bg: 'rgba(61,219,125,0.12)',  badge: '⚡' },
                'premium':  { label: 'Premium',       icon: 'fa-gem',           color: '#A78BFA', bg: 'rgba(167,139,250,0.12)', badge: '💎' }
            };

            var displayPlan = isExpired ? expiredPlan : plan;
            var info = planDisplay[displayPlan] || planDisplay['lifetime'];

            var h = '<div style="background:var(--color-surface,#1A1A2E);border:1px solid var(--color-border,rgba(255,255,255,0.08));border-radius:20px;padding:20px;margin-bottom:20px;">';
            h += '<div style="font-family:Cinzel,serif;font-size:14px;font-weight:700;color:var(--color-accent,#D4AF37);margin-bottom:16px;">';
            h += '<i class="fas fa-credit-card" style="margin-right:8px;"></i>Mon abonnement</div>';

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
            h += '</div></div>';

            // Barre de progression
            if (!isExpired && expiresAt && (plan === 'pro' || plan === 'premium')) {
                var totalDays = plan === 'pro' ? 30 : 90;
                var usedDays = totalDays - (daysLeft || 0);
                var pct = Math.max(0, Math.min(100, Math.round((usedDays / totalDays) * 100)));
                var barColor = daysLeft <= 3 ? '#D93B3B' : daysLeft <= 7 ? '#E67E22' : info.color;
                h += '<div style="margin-bottom:14px;">';
                h += '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--color-text-muted,#8E8E9E);margin-bottom:6px;">';
                h += '<span>Début</span><span>' + (daysLeft||0) + 'j restants sur ' + totalDays + '</span><span>Fin</span></div>';
                h += '<div style="background:rgba(255,255,255,0.06);border-radius:10px;height:8px;overflow:hidden;">';
                h += '<div style="width:' + pct + '%;height:100%;background:' + barColor + ';border-radius:10px;"></div></div>';
                if (expiresAt) {
                    var expStr = expiresAt.toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' });
                    h += '<div style="text-align:right;font-size:10px;color:var(--color-text-muted,#8E8E9E);margin-top:4px;">Expire le ' + expStr + '</div>';
                }
                h += '</div>';
            }

            // Inclus
            var inclus = plan === 'lifetime' || plan === 'pro' || plan === 'premium'
                ? ['Tout le catalogue AKOLABS', 'App Prime + IA 2 + Ebook', 'Formations complètes', 'Affiliation 10%']
                : plan === 'starter' ? ['Universe (outils IA)', 'Learning de base', 'Affiliation 10%']
                : ['Accès limité (Starter)'];

            h += '<div style="margin-bottom:16px;">';
            h += '<div style="font-size:11px;color:var(--color-text-muted,#8E8E9E);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">Inclus</div>';
            inclus.forEach(function(item) {
                h += '<div style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--color-text-secondary,#AEAEBE);padding:3px 0;">';
                h += '<i class="fas fa-check-circle" style="color:#3DDB7D;flex-shrink:0;"></i>' + item + '</div>';
            });
            h += '</div>';

            // Bouton
            window._akoRenewPartner = function(p) { window.open(landingUrl + '?plan=' + p, '_blank'); };

            if (isExpired || plan === 'starter') {
                var btnLabel = isExpired ? 'Renouveler mon accès' : 'Passer au plan Pro';
                var btnPlan  = isExpired ? (expiredPlan || 'pro') : 'pro';
                var btn = document.createElement('button');
                btn.style.cssText = 'width:100%;padding:13px;background:linear-gradient(135deg,#D4AF37,#C9A84C);color:#1A0A00;border:none;border-radius:50px;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px;';
                btn.innerHTML = '<i class="fas fa-redo"></i>' + btnLabel;
                btn.onclick = function() { window._akoRenewPartner(btnPlan); };
                h += btn.outerHTML;
            } else if (plan === 'pro' || plan === 'premium') {
                var btn2 = document.createElement('button');
                btn2.style.cssText = 'width:100%;padding:11px;background:rgba(255,255,255,0.06);color:var(--color-text-secondary,#AEAEBE);border:1px solid rgba(255,255,255,0.12);border-radius:50px;font-size:12px;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px;';
                btn2.innerHTML = '<i class="fas fa-redo"></i> Renouveler mon abonnement';
                btn2.onclick = function() { window._akoRenewPartner(plan); };
                h += btn2.outerHTML;
            }

            h += '</div>';
            return h;
        }

        ProfilePage.render = async function() {
            var html = await _originalRender.call(this);
            // Injecter placeholder carte abonnement
            var insertPoint = html.lastIndexOf('<div', html.indexOf('logout') !== -1 ? html.indexOf('logout') : html.length - 100);
            if (insertPoint > 0) {
                html = html.slice(0, insertPoint) + '<div id="sub-card-inject"></div>' + html.slice(insertPoint);
            } else {
                html = '<div id="sub-card-inject"></div>' + html;
            }
            return html;
        };

        ProfilePage.init = async function(params) {
            if (_originalInit) await _originalInit.call(this, params);
            var placeholder = document.getElementById('sub-card-inject');
            if (placeholder) placeholder.innerHTML = buildSubscriptionCard();
        };

        console.log('[PartnerPatch] ProfilePage patché');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', patchProfilePage);
    } else {
        patchProfilePage();
    }
})();
