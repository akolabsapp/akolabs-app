// ============================================
// AKOLABS - Page Detail Section + Achat
// ============================================

var SectionDetail = {
    section: null,
    hasAccess: false,
    isFree: false,
    currentPrice: 0,
    basePrice: 0,
    promoData: null,
    promoTimeout: null,

    render: async function(params) {
        var sectionId = params.id;

        // Charger la section
        try {
            var result = await db
                .from('sections')
                .select('*')
                .eq('id', sectionId)
                .single();

            if (result.error || !result.data) {
                return SectionDetail.renderError('Section introuvable');
            }

            SectionDetail.section = result.data;

            // === TRACKING VUE ===
            setTimeout(function() {
                if (typeof Tracking !== 'undefined') {
                    var sec = SectionDetail.section;
                    Tracking.logSectionView(sec.id, sec.is_free);
                    // Popups sur section ouverte
                    Tracking.checkPopups('section_open', { isFree: sec.is_free });
                    // Popup après X secondes sur page
                    Tracking.checkPopups('time_on_page', { isFree: sec.is_free });
                }
            }, 500);

        } catch (e) {
            return SectionDetail.renderError('Erreur de chargement');
        }

        // Verifier l'acces
        try {
            var accessResult = await db
                .from('user_sections')
                .select('id')
                .eq('user_id', App.profile.id)
                .eq('section_id', sectionId)
                .eq('is_active', true)
                .maybeSingle();

            SectionDetail.hasAccess = !!(accessResult.data);
        } catch (e) {
            SectionDetail.hasAccess = false;
        }

        var s = SectionDetail.section;
        SectionDetail.isFree = s.is_free;
        SectionDetail.basePrice = s.price || 0;
        SectionDetail.currentPrice = SectionDetail.basePrice;

        // Verifier promo active
        var hasPromo = false;
        if (s.promo_price && s.promo_price < s.price) {
            if (s.promo_end_date) {
                if (new Date(s.promo_end_date).getTime() > new Date().getTime()) {
                    hasPromo = true;
                }
            } else {
                hasPromo = true;
            }
        }

        if (hasPromo) {
            SectionDetail.currentPrice = s.promo_price;
        }

        // Vérifier offre flash (prioritaire sur promo classique)
        SectionDetail.flash = null;
        if (typeof FlashSale !== 'undefined' && FlashSale.active.length > 0) {
            SectionDetail.flash = FlashSale.forSection(s.id);
            if (SectionDetail.flash) {
                SectionDetail.currentPrice = FlashSale.getPrice(SectionDetail.flash, SectionDetail.basePrice);
            }
        }

        return SectionDetail.buildPage(s, hasPromo);
    },

    buildPage: function(s, hasPromo) {
        var html = '';

        // Banner
        html += '<div class="detail-banner">';
        if (s.banner_url) {
            var dSrc = s.banner_url || '';
        if (dSrc && dSrc.indexOf('res.cloudinary.com') !== -1) dSrc = dSrc.replace('/upload/', '/upload/f_auto,q_auto:good,w_800,c_fill/');
        html += '<img src="' + dSrc + '" alt="' + s.title + '" fetchpriority="high" decoding="async" style="opacity:0;transition:opacity .4s" onload="this.style.opacity=1">';
        } else {
            html += '<span class="detail-banner-placeholder">' + s.title.charAt(0) + '</span>';
        }
        html += '<div class="detail-banner-overlay"></div>';

        // Badges sur le banner
        html += '<div class="detail-banner-badges">';
        if (s.is_free) html += '<span class="badge badge-free"><i class="fas fa-gift"></i> Gratuit</span>';
        if (hasPromo) html += '<span class="badge badge-hot"><i class="fas fa-fire"></i> Promo</span>';
        if (s.is_featured) html += '<span class="badge badge-premium"><i class="fas fa-star"></i> Premium</span>';
        if (s.type === 'webview') html += '<span class="badge badge-new"><i class="fas fa-globe"></i> Universe</span>';
        if (s.type === 'drive') html += '<span class="badge badge-new"><i class="fas fa-graduation-cap"></i> Learning</span>';
        html += '</div>';

        // Back button sur le banner
        html += '<div class="detail-banner-back">';
        html += '<button class="detail-back-btn" onclick="Router.navigate(\'/home\')">';
        html += '<i class="fas fa-arrow-left"></i>';
        html += '</button>';
        html += '</div>';

        html += '</div>';

        // Title
        html += '<h1 class="detail-title">' + s.title + '</h1>';

        // Meta
        html += '<div class="detail-meta">';
        if (s.type === 'webview') {
            html += '<span class="detail-meta-item"><i class="fas fa-globe"></i> AKOLABS Universe</span>';
        } else {
            html += '<span class="detail-meta-item"><i class="fas fa-graduation-cap"></i> AKOLABS Learning</span>';
        }
        if (s.total_users > 0) {
            html += '<span class="detail-meta-item"><i class="fas fa-users"></i> ' + s.total_users + ' utilisateurs</span>';
        }
        if (s.duration_estimate) {
            html += '<span class="detail-meta-item"><i class="fas fa-clock"></i> ' + s.duration_estimate + '</span>';
        }
        html += '<span class="detail-meta-item"><i class="fas fa-infinity"></i> Acces a vie</span>';
        html += '</div>';

        // Description
        html += '<div class="detail-description">' + (s.long_description || s.description || '') + '</div>';

        // Social proof
        if (s.total_users > 0) {
            html += '<div class="detail-social-proof">';
            html += '<i class="fas fa-users"></i>';
            html += '<span><strong>' + s.total_users + ' personnes</strong> ont deja acces a cette section</span>';
            html += '</div>';
        }

        // Video preview
        if (s.preview_video_url) {
            html += '<div class="detail-section">';
            html += '<div class="detail-section-title"><i class="fas fa-play-circle"></i> Apercu video</div>';
            html += '<div class="video-preview">';
            if (s.preview_video_url.indexOf('youtube') !== -1 || s.preview_video_url.indexOf('youtu.be') !== -1) {
                var videoId = SectionDetail.extractYoutubeId(s.preview_video_url);
                if (videoId) {
                    html += '<iframe src="https://www.youtube.com/embed/' + videoId + '" allowfullscreen></iframe>';
                }
            } else {
                // Video native HTML5 (Cloudinary, etc.)
                // Generer le poster automatiquement depuis Cloudinary
                var videoUrl = s.preview_video_url;
                var posterUrl = '';
                if (videoUrl.indexOf('cloudinary.com') !== -1) {
                    // Cloudinary : remplacer /upload/ par /upload/so_2/ pour capturer a 2 secondes
                    // et changer l'extension en .jpg pour avoir une image
                    posterUrl = videoUrl
                        .replace('/upload/', '/upload/so_2,q_80,w_800/')
                        .replace(/\.mp4$/, '.jpg')
                        .replace(/\.mov$/, '.jpg')
                        .replace(/\.webm$/, '.jpg')
                        .replace(/\.avi$/, '.jpg');
                }
                html += '<video class="video-native" controls playsinline preload="metadata"';
                if (posterUrl) html += ' poster="' + posterUrl + '"';
                html += ' style="width:100%;border-radius:12px;max-height:220px;background:#000;display:block;">';
                html += '<source src="' + videoUrl + '" type="video/mp4">';
                html += '</video>';
            }
            html += '</div>';
            html += '</div>';
        }

        // Preview images
        if (s.preview_images && s.preview_images.length > 0) {
            html += '<div class="detail-section">';
            html += '<div class="detail-section-title"><i class="fas fa-images"></i> Captures d\'ecran</div>';
            html += '<div class="preview-gallery">';
            for (var i = 0; i < s.preview_images.length; i++) {
                html += '<div class="preview-gallery-item">';
                html += '<img src="' + s.preview_images[i] + '" alt="Apercu ' + (i + 1) + '">';
                html += '</div>';
            }
            html += '</div>';
            html += '</div>';
        }

        // Advantages
        if (s.advantages && s.advantages.length > 0) {
            html += '<div class="detail-section">';
            html += '<div class="detail-section-title"><i class="fas fa-check-double"></i> Ce que vous obtenez</div>';
            for (var j = 0; j < s.advantages.length; j++) {
                html += '<div class="advantage-item">';
                html += '<div class="advantage-icon"><i class="fas fa-check"></i></div>';
                html += '<div class="advantage-text">' + s.advantages[j] + '</div>';
                html += '</div>';
            }
            html += '</div>';
        }

        // Testimonials
        if (s.testimonials && s.testimonials.length > 0) {
            html += '<div class="detail-section">';
            html += '<div class="detail-section-title"><i class="fas fa-quote-right"></i> Temoignages</div>';
            for (var t = 0; t < s.testimonials.length; t++) {
                var testi = s.testimonials[t];
                html += '<div class="detail-testimonial">';
                html += '<div class="detail-testimonial-text">"' + (testi.text || testi) + '"</div>';
                if (testi.author) {
                    html += '<div class="detail-testimonial-author"><i class="fas fa-user-circle"></i> ' + testi.author + '</div>';
                }
                html += '</div>';
            }
            html += '</div>';
        }

        // ACCESS GRANTED or PURCHASE BOX
        if (SectionDetail.hasAccess || SectionDetail.isFree) {
            html += SectionDetail.buildAccessGranted(s);
        } else {
            html += SectionDetail.buildPurchaseBox(s, hasPromo);
        }

        // Spacer
        html += '<div style="height:32px;"></div>';

        return html;
    },

    // ---- ACCES DEJA ACCORDE ----
    buildAccessGranted: function(s) {
        var btnRoute = '';
        var btnText = '';
        var btnIcon = '';

        if (s.type === 'webview') {
            if (s.open_in_browser && s.site_url) {
                btnRoute = null;
                btnText = 'Ouvrir l\'outil';
                btnIcon = 'fa-external-link-alt';
            } else {
                btnRoute = '/webview/' + s.id;
                btnText = 'Ouvrir l\'outil';
                btnIcon = 'fa-external-link-alt';
            }
        } else {
            btnRoute = '/formation/' + s.id;
            btnText = 'Acceder a la formation';
            btnIcon = 'fa-graduation-cap';
        }

        var h = '';
        h += '<div class="access-granted-box">';
        h += '<div class="access-granted-icon"><i class="fas fa-check-circle"></i></div>';
        h += '<div class="access-granted-title">Acces debloque !</div>';
        h += '<div class="access-granted-desc">Vous avez acces a cette section. Profitez-en !</div>';
        if (btnRoute) {
            h += '<button class="btn btn-success btn-lg btn-block" onclick="Router.navigate(\'' + btnRoute + '\')">';
        } else {
            h += '<button class="btn btn-success btn-lg btn-block" onclick="window.open(\'' + (s.site_url||'') + '\',\'_blank\')">';
        }
        h += '<i class="fas ' + btnIcon + '"></i> ' + btnText;
        h += '</button>';
        h += '</div>';

        return h;
    },

    // ---- MODULE D'ACHAT ----
    buildPurchaseBox: function(s, hasPromo) {
        var h = '';

        h += '<div class="purchase-box" id="purchase-box">';
        h += '<div class="purchase-box-title"><i class="fas fa-crown"></i> Debloquer l\'acces</div>';

        // Prix flash (prioritaire)
        if (SectionDetail.flash) {
            h += '<div id="flash-price-block"></div>';
        } else {
            // Prix normal / promo classique
            h += '<div class="purchase-price-display">';
            if (hasPromo) {
                h += '<div class="purchase-price-old">' + Utils.formatPrice(s.price) + '</div>';
            }
            h += '<div class="purchase-price-main" id="detail-price-main">' + Utils.formatPrice(SectionDetail.currentPrice) + '</div>';
            h += '<div class="purchase-price-label">Paiement unique - Acces a vie</div>';
            h += '</div>';
            // Countdown si promo classique
            if (hasPromo && s.promo_end_date) {
                h += '<div class="purchase-countdown">';
                h += '<div class="countdown" id="detail-countdown"></div>';
                h += '</div>';
            }
        }

        // Code promo
        h += '<div class="purchase-promo-input">';
        h += '<div class="input-group" style="margin-bottom:0;">';
        h += '<label class="input-label">Code promo (optionnel)</label>';
        h += '<input type="text" class="input-field" id="detail-promo" placeholder="Entrez votre code" style="text-transform:uppercase;" oninput="SectionDetail.handlePromoInput(this.value)">';
        h += '</div>';
        h += '<div class="purchase-promo-result" id="promo-result"></div>';
        h += '</div>';

        // Summary
        h += '<div class="purchase-summary" id="purchase-summary" style="display:none;">';
        h += '<div class="purchase-summary-row">';
        h += '<span>Prix de base</span>';
        h += '<span id="summary-base"></span>';
        h += '</div>';
        h += '<div class="purchase-summary-row" id="summary-discount-row" style="display:none;">';
        h += '<span>Reduction</span>';
        h += '<span class="discount" id="summary-discount"></span>';
        h += '</div>';
        h += '<div class="purchase-summary-row total">';
        h += '<span>Total</span>';
        h += '<span id="summary-total"></span>';
        h += '</div>';
        h += '</div>';

        // Buy button
        h += '<button class="btn btn-primary btn-lg btn-block" id="btn-buy-section" onclick="SectionDetail.handlePurchase()">';
        h += '<i class="fas fa-lock"></i>';
        h += '<span class="btn-text" id="btn-buy-text">Acheter pour ' + Utils.formatPrice(SectionDetail.currentPrice) + '</span>';
        h += '</button>';

        // Guarantee
        h += '<div class="purchase-guarantee">';
        h += '<i class="fas fa-shield-alt"></i>';
        h += '<span>Paiement securise. Acces instantane apres paiement. Acces a vie garanti.</span>';
        h += '</div>';

        h += '</div>';

        return h;
    },

    // ---- INIT ----
    init: async function(params) {
        var s = SectionDetail.section;
        if (!s) return;

        // Lancer le countdown si promo classique
        if (s.promo_end_date && !SectionDetail.flash) {
            var endDate = new Date(s.promo_end_date).getTime();
            if (endDate > new Date().getTime()) {
                Utils.startCountdown(s.promo_end_date, 'detail-countdown');
            }
        }

        // Rendre le bloc prix flash avec timer live
        if (SectionDetail.flash && typeof FlashSale !== 'undefined') {
            FlashSale.renderPriceBlock(SectionDetail.flash, SectionDetail.basePrice, 'flash-price-block');
        }

        // Tracker la vue
        try {
            // Incrementer le compteur de vues
            await db.from('sections')
                .update({ total_views: (s.total_views || 0) + 1 })
                .eq('id', s.id);

            await db.from('app_analytics').insert({
                event_type: 'section_view',
                user_id: App.profile.id,
                section_id: s.id,
                metadata: { title: s.title, type: s.type }
            });
        } catch (e) {}
    },

    // ---- PROMO CODE ----
    handlePromoInput: function(value) {
        var code = value.trim().toUpperCase();
        var input = document.getElementById('detail-promo');
        if (input) input.value = code;

        clearTimeout(SectionDetail.promoTimeout);

        if (code.length < 3) {
            SectionDetail.resetPromo();
            return;
        }

        SectionDetail.promoTimeout = setTimeout(function() {
            SectionDetail.checkPromo(code);
        }, 600);
    },

    checkPromo: async function(code) {
        var resultDiv = document.getElementById('promo-result');

        try {
            var result = await db.rpc('verify_promo_code', {
                p_code: code,
                p_section_id: SectionDetail.section.id
            });

            if (result.error) throw result.error;

            var data = result.data;

            if (data && data.valid) {
                SectionDetail.promoData = data;
                var discountPercent = data.discount_percent || 0;
                var discountAmount = Math.round(SectionDetail.currentPrice * discountPercent / 100);
                var finalPrice = SectionDetail.currentPrice - discountAmount;

                // Afficher le resultat
                if (resultDiv) {
                    resultDiv.className = 'purchase-promo-result success';
                    resultDiv.innerHTML = '<i class="fas fa-check-circle"></i> Code valide ! -' + discountPercent + '% de reduction';
                }

                // Mettre a jour le summary
                SectionDetail.showSummary(SectionDetail.currentPrice, discountAmount, finalPrice);

                // Mettre a jour le bouton
                var btnText = document.getElementById('btn-buy-text');
                if (btnText) btnText.textContent = 'Acheter pour ' + Utils.formatPrice(finalPrice);

                Utils.showToast('Code promo applique !', 'success');
            } else {
                if (resultDiv) {
                    resultDiv.className = 'purchase-promo-result error';
                    resultDiv.innerHTML = '<i class="fas fa-times-circle"></i> ' + (data.error || 'Code invalide');
                }
                SectionDetail.resetPromo();
            }
        } catch (e) {
            console.log('[Detail] Erreur promo:', e);
            SectionDetail.resetPromo();
        }
    },

    resetPromo: function() {
        SectionDetail.promoData = null;

        var resultDiv = document.getElementById('promo-result');
        if (resultDiv) {
            resultDiv.className = 'purchase-promo-result';
            resultDiv.innerHTML = '';
        }

        var summaryDiv = document.getElementById('purchase-summary');
        if (summaryDiv) summaryDiv.style.display = 'none';

        var btnText = document.getElementById('btn-buy-text');
        if (btnText) btnText.textContent = 'Acheter pour ' + Utils.formatPrice(SectionDetail.currentPrice);
    },

    showSummary: function(base, discount, total) {
        var summaryDiv = document.getElementById('purchase-summary');
        if (summaryDiv) summaryDiv.style.display = 'block';

        var baseEl = document.getElementById('summary-base');
        var discountRow = document.getElementById('summary-discount-row');
        var discountEl = document.getElementById('summary-discount');
        var totalEl = document.getElementById('summary-total');

        if (baseEl) baseEl.textContent = Utils.formatPrice(base);

        if (discount > 0 && discountRow && discountEl) {
            discountRow.style.display = 'flex';
            discountEl.textContent = '-' + Utils.formatPrice(discount);
        }

        if (totalEl) totalEl.textContent = Utils.formatPrice(total);
    },

    // ---- HANDLE PURCHASE ----
    handlePurchase: async function() {
        var btn = document.getElementById('btn-buy-section');
        if (!btn) return;

        btn.classList.add('btn-loading');
        btn.disabled = true;

        var s = SectionDetail.section;
        var finalPrice = SectionDetail.currentPrice;

        // Appliquer le promo si existe
        if (SectionDetail.promoData && SectionDetail.promoData.valid) {
            var discountPercent = SectionDetail.promoData.discount_percent || 0;
            var discountAmount = Math.round(finalPrice * discountPercent / 100);
            finalPrice = finalPrice - discountAmount;
        }

        var purchaseData = {
            sectionId: s.id,
            sectionTitle: s.title,
            sectionType: s.type,
            amount: finalPrice,
            basePrice: SectionDetail.basePrice,
            promoCode: document.getElementById('detail-promo') ? document.getElementById('detail-promo').value.trim().toUpperCase() : '',
            promoData: SectionDetail.promoData
        };

        if (CONFIG.TEST_MODE) {
            SectionDetail.simulatePayment(purchaseData);
        } else {
            SectionDetail.openFedaPay(purchaseData);
        }
    },

    // ---- SIMULATION ----
    simulatePayment: function(purchaseData) {
        SectionDetail._tempData = purchaseData;

        var h = '';
        h += '<div style="text-align:center;padding:20px 0;">';
        h += '<div style="font-size:48px;margin-bottom:16px;">🧪</div>';
        h += '<h3 style="font-family:Cinzel,serif;color:#D4AF37;margin-bottom:8px;">Mode Test</h3>';
        h += '<p style="color:#AEAEBE;font-size:14px;margin-bottom:24px;">';
        h += 'Simuler l\'achat de <strong style="color:#D4AF37;">' + purchaseData.sectionTitle + '</strong>';
        h += ' pour <strong style="color:#D4AF37;">' + Utils.formatPrice(purchaseData.amount) + '</strong> ?';
        h += '</p>';
        h += '<button class="btn btn-primary btn-block" onclick="Utils.closeBottomSheet(); SectionDetail.completePurchase(SectionDetail._tempData, \'TEST-\' + Date.now());">';
        h += '<i class="fas fa-check"></i> Simuler paiement reussi</button>';
        h += '<button class="btn btn-secondary btn-block" style="margin-top:8px;" onclick="Utils.closeBottomSheet(); var b=document.getElementById(\'btn-buy-section\'); if(b){b.classList.remove(\'btn-loading\');b.disabled=false;}">';
        h += 'Annuler</button>';
        h += '</div>';

        Utils.openBottomSheet(h);
    },

    // ---- FEDAPAY REEL ----
    openFedaPay: function(purchaseData) {
        var btn = document.getElementById('btn-buy-section');
        var feePercent = 3;
        var fees = Math.ceil(purchaseData.amount * feePercent / 100);
        var totalWithFees = purchaseData.amount + fees;

        SectionDetail._tempData = purchaseData;

        try {
            console.log('[FedaPay] Ouverture du widget...');
            
            // On initialise sans cibler le bouton
            var widget = FedaPay.init({
                public_key: CONFIG.FEDAPAY_PUBLIC_KEY,
                transaction: {
                    amount: totalWithFees,
                    description: 'AKOLABS - ' + purchaseData.sectionTitle
                },
                customer: {
                    email: App.profile.email,
                    firstname: (App.profile.full_name || '').split(' ')[0] || 'User',
                    lastname: (App.profile.full_name || '').split(' ').slice(1).join(' ') || '-'
                },
                currency: { iso: CONFIG.FEDAPAY_CURRENCY },
                environment: CONFIG.FEDAPAY_ENV,
                onComplete: async function(resp) {
                    var ok = resp.reason === 'CHECKOUT_COMPLETE' || 
                             resp.reason === FedaPay.CHECKOUT_COMPLETED || 
                             (resp.transaction && resp.transaction.status === 'approved');
                             
                    if (ok) {
                        var tid = (resp.transaction && resp.transaction.id) || resp.id || 'FDP-' + Date.now();
                        await SectionDetail.completePurchase(purchaseData, tid);
                    } else {
                        Utils.showToast('Paiement non complete.', 'warning');
                        if (btn) { btn.classList.remove('btn-loading'); btn.disabled = false; }
                    }
                },
                onClose: function() {
                    console.log('[FedaPay] Widget ferme');
                    if (btn) { btn.classList.remove('btn-loading'); btn.disabled = false; }
                }
            });

            // ON FORCE L'OUVERTURE ICI 👇
            widget.open();

        } catch (e) {
            console.error('[FedaPay] Erreur:', e);
            Utils.showToast('Erreur systeme de paiement.', 'error');
            if (btn) { btn.classList.remove('btn-loading'); btn.disabled = false; }
        }
    },

    // ---- FINALISER L'ACHAT ----
    completePurchase: async function(purchaseData, transactionId) {
        try {
            Utils.showToast('Paiement recu ! Activation en cours...', 'success', 5000);

            // 1. Creer l'achat
            var affiliateUserId = (purchaseData.promoData && purchaseData.promoData.affiliate_user_id)
                ? purchaseData.promoData.affiliate_user_id : null;
            var commission = affiliateUserId
                ? Math.round(purchaseData.amount * CONFIG.AFFILIATE_COMMISSION_PERCENT / 100)
                : 0;
            var fees = Math.ceil(purchaseData.amount * 3 / 100);

            try {
                await db.from('purchases').insert({
                    user_id: App.profile.id,
                    section_id: purchaseData.sectionId,
                    purchase_type: 'section_access',
                    amount: purchaseData.amount,
                    fees: fees,
                    total_paid: purchaseData.amount + fees,
                    payment_ref: String(transactionId || ''),
                    payment_provider: CONFIG.TEST_MODE ? 'test' : 'fedapay',
                    promo_code_used: purchaseData.promoCode || null,
                    discount_amount: purchaseData.basePrice - purchaseData.amount,
                    affiliate_user_id: affiliateUserId,
                    affiliate_commission: commission,
                    status: 'confirmed'
                });
                console.log('[Detail] Achat enregistre');
            } catch (e) {
                console.log('[Detail] Note insert achat:', e);
            }

            // 2. Donner l'acces (le trigger devrait le faire, mais on le fait aussi manuellement)
            try {
                await db.from('user_sections').insert({
                    user_id: App.profile.id,
                    section_id: purchaseData.sectionId,
                    access_type: 'lifetime',
                    granted_by: 'purchase',
                    is_active: true
                });
                console.log('[Detail] Acces accorde');
            } catch (e) {
                // Peut etre deja fait par le trigger
                console.log('[Detail] Note insert acces:', e);
            }

            // 3. Incrementer code promo
            if (purchaseData.promoCode) {
                try {
                    await db.rpc('increment_promo_usage', { p_code: purchaseData.promoCode });
                } catch (e) {}
            }

            // 4. Analytics
            try {
                await db.from('app_analytics').insert({
                    event_type: 'purchase',
                    user_id: App.profile.id,
                    section_id: purchaseData.sectionId,
                    metadata: {
                        type: 'section_access',
                        title: purchaseData.sectionTitle,
                        amount: purchaseData.amount,
                        promo: purchaseData.promoCode || null,
                        transaction_id: transactionId,
                        test_mode: CONFIG.TEST_MODE
                    }
                });
            } catch (e) {}

            // 5. Confetti
            Utils.showConfetti();
            Utils.vibrate([100, 50, 100, 50, 200]);

            // ENVOI DE L'EMAIL DE RECU
            try {
                var userName = App.profile.full_name || 'Utilisateur';
                var date = Utils.formatDate(new Date().toISOString());
                
                // Recuperer l'email depuis auth si absent dans profile
                var userEmail = App.profile.email;
                if (!userEmail && App.user) userEmail = App.user.email;
                console.log('[EmailJS] Envoi a:', userEmail);

                if (!userEmail) {
                    console.log('[EmailJS] Email introuvable - envoi annule');
                } else {
                    // Email marketing - séquence post-achat
                    if (typeof EmailMarketing !== 'undefined') {
                        EmailMarketing.trigger('purchase', { section_title: section.title || '' });
                    }
                    await Utils.sendEmail(CONFIG.EMAILJS_TEMPLATE_RECEIPT, {
                        to_email: userEmail,
                        to_name: userName,
                        section_title: purchaseData.sectionTitle,
                        amount_paid: Utils.formatPrice(purchaseData.amount),
                        date: date,
                        transaction_id: transactionId
                    });
                }
            } catch(e) {
                console.log('[Detail] Erreur envoi email (non bloquant)', e);
            }

            // 6. Afficher le succes
            SectionDetail.showPurchaseSuccess(purchaseData);

        } catch (error) {
            console.error('[Detail] Erreur finalisation:', error);
            Utils.showToast('Erreur. Contactez le support.', 'error');
            var btn = document.getElementById('btn-buy-section');
            if (btn) { btn.classList.remove('btn-loading'); btn.disabled = false; }
        }
    },

    // ---- ECRAN DE SUCCES ----
    showPurchaseSuccess: function(purchaseData) {
        var purchaseBox = document.getElementById('purchase-box');
        if (!purchaseBox) return;

        var s = SectionDetail.section;
        var btnRoute = '';
        var btnText = '';
        var btnIcon = '';

        if (s.type === 'webview') {
            if (s.open_in_browser && s.site_url) {
                btnRoute = null;
                btnText = 'Ouvrir l\'outil maintenant';
                btnIcon = 'fa-external-link-alt';
            } else {
                btnRoute = '/webview/' + s.id;
                btnText = 'Ouvrir l\'outil maintenant';
                btnIcon = 'fa-external-link-alt';
            }
        } else {
            btnRoute = '/formation/' + s.id;
            btnText = 'Acceder a la formation';
            btnIcon = 'fa-graduation-cap';
        }

        var testBanner = '';
        if (CONFIG.TEST_MODE) {
            testBanner = '<div style="background:rgba(255,193,7,0.1);border:1px solid rgba(255,193,7,0.3);border-radius:10px;padding:12px;margin-bottom:16px;"><p style="color:#FFC107;font-size:11px;text-align:center;">🧪 Mode test</p></div>';
        }

        var h = '';
        h += '<div style="text-align:center;padding:24px 0;">';
        h += '<div style="font-size:64px;margin-bottom:16px;">🎉</div>';
        h += '<h2 style="font-family:Cinzel,serif;color:#28A745;font-size:20px;margin-bottom:8px;">Acces debloque !</h2>';
        h += '<p style="color:#AEAEBE;font-size:14px;margin-bottom:24px;">Vous avez maintenant acces a <strong style="color:#D4AF37;">' + purchaseData.sectionTitle + '</strong></p>';
        h += testBanner;
        if (btnRoute) {
            h += '<button class="btn btn-success btn-lg btn-block" onclick="Router.navigate(\'' + btnRoute + '\')">';
        } else {
            h += '<button class="btn btn-success btn-lg btn-block" onclick="window.open(\'' + (s.site_url||'') + '\',\'_blank\')">';
        }
        h += '<i class="fas ' + btnIcon + '"></i> ' + btnText;
        h += '</button>';
        h += '<button class="btn btn-secondary btn-block" style="margin-top:8px;" onclick="Router.navigate(\'/home\')">';
        h += '<i class="fas fa-home"></i> Retour a l\'accueil';
        h += '</button>';
        h += '</div>';

        purchaseBox.innerHTML = h;
        purchaseBox.scrollIntoView({ behavior: 'smooth' });
    },

    // ---- ERREUR ----
    renderError: function(message) {
        var h = '';
        h += '<div style="text-align:center;padding:60px 20px;">';
        h += '<div style="font-size:48px;color:#DC3545;margin-bottom:16px;"><i class="fas fa-exclamation-triangle"></i></div>';
        h += '<h2 style="color:#F8F9FA;font-size:18px;margin-bottom:8px;">Oups !</h2>';
        h += '<p style="color:#8E8E9E;font-size:14px;margin-bottom:24px;">' + message + '</p>';
        h += '<button class="btn btn-primary" onclick="Router.navigate(\'/home\')"><i class="fas fa-home"></i> Retour</button>';
        h += '</div>';
        return h;
    },

    // ---- HELPERS ----
    extractYoutubeId: function(url) {
        if (!url) return null;
        var match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        return match ? match[1] : null;
    }
};