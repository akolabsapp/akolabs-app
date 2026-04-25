// ============================================
// AKOLABS - MODULE OFFRES FLASH
// ============================================

var FlashSale = {
    active: [],        // offres flash actives chargées
    _timers: {},       // intervalles des comptes à rebours
    _bannerTimer: null
};

/* --- Charger les offres flash actives --- */
FlashSale.load = async function() {
    try {
        console.log('[FlashSale] Début load...');

        // Tenter SANS filtre pour voir ce que Supabase retourne
        var r = await db.from('flash_sales').select('*');

        console.log('[FlashSale] Réponse brute Supabase:', JSON.stringify(r));

        if (r.error) {
            console.error('[FlashSale] Erreur Supabase:', r.error.message, r.error.code, r.error.hint);
            FlashSale.active = [];
            return FlashSale.active;
        }

        var all = r.data || [];
        console.log('[FlashSale] Total lignes retournées:', all.length);

        var now = Date.now();
        FlashSale.active = all.filter(function(f) {
            var start = new Date(f.starts_at).getTime();
            var end = new Date(f.ends_at).getTime();
            var ok = f.is_active && start <= now && end > now;
            console.log('[FlashSale] Offre "' + f.title + '" is_active=' + f.is_active
                + ' starts=' + f.starts_at + ' ends=' + f.ends_at + ' => OK=' + ok);
            return ok;
        });

        console.log('[FlashSale] Actives après filtre:', FlashSale.active.length);
    } catch(e) {
        console.error('[FlashSale] Exception:', e.message, e.stack);
        FlashSale.active = [];
    }
    return FlashSale.active;
};

/* --- Obtenir l'offre flash d'une section --- */
FlashSale.forSection = function(sectionId) {
    for (var i = 0; i < FlashSale.active.length; i++) {
        var f = FlashSale.active[i];
        if (f.applies_to === 'all_sections') return f;
        if (f.section_id === sectionId) return f;
    }
    return null;
};

/* --- Calculer le prix flash --- */
FlashSale.getPrice = function(flash, originalPrice) {
    if (flash.flash_price) return flash.flash_price;
    if (flash.discount_percent) return Math.round(originalPrice * (1 - flash.discount_percent / 100));
    if (flash.discount_fixed) return Math.max(0, originalPrice - flash.discount_fixed);
    return originalPrice;
};

/* --- Formater le temps restant --- */
FlashSale.timeLeft = function(endsAt) {
    var diff = new Date(endsAt).getTime() - Date.now();
    if (diff <= 0) return null;
    var h = Math.floor(diff / 3600000);
    var m = Math.floor((diff % 3600000) / 60000);
    var s = Math.floor((diff % 60000) / 1000);
    if (h > 0) return h + 'h ' + String(m).padStart(2,'0') + 'm ' + String(s).padStart(2,'0') + 's';
    if (m > 0) return String(m).padStart(2,'0') + 'm ' + String(s).padStart(2,'0') + 's';
    return String(s).padStart(2,'0') + 's';
};

/* --- Afficher la bannière urgence sur la home --- */
FlashSale.renderHomeBanner = function(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    // Nettoyer le timer précédent
    if (FlashSale._bannerTimer) clearInterval(FlashSale._bannerTimer);

    if (FlashSale.active.length === 0) {
        container.innerHTML = '';
        return;
    }

    // Prendre l'offre qui expire le plus tôt
    var flash = FlashSale.active[0];

    var render = function() {
        var left = FlashSale.timeLeft(flash.ends_at);
        if (!left) {
            clearInterval(FlashSale._bannerTimer);
            container.innerHTML = '';
            return;
        }

        var discountLabel = '';
        if (flash.discount_percent) discountLabel = '-' + flash.discount_percent + '%';
        else if (flash.discount_fixed) discountLabel = '-' + Utils.formatPrice(flash.discount_fixed);

        var targetRoute = flash.section_id ? '/section/' + flash.section_id : '/home';

        container.innerHTML = ''
            + '<div class="flash-banner" onclick="Router.navigate(\'' + targetRoute + '\')" style="'
            + 'background:linear-gradient(135deg,' + (flash.banner_color||'#D93B3B') + ',#B52D2D);'
            + 'border-radius:14px;padding:14px 16px;margin-bottom:16px;cursor:pointer;'
            + 'display:flex;align-items:center;gap:12px;'
            + 'box-shadow:0 4px 20px rgba(217,59,59,0.35);'
            + 'animation:flashPulse 2s infinite;">'
            + '<div style="flex-shrink:0;font-size:28px;">⚡</div>'
            + '<div style="flex:1;min-width:0;">'
            + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:2px;">'
            + '<span style="font-family:Cinzel,serif;font-weight:700;color:#fff;font-size:13px;">' + (flash.badge_text || '⚡ OFFRE FLASH') + '</span>'
            + (discountLabel ? '<span style="background:rgba(255,255,255,0.25);color:#fff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;">' + discountLabel + '</span>' : '')
            + '</div>'
            + '<div style="color:rgba(255,255,255,0.9);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + flash.title + '</div>'
            + '</div>'
            + '<div style="flex-shrink:0;text-align:center;">'
            + '<div id="flash-banner-timer" style="font-family:monospace;font-size:15px;font-weight:700;color:#fff;background:rgba(0,0,0,0.25);padding:4px 10px;border-radius:8px;letter-spacing:1px;">' + left + '</div>'
            + '<div style="font-size:9px;color:rgba(255,255,255,0.7);margin-top:2px;">RESTANT</div>'
            + '</div>'
            + '</div>';
    };

    render();
    FlashSale._bannerTimer = setInterval(function() {
        var timerEl = document.getElementById('flash-banner-timer');
        if (timerEl) {
            var left = FlashSale.timeLeft(flash.ends_at);
            if (!left) {
                clearInterval(FlashSale._bannerTimer);
                container.innerHTML = '';
            } else {
                timerEl.textContent = left;
            }
        } else {
            render();
        }
    }, 1000);
};

/* --- Badge flash sur une carte section --- */
FlashSale.renderBadge = function(flash) {
    if (!flash) return '';
    var left = FlashSale.timeLeft(flash.ends_at);
    if (!left) return '';
    var label = flash.discount_percent ? '-' + flash.discount_percent + '%' : (flash.badge_text || '⚡');
    return '<div style="'
        + 'position:absolute;top:8px;right:8px;'
        + 'background:linear-gradient(135deg,#D93B3B,#B52D2D);'
        + 'color:#fff;font-size:10px;font-weight:700;'
        + 'padding:3px 8px;border-radius:20px;'
        + 'box-shadow:0 2px 8px rgba(217,59,59,0.4);'
        + 'letter-spacing:0.5px;white-space:nowrap;'
        + '">⚡ ' + label + '</div>';
};

/* --- Bloc prix flash pour section-detail --- */
FlashSale.renderPriceBlock = function(flash, originalPrice, containerId) {
    var container = document.getElementById(containerId);
    if (!container || !flash) return;

    if (FlashSale._timers[containerId]) clearInterval(FlashSale._timers[containerId]);

    var flashPrice = FlashSale.getPrice(flash, originalPrice);
    var saving = originalPrice - flashPrice;
    var pct = Math.round((saving / originalPrice) * 100);

    var renderBlock = function() {
        var left = FlashSale.timeLeft(flash.ends_at);
        if (!left) {
            clearInterval(FlashSale._timers[containerId]);
            // Recharger la page pour afficher le prix normal
            Router.navigate('/section/' + (flash.section_id || ''));
            return;
        }

        container.innerHTML = ''
            + '<div style="background:linear-gradient(135deg,rgba(217,59,59,0.08),rgba(217,59,59,0.03));'
            + 'border:1.5px solid rgba(217,59,59,0.3);border-radius:14px;padding:16px;margin:12px 0;">'
            + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">'
            + '<span style="font-size:18px;">⚡</span>'
            + '<span style="font-family:Cinzel,serif;font-weight:700;color:#D93B3B;font-size:13px;">' + (flash.badge_text || 'OFFRE FLASH') + '</span>'
            + '<span style="background:#D93B3B;color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;">-' + pct + '%</span>'
            + '</div>'
            + '<div style="display:flex;align-items:baseline;gap:10px;margin-bottom:10px;">'
            + '<span style="font-family:Cinzel,serif;font-size:26px;font-weight:700;color:#D93B3B;">' + Utils.formatPrice(flashPrice) + '</span>'
            + '<span style="font-size:14px;color:#8A87A0;text-decoration:line-through;">' + Utils.formatPrice(originalPrice) + '</span>'
            + '<span style="font-size:12px;color:#2E9E5B;font-weight:600;">-' + Utils.formatPrice(saving) + '</span>'
            + '</div>'
            + '<div style="display:flex;align-items:center;gap:8px;">'
            + '<span style="font-size:11px;color:#8A87A0;">Expire dans</span>'
            + '<span id="flash-detail-timer-' + containerId + '" style="font-family:monospace;font-size:14px;font-weight:700;color:#D93B3B;background:rgba(217,59,59,0.1);padding:3px 10px;border-radius:8px;">' + left + '</span>'
            + '</div>'
            + '</div>';
    };

    renderBlock();
    FlashSale._timers[containerId] = setInterval(function() {
        var timerEl = document.getElementById('flash-detail-timer-' + containerId);
        if (timerEl) {
            var left = FlashSale.timeLeft(flash.ends_at);
            if (!left) {
                clearInterval(FlashSale._timers[containerId]);
                Router.navigate('/section/' + (flash.section_id || ''));
            } else {
                timerEl.textContent = left;
            }
        } else {
            renderBlock();
        }
    }, 1000);
};

/* --- CSS animation pulse --- */
FlashSale.injectStyles = function() {
    if (document.getElementById('flash-sale-styles')) return;
    var st = document.createElement('style');
    st.id = 'flash-sale-styles';
    st.textContent = ''
        + '@keyframes flashPulse {'
        + '0%,100%{box-shadow:0 4px 20px rgba(217,59,59,0.35);}'
        + '50%{box-shadow:0 4px 28px rgba(217,59,59,0.6);}'
        + '}';
    document.head.appendChild(st);
};

FlashSale.injectStyles();
