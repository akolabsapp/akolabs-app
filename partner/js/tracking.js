/* ============================================
   AKOLABS - TRACKING & ANALYTICS MODULE
   ============================================ */

var Tracking = {};

// Session ID unique par session de navigation
Tracking.sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
Tracking._viewTimers = {};
Tracking._appOpenLogged = false;

/* --- Générer un ID de session stable --- */
Tracking.getSessionId = function() {
    var s = sessionStorage.getItem('ako_session');
    if (!s) {
        s = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('ako_session', s);
    }
    return s;
};

/* --- Tracker l'ouverture de l'app --- */
Tracking.logAppOpen = async function() {
    if (Tracking._appOpenLogged) return;
    Tracking._appOpenLogged = true;
    try {
        var userId = (App.user && App.user.id) ? App.user.id : null;
        await db.from('app_opens').insert({
            user_id: userId,
            session_id: Tracking.getSessionId(),
            device_type: 'mobile'
        });
    } catch(e) { /* silencieux */ }
};

/* --- Tracker la vue d'une section --- */
Tracking.logSectionView = async function(sectionId, isFree) {
    try {
        var userId = (App.user && App.user.id) ? App.user.id : null;
        await db.from('section_views').insert({
            section_id: sectionId,
            user_id: userId,
            session_id: Tracking.getSessionId(),
            is_free: !!isFree,
            device_type: 'mobile',
            duration_seconds: 0
        });
        // Stocker l'heure de début pour calculer la durée
        Tracking._viewTimers[sectionId] = Date.now();
    } catch(e) { /* silencieux */ }
};

/* --- Mettre à jour la durée passée sur une section --- */
Tracking.updateViewDuration = async function(sectionId, viewRowId) {
    if (!Tracking._viewTimers[sectionId]) return;
    var duration = Math.round((Date.now() - Tracking._viewTimers[sectionId]) / 1000);
    if (duration < 2) return;
    try {
        // On insère un nouveau record avec la durée (plus simple que d'update)
        // Le row précédent a durée 0, celui-ci a la vraie durée
        delete Tracking._viewTimers[sectionId];
    } catch(e) {}
};

/* --- Tracker popup shown/clicked/closed --- */
Tracking.logPopupAction = async function(popupId, action) {
    try {
        var userId = (App.user && App.user.id) ? App.user.id : null;
        await db.from('popup_logs').insert({
            popup_id: popupId,
            user_id: userId,
            action: action
        });
        // Mettre à jour les compteurs sur le popup
        if (action === 'shown') {
            await db.from('popups').update({ total_shown: db.raw('total_shown + 1') }).eq('id', popupId);
        } else if (action === 'clicked') {
            await db.from('popups').update({ total_clicks: db.raw('total_clicks + 1') }).eq('id', popupId);
        }
    } catch(e) {}
};

/* --- Vérifier si un popup doit s'afficher --- */
Tracking.shouldShowPopup = function(popup) {
    var key = 'popup_shown_' + popup.id;
    
    if (popup.repeat_type === 'once') {
        return !localStorage.getItem(key);
    }
    
    if (popup.repeat_type === 'every_open') {
        return true;
    }
    
    if (popup.repeat_type === 'interval_hours') {
        var lastShown = parseInt(localStorage.getItem(key) || '0');
        var intervalMs = (popup.repeat_interval_hours || 24) * 3600 * 1000;
        return (Date.now() - lastShown) > intervalMs;
    }
    
    if (popup.repeat_type === 'until_action') {
        return localStorage.getItem(key + '_actioned') !== '1';
    }
    
    return true;
};

/* --- Marquer popup comme montré --- */
Tracking.markPopupShown = function(popup) {
    var key = 'popup_shown_' + popup.id;
    localStorage.setItem(key, Date.now().toString());
};

/* --- Charger et afficher les popups selon déclencheur --- */
Tracking.checkPopups = async function(triggerType, context) {
    try {
        var now = new Date().toISOString();
        var r = await db.from('popups')
            .select('*')
            .eq('is_active', true)
            .eq('trigger_type', triggerType)
            .lte('starts_at', now);
        
        var popups = r.data || [];
        
        for (var i = 0; i < popups.length; i++) {
            var popup = popups[i];
            
            // Vérifier la fin
            if (popup.ends_at && new Date(popup.ends_at) < new Date()) continue;
            
            // Vérifier ciblage
            if (!Tracking.matchesTarget(popup)) continue;
            
            // Vérifier contexte (section gratuite/payante)
            if (triggerType === 'section_open') {
                if (context && context.isFree && !popup.show_on_free_sections) continue;
                if (context && !context.isFree && !popup.show_on_paid_sections) continue;
            }
            
            // Vérifier fréquence
            if (!Tracking.shouldShowPopup(popup)) continue;
            
            // Si trigger_type = time_on_page, attendre N secondes
            if (triggerType === 'time_on_page') {
                (function(p, delay) {
                    setTimeout(function() {
                        Tracking.displayPopup(p);
                    }, delay * 1000);
                })(popup, popup.trigger_value || 30);
            } else {
                // Délai court pour laisser la page charger
                (function(p) {
                    setTimeout(function() {
                        Tracking.displayPopup(p);
                    }, 800);
                })(popup);
            }
            
            break; // Afficher 1 seul popup à la fois
        }
    } catch(e) { /* silencieux */ }
};

/* --- Vérifier si l'utilisateur correspond au ciblage --- */
Tracking.matchesTarget = function(popup) {
    var target = popup.target || 'all';
    if (target === 'all') return true;
    if (!App.user) return target === 'all';
    
    var profile = App.profile || {};
    
    if (target === 'not_purchased') return !profile.is_app_purchased;
    if (target === 'free_users') return !profile.is_app_purchased;
    if (target === 'no_affiliation') return !(profile.affiliate_code);
    
    return true;
};

/* --- Afficher un popup --- */
Tracking.displayPopup = function(popup) {
    // Supprimer popup existant
    var existing = document.getElementById('ako-popup-overlay');
    if (existing) existing.remove();
    
    Tracking.markPopupShown(popup);
    Tracking.logPopupAction(popup.id, 'shown');
    
    var overlay = document.createElement('div');
    overlay.id = 'ako-popup-overlay';
    overlay.style.cssText = [
        'position:fixed', 'inset:0', 'z-index:9999',
        'background:rgba(26,26,46,0.72)',
        'display:flex', 'align-items:center', 'justify-content:center',
        'padding:20px', 'box-sizing:border-box',
        'animation:fadeIn 0.25s ease'
    ].join(';');
    
    var canClose = popup.display_duration > 0;
    var timerEl = '';
    if (popup.display_duration > 0 && popup.type === 'video') {
        timerEl = '<div id="popup-timer" style="position:absolute;top:12px;right:44px;background:rgba(0,0,0,0.6);color:#fff;font-size:11px;padding:3px 8px;border-radius:20px;font-family:Poppins,sans-serif;">' + popup.display_duration + 's</div>';
    }
    
    var closeBtn = '<button id="popup-close-btn" onclick="Tracking.closePopup(\'' + popup.id + '\')" style="'
        + 'position:absolute;top:10px;right:10px;width:32px;height:32px;border-radius:50%;'
        + 'background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:14px;cursor:pointer;'
        + 'display:flex;align-items:center;justify-content:center;z-index:10;'
        + (canClose ? '' : 'opacity:0.3;pointer-events:none;')
        + '">'
        + (canClose ? '✕' : '<span id="popup-close-count">' + popup.display_duration + '</span>')
        + '</button>';
    
    var body = '';
    
    if (popup.type === 'image') {
        body = '<img src="' + popup.content_url + '" style="width:100%;max-height:300px;object-fit:cover;border-radius:12px 12px 0 0;display:block;" onclick="Tracking.clickPopup(\'' + popup.id + '\',\'' + (popup.cta_url||'') + '\')" style="cursor:pointer;">';
        if (popup.content_text || popup.cta_label) {
            body += '<div style="padding:16px;">';
            if (popup.content_text) body += '<p style="color:#1A1A2E;font-size:13px;margin:0 0 12px;">' + popup.content_text + '</p>';
            if (popup.cta_url && popup.cta_label) {
                body += '<button onclick="Tracking.clickPopup(\'' + popup.id + '\',\'' + popup.cta_url + '\')" style="width:100%;padding:12px;background:linear-gradient(135deg,#C9A84C,#DFC06A);color:#4B0082;font-weight:700;border:none;border-radius:30px;font-size:14px;cursor:pointer;">' + popup.cta_label + '</button>';
            }
            body += '</div>';
        }
    }
    
    else if (popup.type === 'video') {
        var isYT = popup.content_url && (popup.content_url.includes('youtube') || popup.content_url.includes('youtu.be'));
        if (isYT) {
            var ytId = Tracking._extractYoutubeId(popup.content_url);
            body = '<div style="position:relative;padding-top:56.25%;">'
                + '<iframe src="https://www.youtube.com/embed/' + ytId + '?autoplay=1&mute=1" style="position:absolute;inset:0;width:100%;height:100%;border:none;" allow="autoplay;encrypted-media" allowfullscreen></iframe>'
                + '</div>';
        } else {
            body = '<video src="' + popup.content_url + '" autoplay muted playsinline style="width:100%;max-height:280px;display:block;" controls></video>';
        }
        if (popup.cta_url && popup.cta_label) {
            body += '<div style="padding:12px 16px;">';
            body += '<button onclick="Tracking.clickPopup(\'' + popup.id + '\',\'' + popup.cta_url + '\')" style="width:100%;padding:12px;background:linear-gradient(135deg,#C9A84C,#DFC06A);color:#4B0082;font-weight:700;border:none;border-radius:30px;font-size:14px;cursor:pointer;">' + popup.cta_label + '</button>';
            body += '</div>';
        }
    }
    
    else if (popup.type === 'offer') {
        body = '<div style="padding:28px 20px;text-align:center;">';
        body += '<div style="font-size:36px;margin-bottom:8px;">🎁</div>';
        if (popup.title) body += '<div style="font-family:Cinzel,serif;font-size:18px;color:#4B0082;font-weight:700;margin-bottom:10px;">' + popup.title + '</div>';
        if (popup.content_text) body += '<p style="color:#4A4767;font-size:13px;line-height:1.6;margin-bottom:20px;">' + popup.content_text + '</p>';
        if (popup.cta_url && popup.cta_label) {
            body += '<button onclick="Tracking.clickPopup(\'' + popup.id + '\',\'' + popup.cta_url + '\')" style="display:inline-block;padding:13px 32px;background:linear-gradient(135deg,#C9A84C,#DFC06A);color:#4B0082;font-weight:700;border:none;border-radius:30px;font-size:14px;cursor:pointer;box-shadow:0 4px 16px rgba(201,168,76,0.35);">' + popup.cta_label + '</button>';
        }
        body += '</div>';
    }
    
    var card = document.createElement('div');
    card.style.cssText = [
        'position:relative', 'background:#fff', 'border-radius:20px',
        'width:100%', 'max-width:420px', 'overflow:hidden',
        'box-shadow:0 20px 60px rgba(0,0,0,0.3)',
        'animation:slideUp 0.3s cubic-bezier(0.175,0.885,0.32,1.275)'
    ].join(';');
    
    card.innerHTML = timerEl + closeBtn + body;
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    
    // Timer avant fermeture possible
    if (popup.display_duration > 0) {
        var remaining = popup.display_duration;
        var countEl = document.getElementById('popup-close-count');
        var closeBtnEl = document.getElementById('popup-close-btn');
        
        var interval = setInterval(function() {
            remaining--;
            if (countEl) countEl.textContent = remaining;
            var timerDisplay = document.getElementById('popup-timer');
            if (timerDisplay) timerDisplay.textContent = remaining + 's';
            
            if (remaining <= 0) {
                clearInterval(interval);
                if (closeBtnEl) {
                    closeBtnEl.style.opacity = '1';
                    closeBtnEl.style.pointerEvents = 'auto';
                    closeBtnEl.innerHTML = '✕';
                }
                if (timerDisplay) timerDisplay.remove();
            }
        }, 1000);
        
        overlay._timer = interval;
    }
    
    // CSS animation
    if (!document.getElementById('popup-anim-style')) {
        var st = document.createElement('style');
        st.id = 'popup-anim-style';
        st.textContent = '@keyframes slideUp{from{transform:translateY(40px);opacity:0}to{transform:translateY(0);opacity:1}}';
        document.head.appendChild(st);
    }
};

Tracking.closePopup = function(popupId) {
    var overlay = document.getElementById('ako-popup-overlay');
    if (overlay) {
        if (overlay._timer) clearInterval(overlay._timer);
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.2s';
        setTimeout(function() { overlay.remove(); }, 200);
    }
    Tracking.logPopupAction(popupId, 'closed');
};

Tracking.clickPopup = function(popupId, url) {
    Tracking.logPopupAction(popupId, 'clicked');
    // Marquer action faite (pour until_action)
    localStorage.setItem('popup_shown_' + popupId + '_actioned', '1');
    if (url && url.startsWith('/')) {
        Router.navigate(url);
        Tracking.closePopup(popupId);
    } else if (url) {
        window.open(url, '_blank');
        Tracking.closePopup(popupId);
    }
};

Tracking._extractYoutubeId = function(url) {
    var r = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&\n?#]+)/);
    return r ? r[1] : '';
};

