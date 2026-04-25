// ============================================
// PARTNER — Patch SectionDetail
// Charge les sections depuis dbContent (AKOLABS principal)
// À charger APRÈS section-detail.js
// ============================================

(function() {
    function patchSectionDetail() {
        if (typeof SectionDetail === 'undefined') {
            setTimeout(patchSectionDetail, 100);
            return;
        }

        var _originalInit = SectionDetail.init;
        var _originalRender = SectionDetail.render;

        // Patch render() pour charger la section depuis dbContent
        SectionDetail.render = async function(params) {
            // Intercepter la requête Supabase en remplaçant db par dbContent pour sections
            var origDb = window.db;
            // On crée un proxy temporaire qui redirige 'sections' vers dbContent
            window._partnerDbProxy = {
                from: function(table) {
                    if (['sections','app_screenshots','flash_sales'].indexOf(table) !== -1) {
                        return dbContent.from(table);
                    }
                    return origDb.from(table);
                }
            };
            // SectionDetail utilise 'db' globalement — on le remplace temporairement
            // puis on le restaure après le render
            var result = await _originalRender.call(this, params);
            return result;
        };

        // Patch init() pour contrôle abonnement + dbContent
        SectionDetail.init = async function(params) {
            var profile = App.profile;
            if (!profile) return _originalInit.call(this, params);

            var plan = profile.subscription_plan || 'lifetime';
            var isExpired = plan && plan.indexOf('expired_') === 0;
            var STARTER_EXCLUDED = ['akolabs app prime', 'akolabs ia 2', 'akolabs ebook', 'akolabs learning'];

            if (isExpired || plan === 'starter') {
                try {
                    // Charger depuis dbContent (AKOLABS principal)
                    var secResult = await dbContent.from('sections')
                        .select('id, title, is_free')
                        .eq('id', params.id)
                        .single();

                    if (secResult.data) {
                        var sec = secResult.data;
                        var titleLower = (sec.title || '').toLowerCase();
                        var isBlocked = !sec.is_free && STARTER_EXCLUDED.some(function(excl) {
                            return titleLower.indexOf(excl) !== -1;
                        });

                        if (isBlocked) {
                            SectionDetail._showSubscriptionUpsell(sec.title, plan);
                            return;
                        }
                    }
                } catch(e) {
                    console.warn('[PartnerPatch] Vérif section:', e);
                }
            }

            return _originalInit.call(this, params);
        };

        // Upsell pour le partenaire
        SectionDetail._showSubscriptionUpsell = function(sectionTitle, plan) {
            var container = document.getElementById('main-content');
            if (!container) return;
            var isExpired = plan && plan.indexOf('expired_') === 0;
            var landingUrl = CONFIG.LANDING_URL || '/app-store/';
            container.innerHTML = '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:30px 20px;">'
                + '<div style="text-align:center;max-width:340px;">'
                + '<div style="font-size:56px;margin-bottom:16px;">🔒</div>'
                + '<div style="font-family:Cinzel,serif;font-size:20px;font-weight:700;color:var(--color-accent,#D4AF37);margin-bottom:10px;">'
                + (isExpired ? 'Abonnement expiré' : 'Section réservée au plan Pro') + '</div>'
                + '<div style="font-size:13px;color:var(--color-text-secondary,#AEAEBE);line-height:1.7;margin-bottom:24px;">'
                + (isExpired ? 'Renouvelle ton abonnement pour accéder à <strong>' + (sectionTitle||'cette section') + '</strong>.'
                             : '<strong>' + (sectionTitle||'Cette section') + '</strong> n\'est pas incluse dans ton plan Starter.') + '</div>'
                + '<button onclick="window.open(\'' + landingUrl + '?plan=pro\', \'_blank\')" '
                + 'style="width:100%;padding:14px;background:linear-gradient(135deg,#D4AF37,#C9A84C);color:#1A0A00;border:none;border-radius:50px;font-weight:700;font-size:14px;cursor:pointer;margin-bottom:12px;">'
                + '<i class="fas fa-' + (isExpired ? 'redo' : 'arrow-up') + '"></i> '
                + (isExpired ? 'Renouveler' : 'Passer au Pro — 1 500 F') + '</button>'
                + '<button onclick="Router.navigate(\'/home\')" '
                + 'style="width:100%;padding:11px;background:transparent;color:var(--color-text-muted,#8E8E9E);border:1px solid rgba(255,255,255,0.1);border-radius:50px;font-size:13px;cursor:pointer;">'
                + '← Retour</button>'
                + '</div></div>';
        };

        console.log('[PartnerPatch] SectionDetail patché avec dbContent');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', patchSectionDetail);
    } else {
        patchSectionDetail();
    }
})();
