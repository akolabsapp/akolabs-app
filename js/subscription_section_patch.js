// ============================================================
// AKOLABS — Patch Abonnement pour SectionDetail v2
// Gère : free_trial, monthly, quarterly (nouveaux utilisateurs)
//        + legacy : lifetime, starter, pro, premium
// NE TOUCHE PAS aux anciens utilisateurs (plans legacy)
// ============================================================

(function() {
    function patchSectionDetail() {
        if (typeof SectionDetail === 'undefined') {
            setTimeout(patchSectionDetail, 100);
            return;
        }

        var _originalInit = SectionDetail.init;

        SectionDetail.init = async function(params) {
            var profile = App.profile;
            if (!profile) return _originalInit.call(this, params);

            var plan = profile.subscription_plan || 'lifetime';

            // ── Anciens membres (plans legacy) : accès complet, aucune restriction ──
            var legacyPlans = ['lifetime', 'starter', 'pro', 'premium'];
            var isLegacy = legacyPlans.indexOf(plan) !== -1;
            // Anciens plans expirés : ils voient l'upsell legacy
            var isLegacyExpired = plan.indexOf('expired_') === 0;

            // ── Nouveaux plans ──
            var isFreeTrial     = plan === 'free_trial';
            var isMonthly       = plan === 'monthly';
            var isQuarterly     = plan === 'quarterly';
            var isNewExpired    = plan === 'expired_monthly' || plan === 'expired_quarterly';

            // Abonnement payant actif → accès complet
            if (isMonthly || isQuarterly) {
                return _originalInit.call(this, params);
            }

            // Legacy → règles héritées
            if (isLegacy) {
                // Starter : sections exclues bloquées
                if (plan === 'starter') {
                    var STARTER_EXCLUDED = ['akolabs app prime', 'akolabs ia 2', 'akolabs ebook', 'akolabs learning'];
                    try {
                        var secR = await db.from('sections').select('id, title, is_free').eq('id', params.id).single();
                        if (secR.data) {
                            var titleLow = (secR.data.title || '').toLowerCase();
                            var blocked = STARTER_EXCLUDED.some(function(e) { return titleLow.indexOf(e) !== -1; });
                            if (blocked && !secR.data.is_free) {
                                SectionDetail._showSubscriptionUpsell(secR.data.title, 'legacy_starter');
                                return;
                            }
                        }
                    } catch(e) {}
                }
                return _originalInit.call(this, params);
            }

            // Legacy expiré → upsell renouvellement legacy
            if (isLegacyExpired) {
                try {
                    var secR2 = await db.from('sections').select('id, title, is_free').eq('id', params.id).single();
                    if (secR2.data && !secR2.data.is_free) {
                        SectionDetail._showSubscriptionUpsell(secR2.data.title, plan);
                        return;
                    }
                } catch(e) {}
                return _originalInit.call(this, params);
            }

            // ── Essai gratuit ──
            if (isFreeTrial) {
                var trialExpired = profile._trial_expired;
                try {
                    var secR3 = await db.from('sections').select('id, title, is_free').eq('id', params.id).single();
                    if (secR3.data) {
                        if (trialExpired) {
                            // Essai expiré → forcer abonnement
                            SectionDetail._showSubscriptionUpsell(secR3.data.title, 'trial_expired');
                            return;
                        }
                        if (!secR3.data.is_free) {
                            // Section payante → propose l'abonnement
                            SectionDetail._showSubscriptionUpsell(secR3.data.title, 'free_trial');
                            return;
                        }
                    }
                } catch(e) {}
                return _originalInit.call(this, params);
            }

            // ── Nouvel abonnement expiré ──
            if (isNewExpired) {
                try {
                    var secR4 = await db.from('sections').select('id, title, is_free').eq('id', params.id).single();
                    if (secR4.data && !secR4.data.is_free) {
                        SectionDetail._showSubscriptionUpsell(secR4.data.title, plan);
                        return;
                    }
                } catch(e) {}
                return _originalInit.call(this, params);
            }

            return _originalInit.call(this, params);
        };

        // ── Affichage de l'upsell d'abonnement ──
        SectionDetail._showSubscriptionUpsell = function(sectionTitle, reason) {
            var container = document.getElementById('main-content');
            if (!container) return;

            var isNewExpiredReason  = reason === 'expired_monthly' || reason === 'expired_quarterly';
            var isTrialExpired      = reason === 'trial_expired';
            var isFreeTrial         = reason === 'free_trial';
            var isLegacyExpired     = reason && reason.indexOf('expired_') === 0 && !isNewExpiredReason;
            var isLegacyStarter     = reason === 'legacy_starter';

            var title, message, btnLabel;

            if (isTrialExpired) {
                title    = 'Essai gratuit expiré';
                message  = 'Votre essai de 30 jours est terminé. Abonnez-vous pour continuer à accéder à AKOLABS.';
                btnLabel = 'S\'abonner maintenant';
            } else if (isFreeTrial) {
                title    = '🔒 Section réservée aux abonnés';
                message  = '<strong>' + (sectionTitle || 'Cette section') + '</strong> n\'est pas disponible dans l\'essai gratuit. Abonnez-vous pour accéder à tout le catalogue.';
                btnLabel = 'Voir les plans — dès 3 500 F / mois';
            } else if (isNewExpiredReason) {
                var expPlanLabel = reason === 'expired_monthly' ? 'Mensuel' : 'Trimestriel';
                title    = 'Abonnement expiré';
                message  = 'Votre plan <strong>' + expPlanLabel + '</strong> a expiré. Renouvelez pour retrouver l\'accès à <strong>' + (sectionTitle || 'cette section') + '</strong>.';
                btnLabel = 'Renouveler mon abonnement';
            } else if (isLegacyStarter) {
                title    = 'Section réservée au plan Pro';
                message  = '<strong>' + (sectionTitle || 'Cette section') + '</strong> n\'est pas incluse dans ton plan Starter. Passe au plan Pro pour débloquer l\'accès complet.';
                btnLabel = 'Passer au plan Pro';
            } else {
                title    = 'Abonnement expiré';
                message  = 'Votre abonnement a expiré. Renouvelez pour continuer à accéder à <strong>' + (sectionTitle || 'cette section') + '</strong>.';
                btnLabel = 'Renouveler l\'abonnement';
            }

            var useInAppModal = (isFreeTrial || isTrialExpired || isNewExpiredReason);
            var landingUrl    = (CONFIG.LANDING_URL || '/app-store/');

            var h = '';
            h += '<div style="min-height:80vh;display:flex;align-items:center;justify-content:center;padding:30px 20px;">';
            h += '<div style="text-align:center;max-width:340px;">';

            h += '<div style="font-size:56px;margin-bottom:16px;">' + (isTrialExpired ? '⏰' : '🔒') + '</div>';

            h += '<div style="font-family:Cinzel,serif;font-size:18px;font-weight:700;color:var(--color-accent,#D4AF37);margin-bottom:10px;">';
            h += title;
            h += '</div>';

            h += '<div style="font-size:13px;color:var(--color-text-secondary,#AEAEBE);line-height:1.7;margin-bottom:24px;">';
            h += message;
            h += '</div>';

            // Bouton principal
            if (useInAppModal) {
                h += '<button onclick="SubscriptionModal.show(\'' + (sectionTitle || '').replace(/'/g, "\\'") + '\')" ';
                h += 'style="width:100%;padding:14px;background:linear-gradient(135deg,#D4AF37,#C9A84C);color:#1A0A00;border:none;border-radius:50px;font-weight:700;font-size:14px;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:12px;">';
                h += '<i class="fas fa-' + (isTrialExpired || isNewExpiredReason ? 'redo' : 'crown') + '"></i>';
                h += btnLabel;
                h += '</button>';
            } else {
                h += '<button onclick="window.open(\'' + landingUrl + '\', \'_blank\')" ';
                h += 'style="width:100%;padding:14px;background:linear-gradient(135deg,#D4AF37,#C9A84C);color:#1A0A00;border:none;border-radius:50px;font-weight:700;font-size:14px;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:12px;">';
                h += '<i class="fas fa-arrow-up"></i>';
                h += btnLabel;
                h += '</button>';
            }

            // Bouton retour
            h += '<button onclick="Router.navigate(\'/home\')" ';
            h += 'style="width:100%;padding:11px;background:transparent;color:var(--color-text-muted,#8E8E9E);border:1px solid rgba(255,255,255,0.1);border-radius:50px;font-size:13px;cursor:pointer;font-family:inherit;">';
            h += '<i class="fas fa-arrow-left" style="margin-right:6px;"></i>Retour à l\'accueil';
            h += '</button>';

            h += '</div>';
            h += '</div>';

            container.innerHTML = h;
        };

        console.log('[SubPatch v2] SectionDetail patché avec gestion abonnements');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', patchSectionDetail);
    } else {
        patchSectionDetail();
    }
})();
