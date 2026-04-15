// ============================================
// AKOLABS — Patch Abonnement pour SectionDetail
// À charger APRÈS section-detail.js dans index.html
// ============================================

(function() {
    function patchSectionDetail() {
        if (typeof SectionDetail === 'undefined') {
            setTimeout(patchSectionDetail, 100);
            return;
        }

        var _originalInit = SectionDetail.init;

        SectionDetail.init = async function(params) {
            // Vérifier l'abonnement avant d'initialiser
            var profile = App.profile;
            if (!profile) return _originalInit.call(this, params);

            var plan = profile.subscription_plan || 'lifetime';
            var isExpired = plan && plan.indexOf('expired_') === 0;

            // Sections exclues du plan Starter
            var STARTER_EXCLUDED = ['akolabs app prime', 'akolabs ia 2', 'akolabs ebook', 'akolabs learning'];

            // Si le plan est expiré ou Starter, vérifier si cette section est accessible
            if (isExpired || plan === 'starter') {
                try {
                    // Charger les infos de la section
                    var secResult = await db.from('sections').select('id, title, is_free').eq('id', params.id).single();
                    if (secResult.data) {
                        var sec = secResult.data;
                        var titleLower = (sec.title || '').toLowerCase();
                        var isBlocked = false;

                        for (var i = 0; i < STARTER_EXCLUDED.length; i++) {
                            if (titleLower.indexOf(STARTER_EXCLUDED[i]) !== -1) {
                                isBlocked = true;
                                break;
                            }
                        }

                        if (isBlocked && !sec.is_free) {
                            // Afficher l'upsell au lieu du contenu
                            SectionDetail._showSubscriptionUpsell(sec.title, plan);
                            return;
                        }
                    }
                } catch(e) {
                    console.warn('[SubPatch] Vérification section:', e);
                }
            }

            return _originalInit.call(this, params);
        };

        // Fonction d'affichage de l'upsell
        SectionDetail._showSubscriptionUpsell = function(sectionTitle, plan) {
            var container = document.getElementById('main-content');
            if (!container) return;

            var isExpired = plan && plan.indexOf('expired_') === 0;
            var landingUrl = (CONFIG.LANDING_URL || '/app-store/');

            var h = '';
            h += '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:30px 20px;">';
            h += '<div style="text-align:center;max-width:340px;">';

            h += '<div style="font-size:56px;margin-bottom:16px;">🔒</div>';

            h += '<div style="font-family:Cinzel,serif;font-size:20px;font-weight:700;color:var(--color-accent,#D4AF37);margin-bottom:10px;">';
            h += isExpired ? 'Abonnement expiré' : 'Section réservée au plan Pro';
            h += '</div>';

            h += '<div style="font-size:13px;color:var(--color-text-secondary,#AEAEBE);line-height:1.7;margin-bottom:24px;">';
            if (isExpired) {
                var expPlan = plan.replace('expired_', '');
                h += 'Ton plan <strong style="color:var(--color-accent,#D4AF37);">' + expPlan.charAt(0).toUpperCase() + expPlan.slice(1) + '</strong> a expiré. ';
                h += 'Renouvelle pour récupérer l\'accès à <strong>' + (sectionTitle || 'cette section') + '</strong> et tout le reste.';
            } else {
                h += '<strong>' + (sectionTitle || 'Cette section') + '</strong> n\'est pas incluse dans ton plan Starter. ';
                h += 'Passe au plan <strong style="color:var(--color-accent,#D4AF37);">Pro</strong> pour débloquer l\'accès complet.';
            }
            h += '</div>';

            // Bouton principal
            h += '<button onclick="window.open(\'' + landingUrl + '?plan=pro\', \'_blank\')" ';
            h += 'style="width:100%;padding:14px;background:linear-gradient(135deg,#D4AF37,#C9A84C);color:#1A0A00;border:none;border-radius:50px;font-weight:700;font-size:14px;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:12px;">';
            h += '<i class="fas fa-' + (isExpired ? 'redo' : 'arrow-up') + '"></i>';
            h += isExpired ? 'Renouveler mon abonnement' : 'Passer au plan Pro — 1 500 F';
            h += '</button>';

            // Bouton retour
            h += '<button onclick="Router.navigate(\'/home\')" ';
            h += 'style="width:100%;padding:11px;background:transparent;color:var(--color-text-muted,#8E8E9E);border:1px solid rgba(255,255,255,0.1);border-radius:50px;font-size:13px;cursor:pointer;font-family:inherit;">';
            h += '<i class="fas fa-arrow-left" style="margin-right:6px;"></i>Retour à l\'accueil';
            h += '</button>';

            h += '</div>';
            h += '</div>';

            container.innerHTML = h;
        };

        console.log('[SubPatch] SectionDetail patché avec contrôle abonnement');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', patchSectionDetail);
    } else {
        patchSectionDetail();
    }
})();
