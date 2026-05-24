// ============================================================
// AKOLABS — Modal d'abonnement in-app
// Plans : Mensuel (3 500 F) | Trimestriel (7 500 F)
// Routage : FeexPay (BJ/CI/TG/SN) | GeniusPay (autres pays)
// ============================================================

var SubscriptionModal = {
    _sectionTitle: null,
    _selectedPlan: null,
    _feexPayInstance: null,

    // ---- Afficher le modal ----
    show: function(sectionTitle) {
        SubscriptionModal._sectionTitle = sectionTitle || null;

        var existing = document.getElementById('ako-sub-modal');
        if (existing) existing.remove();

        // Construire le sélecteur de pays
        var countryOptions = '<option value="">-- Choisir votre pays --</option>';
        var codes = CONFIG.COUNTRY_DIAL_CODES || {};
        Object.keys(codes).forEach(function(code) {
            var c = codes[code];
            // Pré-sélectionner le pays du profil si dispo
            var selected = (App.profile && App.profile.country === code) ? ' selected' : '';
            countryOptions += '<option value="' + code + '" data-dial="' + c.dial + '"' + selected + '>' + c.flag + ' ' + c.name + '</option>';
        });

        var plan = App.profile ? (App.profile.subscription_plan || '') : '';
        var isExpired = plan && plan.indexOf('expired_') === 0;
        var isTrial   = plan === 'free_trial';
        var trialDays = (App.profile && App.profile._trial_days_left) || 0;

        var titleText = isExpired ? '⚠️ Abonnement expiré — Renouveler'
                      : isTrial   ? '🎁 Passer à l\'accès complet'
                      :             '⚡ S\'abonner à AKOLABS';

        var subtitleText = sectionTitle
            ? '« ' + sectionTitle + ' » nécessite un abonnement payant.'
            : 'Débloquez tout le catalogue AKOLABS.';

        if (isTrial && trialDays > 0 && !App.profile._trial_expired) {
            subtitleText = 'Votre essai gratuit expire dans ' + trialDays + ' jour' + (trialDays > 1 ? 's' : '') + '.';
        }

        var modal = document.createElement('div');
        modal.id = 'ako-sub-modal';
        modal.style.cssText = [
            'position:fixed;inset:0;z-index:9999;',
            'background:rgba(0,0,0,0.75);',
            'display:flex;align-items:flex-end;justify-content:center;',
            'padding-bottom:env(safe-area-inset-bottom,0);'
        ].join('');

        modal.innerHTML = [
            '<div id="ako-sub-box" style="',
                'background:#1A1A2E;',
                'border-radius:24px 24px 0 0;',
                'width:100%;max-width:480px;',
                'max-height:88vh;overflow-y:auto;',
                'padding:28px 20px 32px;',
                'box-shadow:0 -8px 40px rgba(0,0,0,0.5);',
            '">',

                // Header
                '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:4px;">',
                    '<div style="font-family:Cinzel,serif;font-size:16px;font-weight:700;color:#D4AF37;flex:1;">' + titleText + '</div>',
                    '<button onclick="SubscriptionModal.close()" style="background:none;border:none;color:#8E8E9E;font-size:20px;cursor:pointer;padding:0 0 0 12px;"><i class="fas fa-times"></i></button>',
                '</div>',
                '<div style="font-size:12px;color:#AEAEBE;margin-bottom:20px;line-height:1.5;">' + subtitleText + '</div>',

                // Plans
                '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px;" id="ako-sub-plans">',

                    // Plan Mensuel
                    '<div class="ako-sub-plan" id="plan-monthly" onclick="SubscriptionModal.selectPlan(\'monthly\')" style="',
                        'border:2px solid rgba(212,175,55,0.3);border-radius:16px;padding:14px;text-align:center;cursor:pointer;',
                        'background:rgba(212,175,55,0.06);transition:all .2s;',
                    '">',
                        '<div style="font-size:11px;color:#AEAEBE;margin-bottom:4px;">Mensuel</div>',
                        '<div style="font-size:22px;font-weight:800;color:#D4AF37;font-family:Cinzel,serif;">3 500 F</div>',
                        '<div style="font-size:11px;color:#AEAEBE;margin-top:2px;">/ mois</div>',
                        '<div style="font-size:10px;color:#8E8E9E;margin-top:6px;line-height:1.4;">Accès complet<br>30 jours</div>',
                    '</div>',

                    // Plan Trimestriel
                    '<div class="ako-sub-plan" id="plan-quarterly" onclick="SubscriptionModal.selectPlan(\'quarterly\')" style="',
                        'border:2px solid rgba(61,219,125,0.4);border-radius:16px;padding:14px;text-align:center;cursor:pointer;',
                        'background:rgba(61,219,125,0.06);transition:all .2s;position:relative;',
                    '">',
                        '<div style="position:absolute;top:-10px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#3DDB7D,#2BAF65);color:#fff;font-size:10px;font-weight:700;padding:2px 10px;border-radius:20px;white-space:nowrap;">💎 Meilleure offre</div>',
                        '<div style="font-size:11px;color:#AEAEBE;margin-bottom:4px;">Trimestriel</div>',
                        '<div style="font-size:22px;font-weight:800;color:#3DDB7D;font-family:Cinzel,serif;">7 500 F</div>',
                        '<div style="font-size:11px;color:#3DDB7D;margin-top:2px;">/ 3 mois</div>',
                        '<div style="font-size:10px;color:#8E8E9E;margin-top:6px;line-height:1.4;">Économie de<br><strong style="color:#3DDB7D;">3 000 F</strong> vs mensuel</div>',
                    '</div>',

                '</div>',

                // Formulaire (caché au départ)
                '<div id="ako-sub-form" style="display:none;">',

                    '<div style="font-size:12px;font-weight:600;color:#D4AF37;margin-bottom:12px;"><i class="fas fa-credit-card" style="margin-right:6px;"></i>Informations de paiement</div>',

                    // Pays
                    '<div style="margin-bottom:10px;">',
                        '<label style="font-size:11px;color:#AEAEBE;display:block;margin-bottom:4px;">Pays *</label>',
                        '<select id="ako-sub-country" onchange="SubscriptionModal.onCountryChange(this)" style="',
                            'width:100%;padding:10px 12px;background:#0D0D1A;border:1px solid rgba(255,255,255,0.12);',
                            'border-radius:10px;color:#F8F9FA;font-size:13px;appearance:none;',
                        '">',
                            countryOptions,
                        '</select>',
                    '</div>',

                    // WhatsApp
                    '<div style="margin-bottom:10px;">',
                        '<label style="font-size:11px;color:#AEAEBE;display:block;margin-bottom:4px;">Numéro WhatsApp *</label>',
                        '<div style="display:flex;gap:8px;">',
                            '<input type="text" id="ako-sub-dial" value="+229" readonly style="',
                                'width:75px;flex-shrink:0;padding:10px 8px;background:#0D0D1A;',
                                'border:1px solid rgba(255,255,255,0.12);border-radius:10px;',
                                'color:#F8F9FA;font-size:13px;text-align:center;',
                            '">',
                            '<input type="tel" id="ako-sub-whatsapp" placeholder="XX XX XX XX" style="',
                                'flex:1;padding:10px 12px;background:#0D0D1A;',
                                'border:1px solid rgba(255,255,255,0.12);border-radius:10px;',
                                'color:#F8F9FA;font-size:13px;',
                            '">',
                        '</div>',
                    '</div>',

                    // Zone FeexPay / GeniusPay
                    '<div id="ako-sub-feexpay-zone" style="display:none;margin:12px 0;">',
                        '<div id="ako-feexpay-render"></div>',
                        '<p style="font-size:11px;color:#9B97B5;text-align:center;margin-top:8px;">Vous serez redirigé vers FeexPay pour le paiement</p>',
                        '<button onclick="SubscriptionModal.cancelPayment()" style="width:100%;margin-top:8px;background:none;border:1px solid rgba(255,255,255,0.12);border-radius:20px;padding:7px;font-size:12px;color:#8E8E9E;cursor:pointer;">← Annuler</button>',
                    '</div>',

                    '<button id="ako-sub-pay-btn" onclick="SubscriptionModal.initPayment()" style="',
                        'width:100%;padding:14px;margin-top:6px;',
                        'background:linear-gradient(135deg,#D4AF37,#B8922B);',
                        'color:#1A0A00;border:none;border-radius:50px;',
                        'font-weight:800;font-size:14px;cursor:pointer;',
                        'font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px;',
                    '">',
                        '<i class="fas fa-lock" id="ako-sub-btn-icon"></i>',
                        '<span id="ako-sub-btn-text">Procéder au paiement</span>',
                    '</button>',

                '</div>',

                // Bouton principal (avant sélection de plan)
                '<div id="ako-sub-cta" style="margin-top:4px;">',
                    '<p style="text-align:center;font-size:12px;color:#8E8E9E;margin-bottom:12px;">Sélectionnez un plan ci-dessus pour continuer</p>',
                '</div>',

                // Avantages
                '<div style="margin-top:16px;padding:12px;background:rgba(212,175,55,0.06);border:1px solid rgba(212,175,55,0.15);border-radius:12px;">',
                    '<div style="font-size:11px;color:#D4AF37;font-weight:600;margin-bottom:8px;"><i class="fas fa-check-circle"></i> Accès complet inclus :</div>',
                    '<div style="font-size:11px;color:#AEAEBE;line-height:2;">',
                        '✅ Tout le catalogue AKOLABS &nbsp;&nbsp; ✅ AKOLABS App Prime<br>',
                        '✅ AKOLABS IA 2 &nbsp;&nbsp; ✅ AKOLABS Ebook &nbsp;&nbsp; ✅ Learning complet',
                    '</div>',
                '</div>',

            '</div>'
        ].join('');

        document.body.appendChild(modal);

        // Animation d'entrée
        var box = document.getElementById('ako-sub-box');
        box.style.transform = 'translateY(100%)';
        box.style.transition = 'transform 0.3s cubic-bezier(0.4,0,0.2,1)';
        requestAnimationFrame(function() {
            setTimeout(function() { box.style.transform = 'translateY(0)'; }, 10);
        });

        // Pré-remplir depuis le profil
        if (App.profile) {
            var wa = document.getElementById('ako-sub-whatsapp');
            if (wa && App.profile.whatsapp_number) {
                var waNum = App.profile.whatsapp_number.replace(/^\+\d{1,4}/, '').trim();
                wa.value = waNum;
            }
            if (App.profile.country) {
                var sel = document.getElementById('ako-sub-country');
                if (sel) {
                    sel.value = App.profile.country;
                    SubscriptionModal.onCountryChange(sel);
                }
            }
        }
    },

    // ---- Fermer le modal ----
    close: function() {
        var modal = document.getElementById('ako-sub-modal');
        if (!modal) return;
        var box = document.getElementById('ako-sub-box');
        if (box) {
            box.style.transform = 'translateY(100%)';
            setTimeout(function() { modal.remove(); }, 320);
        } else {
            modal.remove();
        }
    },

    // ---- Sélectionner un plan ----
    selectPlan: function(planId) {
        SubscriptionModal._selectedPlan = planId;

        // Visuel
        ['monthly','quarterly'].forEach(function(p) {
            var el = document.getElementById('plan-' + p);
            if (!el) return;
            if (p === planId) {
                el.style.border = '2px solid #D4AF37';
                el.style.background = 'rgba(212,175,55,0.12)';
                el.style.transform = 'scale(1.02)';
            } else {
                el.style.border = '2px solid rgba(255,255,255,0.1)';
                el.style.background = 'rgba(255,255,255,0.03)';
                el.style.transform = 'scale(1)';
            }
        });

        // Montrer le formulaire
        var form = document.getElementById('ako-sub-form');
        var cta  = document.getElementById('ako-sub-cta');
        if (form) form.style.display = 'block';
        if (cta)  cta.style.display  = 'none';

        // Mettre à jour le bouton
        var plan = CONFIG.PLANS[planId];
        var btn  = document.getElementById('ako-sub-btn-text');
        if (btn && plan) {
            btn.textContent = 'Payer ' + plan.price.toLocaleString('fr-FR') + ' F — ' + plan.name;
        }
    },

    // ---- Changement pays ----
    onCountryChange: function(select) {
        var opt  = select.options[select.selectedIndex];
        var dial = opt ? opt.getAttribute('data-dial') : '+229';
        var dialInput = document.getElementById('ako-sub-dial');
        if (dialInput && dial) dialInput.value = dial;
    },

    // ---- Initier le paiement ----
    initPayment: async function() {
        var planId   = SubscriptionModal._selectedPlan;
        var country  = (document.getElementById('ako-sub-country') || {}).value || '';
        var dial     = (document.getElementById('ako-sub-dial') || {}).value || '';
        var waPhone  = (document.getElementById('ako-sub-whatsapp') || {}).value || '';
        var btn      = document.getElementById('ako-sub-pay-btn');

        if (!planId) { SubscriptionModal._toast('Sélectionnez un plan', 'warning'); return; }
        if (!country) { SubscriptionModal._toast('Choisissez votre pays', 'warning'); return; }
        if (!waPhone || waPhone.replace(/\D/g, '').length < 6) {
            SubscriptionModal._toast('Numéro WhatsApp invalide', 'warning'); return;
        }

        var plan = CONFIG.PLANS[planId];
        if (!plan) return;

        // Conserver le 0 initial si présent (ex: Bénin "0190086267" → "+2290190086267")
        var waDigits     = waPhone.trim().replace(/\D/g, ''); // garde le 0 initial
        var whatsappFull = dial + waDigits;

        // Sauvegarder le profil — await + try/catch (pas de .catch() sur Supabase v2)
        if (App.profile) {
            try {
                await db.from('users').update({
                    whatsapp_number: whatsappFull,
                    country: country,
                    country_code: dial
                }).eq('id', App.profile.id);
            } catch(e) { console.warn('[SubModal] Save profile:', e); }
        }

        if (btn) { btn.disabled = true; btn.innerHTML = '<span style="display:inline-block;width:16px;height:16px;border:2px solid rgba(0,0,0,0.3);border-top-color:#1A0A00;border-radius:50%;animation:spin 0.8s linear infinite;margin-right:8px;"></span> Connexion...'; }

        var useFeexPay = (CONFIG.FEEXPAY_COUNTRIES || []).indexOf(country.toUpperCase()) !== -1;
        var reference  = 'AKO-SUB-' + Date.now() + '-' + Math.random().toString(36).slice(2,6).toUpperCase();
        var successUrl = window.location.origin + window.location.pathname + '?sub_success=1&plan=' + planId + '&uid=' + (App.profile ? App.profile.id : '') + '&ref=' + reference;
        var errorUrl   = window.location.origin + window.location.pathname + '?sub_error=1';

        try {
            // Appel à la Edge Function
            var edgeRes = await fetch(CONFIG.PAYMENT_EDGE_FN, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + CONFIG.SUPABASE_ANON_KEY
                },
                body: JSON.stringify({
                    country: country,
                    amount: plan.price,
                    planId: planId,
                    planName: plan.name,
                    success_url: successUrl,
                    error_url: errorUrl,
                    reference: reference,
                    customer: {
                        name: App.profile ? (App.profile.full_name || '') : '',
                        email: App.profile ? (App.profile.email || App.user.email || '') : '',
                        phone: whatsappFull
                    }
                })
            });

            var edgeData = await edgeRes.json();

            if (!edgeRes.ok || edgeData.error) {
                throw new Error(edgeData.error || 'Erreur paiement');
            }

            if (edgeData.provider === 'feexpay') {
                // FeexPay — SDK navigateur
                SubscriptionModal._initFeexPay(edgeData, reference, planId, whatsappFull);

            } else if (edgeData.provider === 'geniuspay') {
                // GeniusPay — L'Edge Function a déjà créé le lien, on redirige
                localStorage.setItem('ako_sub_ref', reference);
                localStorage.setItem('ako_sub_plan', planId);
                localStorage.setItem('ako_sub_uid', App.profile ? App.profile.id : '');
                window.location.href = edgeData.checkout_url;
            }

        } catch (err) {
            console.error('[SubModal] Erreur paiement:', err);
            SubscriptionModal._toast('Erreur: ' + err.message, 'error');
            if (btn) { btn.disabled = false; SubscriptionModal._restoreBtn(planId); }
        }
    },

    // ---- Init FeexPay SDK ----
    _initFeexPay: function(config, reference, planId, whatsappFull) {
        // Sauvegarder pour callback
        localStorage.setItem('ako_sub_ref', reference);
        localStorage.setItem('ako_sub_plan', planId);
        localStorage.setItem('ako_sub_uid', App.profile ? App.profile.id : '');

        var btn = document.getElementById('ako-sub-pay-btn');
        var feexZone = document.getElementById('ako-sub-feexpay-zone');
        var feexRender = document.getElementById('ako-feexpay-render');

        if (btn) btn.style.display = 'none';
        if (feexZone) feexZone.style.display = 'block';

        try {
            if (typeof FeexPayButton !== 'undefined') {
                FeexPayButton.init('ako-feexpay-render', {
                    id: config.storeId,
                    amount: config.amount,
                    token: config.token,
                    callback_url: config.callback_url,
                    error_callback_url: config.error_callback_url,
                    mode: 'LIVE',
                    custom_id: reference,
                    description: 'AKOLABS Plan ' + config.planName
                });
            } else if (typeof FeexPay !== 'undefined') {
                FeexPay.init({
                    token: config.token,
                    store: config.storeId,
                    amount: config.amount,
                    currency: 'XOF',
                    description: 'AKOLABS Plan ' + config.planName,
                    firstname: (App.profile.full_name || '').split(' ')[0] || 'User',
                    lastname: (App.profile.full_name || '').split(' ').slice(1).join(' ') || '-',
                    email: App.profile.email || App.user.email || '',
                    phone: whatsappFull.replace(/[+\s-]/g, ''),
                    reference: reference,
                    callback: async function(response) {
                        var ok = response && (response.status === 'SUCCESS' || response.status === 'success' || response.code === '200');
                        if (ok) {
                            var tid = response.reference || response.transaction_id || reference;
                            await SubscriptionModal.completeSubscription(planId, tid);
                        } else {
                            SubscriptionModal._toast('Paiement non complété.', 'warning');
                            SubscriptionModal.cancelPayment();
                        }
                    },
                    onClose: function() { SubscriptionModal.cancelPayment(); }
                });
            } else {
                throw new Error('SDK FeexPay non disponible');
            }
        } catch (e) {
            console.error('[SubModal] FeexPay:', e);
            SubscriptionModal._toast('Erreur SDK paiement.', 'error');
            SubscriptionModal.cancelPayment();
        }
    },

    // ---- Annuler le paiement ----
    cancelPayment: function() {
        var btn      = document.getElementById('ako-sub-pay-btn');
        var feexZone = document.getElementById('ako-sub-feexpay-zone');
        if (btn)      { btn.style.display = ''; SubscriptionModal._restoreBtn(SubscriptionModal._selectedPlan); }
        if (feexZone) feexZone.style.display = 'none';
        var feexRender = document.getElementById('ako-feexpay-render');
        if (feexRender) feexRender.innerHTML = '';
    },

    _restoreBtn: function(planId) {
        var plan = planId ? CONFIG.PLANS[planId] : null;
        var btn  = document.getElementById('ako-sub-pay-btn');
        if (!btn) return;
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-lock" id="ako-sub-btn-icon"></i> <span id="ako-sub-btn-text">Procéder au paiement' + (plan ? ' — ' + plan.price.toLocaleString('fr-FR') + ' F' : '') + '</span>';
    },

    // ---- Finaliser l'abonnement après paiement ----
    completeSubscription: async function(planId, transactionId) {
        SubscriptionModal._toast('Paiement reçu ! Activation en cours...', 'success', 4000);

        var plan = CONFIG.PLANS[planId];
        if (!plan) return;

        var userId = App.profile ? App.profile.id : null;
        if (!userId) return;

        // Calculer la date d'expiration
        var expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + (plan.durationMonths || 1));

        try {
            // Mettre à jour le profil
            await db.from('users').update({
                subscription_plan: planId,
                subscription_expires_at: expiresAt.toISOString(),
                is_app_purchased: true
            }).eq('id', userId);

            // Enregistrer l'achat
            await db.from('purchases').insert({
                user_id: userId,
                purchase_type: planId + '_subscription',
                amount: plan.price,
                fees: Math.ceil(plan.price * 3 / 100),
                total_paid: plan.price + Math.ceil(plan.price * 3 / 100),
                payment_ref: String(transactionId || ''),
                payment_provider: CONFIG.TEST_MODE ? 'test' : 'feexpay_or_geniuspay',
                status: 'confirmed',
                confirmed_at: new Date().toISOString()
            }).then(function(r) {
                if (r.error) console.warn('[SubModal] Insert purchase:', r.error);
            });

            // Analytics
            db.from('app_analytics').insert({
                event_type: 'subscription',
                user_id: userId,
                metadata: { plan: planId, amount: plan.price, transaction_id: transactionId }
            }).then(function() {}).catch(function() {});

            Utils.showConfetti();
            Utils.vibrate([100, 50, 100, 50, 200]);

            SubscriptionModal.close();
            SubscriptionModal._toast('Abonnement activé jusqu\'au ' + expiresAt.toLocaleDateString('fr-FR') + ' !', 'success', 6000);

            // Recharger après 2s pour prendre en compte le nouveau plan
            setTimeout(function() { window.location.reload(); }, 2500);

        } catch (err) {
            console.error('[SubModal] completeSubscription:', err);
            SubscriptionModal._toast('Erreur activation. Contactez le support.', 'error', 8000);
        }
    },

    // ---- Vérifier retour de paiement (appelé au démarrage de l'app) ----
    checkReturnFromPayment: async function() {
        var urlParams = new URLSearchParams(window.location.search);
        var subSuccess = urlParams.get('sub_success');
        var subError   = urlParams.get('sub_error');
        var planId     = urlParams.get('plan') || localStorage.getItem('ako_sub_plan');
        var ref        = urlParams.get('ref')  || localStorage.getItem('ako_sub_ref');

        window.history.replaceState({}, document.title, window.location.pathname);

        if (subSuccess === '1' && planId && ref) {
            localStorage.removeItem('ako_sub_ref');
            localStorage.removeItem('ako_sub_plan');
            localStorage.removeItem('ako_sub_uid');
            await SubscriptionModal.completeSubscription(planId, ref);
        } else if (subError === '1') {
            localStorage.removeItem('ako_sub_ref');
            localStorage.removeItem('ako_sub_plan');
            if (typeof Utils !== 'undefined') Utils.showToast('Paiement annulé. Tu peux réessayer.', 'warning', 5000);
        }
    },

    _toast: function(msg, type, duration) {
        if (typeof Utils !== 'undefined' && Utils.showToast) {
            Utils.showToast(msg, type, duration);
        } else {
            console.log('[SubModal]', msg);
        }
    }
};

// Vérifier le retour de paiement au chargement
document.addEventListener('DOMContentLoaded', function() {
    // Attendre que App et db soient prêts
    setTimeout(function() {
        if (typeof SubscriptionModal !== 'undefined') {
            SubscriptionModal.checkReturnFromPayment();
        }
    }, 1500);
});
