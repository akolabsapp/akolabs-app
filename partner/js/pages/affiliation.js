// ============================================
// AKOLABS - Page Affiliation
// ============================================

var AffiliationPage = {
    earnings: [],
    stats: null
};

AffiliationPage.render = async function() {
    var profile = App.profile;
    var code = profile.affiliate_code || 'AKO-XXXXX';
    var landingUrl = window.location.origin + '/' + CONFIG.LANDING_URL;
    var affiliateLink = landingUrl + '?ref=' + code;

    var shareText = '🚀 Decouvre AKOLABS, l\'arsenal digital premium ! Utilise mon code ' + code + ' pour avoir 10% de reduction. ' + affiliateLink;

    var h = '';

    // Header
    h += '<div class="affil-header">';
    h += '<div class="affil-header-icon"><i class="fas fa-hand-holding-usd"></i></div>';
    h += '<div class="affil-header-title">Programme d\'affiliation</div>';
    h += '<div class="affil-header-desc">Partagez AKOLABS et gagnez 10% de commission sur chaque vente</div>';
    h += '</div>';

    // Link box
    h += '<div class="affil-link-box">';
    h += '<div class="affil-link-label">Votre lien d\'affiliation</div>';
    h += '<div class="affil-link-row">';
    h += '<span class="affil-link-text" id="affil-link">' + affiliateLink + '</span>';
    h += '<button class="affil-link-copy" onclick="Utils.copyToClipboard(\'' + affiliateLink + '\')"><i class="fas fa-copy"></i> Copier</button>';
    h += '</div>';

    h += '<div class="affil-code-row">';
    h += '<span style="font-size:12px;color:#8E8E9E;">Votre code :</span>';
    h += '<span class="affil-code-badge">' + code + '</span>';
    h += '<button style="padding:4px 10px;background:rgba(212,175,55,0.1);border:1px solid rgba(212,175,55,0.2);border-radius:20px;color:#D4AF37;font-size:11px;" onclick="Utils.copyToClipboard(\'' + code + '\')"><i class="fas fa-copy"></i></button>';
    h += '</div>';

        h += '<div class="affil-share-btns">';
    h += '<button class="affil-share-btn affil-share-whatsapp" onclick="AffiliationPage.shareWhatsApp()"><i class="fab fa-whatsapp"></i> WhatsApp</button>';
    h += '<button class="affil-share-btn affil-share-telegram" onclick="AffiliationPage.shareTelegram()"><i class="fab fa-telegram"></i> Telegram</button>';
    h += '<button class="affil-share-btn affil-share-copy" onclick="AffiliationPage.copyLink()"><i class="fas fa-link"></i> Copier</button>';
    h += '</div>';
    h += '</div>';

    // Stats grid
    h += '<div class="affil-stats-grid">';
    h += '<div class="affil-stat-card"><div class="affil-stat-icon"><i class="fas fa-users"></i></div><div class="affil-stat-value" id="affil-filleuls">-</div><div class="affil-stat-label">Filleuls</div></div>';
    h += '<div class="affil-stat-card"><div class="affil-stat-icon"><i class="fas fa-coins"></i></div><div class="affil-stat-value" id="affil-total-gains">-</div><div class="affil-stat-label">Gains totaux</div></div>';
    h += '<div class="affil-stat-card"><div class="affil-stat-icon"><i class="fas fa-calendar-check"></i></div><div class="affil-stat-value" id="affil-month-gains">-</div><div class="affil-stat-label">Ce mois</div></div>';
    h += '<div class="affil-stat-card"><div class="affil-stat-icon"><i class="fas fa-shopping-cart"></i></div><div class="affil-stat-value" id="affil-total-sales">-</div><div class="affil-stat-label">Ventes</div></div>';
    h += '</div>';

    // Chart
    h += '<div class="affil-chart-container">';
    h += '<div class="affil-chart-title"><i class="fas fa-chart-bar" style="margin-right:8px;"></i>Gains mensuels</div>';
    h += '<div class="affil-chart" id="affil-chart"></div>';
    h += '</div>';

    // How it works
    h += '<div class="affil-how">';
    h += '<div class="affil-how-title"><i class="fas fa-info-circle" style="margin-right:8px;"></i>Comment ca marche ?</div>';
    h += '<div class="affil-how-step"><div class="affil-how-num">1</div><div class="affil-how-text"><strong>Partagez</strong> votre lien ou code d\'affiliation avec vos contacts</div></div>';
    h += '<div class="affil-how-step"><div class="affil-how-num">2</div><div class="affil-how-text">Votre filleul obtient <strong>10% de reduction</strong> sur son achat</div></div>';
    h += '<div class="affil-how-step"><div class="affil-how-num">3</div><div class="affil-how-text">Vous gagnez <strong>10% de commission</strong> automatiquement</div></div>';
    h += '<div class="affil-how-step"><div class="affil-how-num">4</div><div class="affil-how-text">Les commissions s\'accumulent sur <strong>tous les achats</strong> de vos filleuls</div></div>';
    h += '</div>';

    // Leaderboard
    h += '<div class="affil-history" style="margin-bottom:16px;">';
    h += '<div class="affil-history-title"><i class="fas fa-trophy" style="margin-right:8px;color:#C9A84C;"></i>Classement des affiliés</div>';
    h += '<div id="affil-leaderboard"></div>';
    h += '</div>';

    // History
    h += '<div class="affil-history">';
    h += '<div class="affil-history-title"><i class="fas fa-history" style="margin-right:8px;"></i>Historique des commissions</div>';
    h += '<div id="affil-history-list"></div>';
    h += '</div>';

    h += '<div style="height:32px;"></div>';

    return h;
};

AffiliationPage.init = async function() {
    await Promise.all([
        AffiliationPage.loadStats(),
        AffiliationPage.loadHistory(),
        AffiliationPage.loadLeaderboard()
    ]);
    AffiliationPage.renderChart();

    try {
        await db.from('app_analytics').insert({
            event_type: 'page_view',
            user_id: App.profile.id,
            metadata: { page: 'affiliation' }
        });
    } catch (e) {}
};

AffiliationPage.loadStats = async function() {
    try {
        // Total des gains
        var earningsResult = await db
            .from('affiliate_earnings')
            .select('commission_amount, created_at, status')
            .eq('affiliate_user_id', App.profile.id);

        var totalGains = 0;
        var monthGains = 0;
        var totalSales = 0;
        var now = new Date();
        var currentMonth = now.getMonth();
        var currentYear = now.getFullYear();

        if (earningsResult.data) {
            for (var i = 0; i < earningsResult.data.length; i++) {
                var e = earningsResult.data[i];
                totalGains += e.commission_amount || 0;
                totalSales++;

                var d = new Date(e.created_at);
                if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                    monthGains += e.commission_amount || 0;
                }
            }
            AffiliationPage.earnings = earningsResult.data;
        }

        // Nombre de filleuls
        var filleulsResult = await db
            .from('users')
            .select('id')
            .eq('referred_by', App.profile.affiliate_code);

        var filleuls = filleulsResult.data ? filleulsResult.data.length : 0;

        // Mettre a jour l'UI
        var el1 = document.getElementById('affil-filleuls');
        var el2 = document.getElementById('affil-total-gains');
        var el3 = document.getElementById('affil-month-gains');
        var el4 = document.getElementById('affil-total-sales');

        if (el1) el1.textContent = filleuls;
        if (el2) el2.textContent = Utils.formatPrice(totalGains);
        if (el3) el3.textContent = Utils.formatPrice(monthGains);
        if (el4) el4.textContent = totalSales;

    } catch (e) {
        console.log('[Affil] Erreur stats:', e);
    }
};


AffiliationPage.loadLeaderboard = async function() {
    var container = document.getElementById('affil-leaderboard');
    if (!container) return;

    try {
        var r = await db.from('affiliation_leaderboard').select('*').limit(10);
        var rows = r.data || [];

        if (rows.length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:20px;color:#8A87A0;font-size:13px;">Aucun affilié classé pour le moment.</div>';
            return;
        }

        var myCode = App.profile.affiliate_code;
        var medals = ['🥇', '🥈', '🥉'];
        var html = '';

        // Ma position en premier si pas dans le top 3
        var myRow = null;
        var myIndex = -1;
        for (var i = 0; i < rows.length; i++) {
            if (rows[i].affiliate_code === myCode) {
                myRow = rows[i];
                myIndex = i;
                break;
            }
        }

        // Top 10
        for (var j = 0; j < rows.length; j++) {
            var row = rows[j];
            var isMe = row.affiliate_code === myCode;
            var rank = parseInt(row.rank);
            var medal = rank <= 3 ? medals[rank - 1] : '#' + rank;
            var nameDisplay = isMe ? 'Vous' : (row.full_name ? row.full_name.split(' ')[0] : 'Affilié');
            var bgStyle = isMe
                ? 'background:linear-gradient(135deg,rgba(201,168,76,0.12),rgba(75,0,130,0.08));border:1.5px solid rgba(201,168,76,0.35);'
                : 'background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);';

            html += '<div style="' + bgStyle + 'border-radius:12px;padding:12px 14px;margin-bottom:8px;display:flex;align-items:center;gap:12px;">';

            // Médaille / rang
            html += '<div style="width:32px;text-align:center;font-size:' + (rank <= 3 ? '20px' : '13px') + ';font-weight:700;color:' + (rank <= 3 ? 'inherit' : '#8A87A0') + ';flex-shrink:0;">' + medal + '</div>';

            // Avatar + nom
            html += '<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#4B0082,#C9A84C);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;flex-shrink:0;">'
                + (row.full_name ? row.full_name.charAt(0).toUpperCase() : '?')
                + '</div>';

            html += '<div style="flex:1;min-width:0;">';
            html += '<div style="font-weight:' + (isMe ? '700' : '600') + ';color:' + (isMe ? '#C9A84C' : '#E2E0EC') + ';font-size:13px;">' + nameDisplay + (isMe ? ' ✨' : '') + '</div>';
            html += '<div style="font-size:11px;color:#8A87A0;">' + row.total_referrals + ' filleul' + (row.total_referrals > 1 ? 's' : '') + ' · ' + row.total_sales + ' vente' + (row.total_sales > 1 ? 's' : '') + '</div>';
            html += '</div>';

            // Gains
            html += '<div style="text-align:right;flex-shrink:0;">';
            html += '<div style="font-family:Cinzel,serif;font-weight:700;color:' + (rank === 1 ? '#C9A84C' : rank === 2 ? '#B0B0C0' : rank === 3 ? '#CD7F32' : '#E2E0EC') + ';font-size:13px;">' + Utils.formatPrice(row.total_earnings) + '</div>';
            html += '<div style="font-size:10px;color:#8A87A0;">commissions</div>';
            html += '</div>';

            html += '</div>';
        }

        // Si je ne suis pas dans le top 10, afficher ma position en bas
        if (myRow && myIndex >= 10) {
            html += '<div style="border-top:1px solid rgba(255,255,255,0.06);padding-top:10px;margin-top:4px;">';
            html += '<div style="background:linear-gradient(135deg,rgba(201,168,76,0.12),rgba(75,0,130,0.08));border:1.5px solid rgba(201,168,76,0.35);border-radius:12px;padding:12px 14px;display:flex;align-items:center;gap:12px;">';
            html += '<div style="width:32px;text-align:center;font-size:13px;font-weight:700;color:#8A87A0;">#' + myRow.rank + '</div>';
            html += '<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#4B0082,#C9A84C);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;">' + (App.profile.full_name ? App.profile.full_name.charAt(0).toUpperCase() : '?') + '</div>';
            html += '<div style="flex:1;"><div style="font-weight:700;color:#C9A84C;font-size:13px;">Vous ✨</div><div style="font-size:11px;color:#8A87A0;">' + myRow.total_referrals + ' filleul(s)</div></div>';
            html += '<div style="text-align:right;"><div style="font-family:Cinzel,serif;font-weight:700;color:#E2E0EC;font-size:13px;">' + Utils.formatPrice(myRow.total_earnings) + '</div></div>';
            html += '</div></div>';
        }

        container.innerHTML = html;

    } catch(e) {
        console.log('[Affil] Erreur leaderboard:', e);
        container.innerHTML = '<div style="text-align:center;padding:20px;color:#8A87A0;font-size:13px;">Classement indisponible</div>';
    }
};

AffiliationPage.loadHistory = async function() {
    var container = document.getElementById('affil-history-list');
    if (!container) return;

    try {
        var result = await db
            .from('affiliate_earnings')
            .select('id, commission_amount, status, created_at, buyer_user_id')
            .eq('affiliate_user_id', App.profile.id)
            .order('created_at', { ascending: false })
            .limit(20);

        if (!result.data || result.data.length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:32px 16px;color:#6C6C7E;font-size:14px;"><i class="fas fa-inbox" style="font-size:32px;display:block;margin-bottom:12px;color:#4A4A5A;"></i>Aucune commission pour le moment.<br>Partagez votre lien pour commencer !</div>';
            return;
        }

        var html = '';
        for (var i = 0; i < result.data.length; i++) {
            var item = result.data[i];
            var initial = '?';
            var statusClass = item.status === 'confirmed' ? 'confirmed' : 'pending';
            var statusText = item.status === 'confirmed' ? 'Confirme' : 'En attente';

            html += '<div class="affil-history-item">';
            html += '<div class="affil-history-avatar">' + initial + '</div>';
            html += '<div class="affil-history-info">';
            html += '<div class="affil-history-name">Filleul</div>';
            html += '<div class="affil-history-date">' + Utils.formatDate(item.created_at) + '</div>';
            html += '</div>';
            html += '<div style="text-align:right;">';
            html += '<div class="affil-history-amount">+' + Utils.formatPrice(item.commission_amount) + '</div>';
            html += '<span class="affil-history-status ' + statusClass + '">' + statusText + '</span>';
            html += '</div>';
            html += '</div>';
        }

        container.innerHTML = html;

    } catch (e) {
        console.log('[Affil] Erreur historique:', e);
        container.innerHTML = '<div style="text-align:center;padding:32px;color:#6C6C7E;font-size:14px;">Erreur de chargement</div>';
    }
};

AffiliationPage.renderChart = function() {
    var chartContainer = document.getElementById('affil-chart');
    if (!chartContainer) return;

    // Generer les 6 derniers mois
    var months = [];
    var now = new Date();

    for (var i = 5; i >= 0; i--) {
        var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
            month: d.getMonth(),
            year: d.getFullYear(),
            label: d.toLocaleDateString('fr-FR', { month: 'short' }),
            amount: 0
        });
    }

    // Remplir avec les donnees
    if (AffiliationPage.earnings) {
        for (var j = 0; j < AffiliationPage.earnings.length; j++) {
            var e = AffiliationPage.earnings[j];
            var ed = new Date(e.created_at);
            for (var k = 0; k < months.length; k++) {
                if (ed.getMonth() === months[k].month && ed.getFullYear() === months[k].year) {
                    months[k].amount += e.commission_amount || 0;
                }
            }
        }
    }

    // Trouver le max pour le ratio
    var maxAmount = 0;
    for (var m = 0; m < months.length; m++) {
        if (months[m].amount > maxAmount) maxAmount = months[m].amount;
    }
    if (maxAmount === 0) maxAmount = 1000;

    // Render les barres
    var html = '';
    for (var n = 0; n < months.length; n++) {
        var height = Math.max(4, (months[n].amount / maxAmount) * 100);
        var displayAmount = months[n].amount > 0 ? Utils.formatNumber(months[n].amount) : '0';

        html += '<div class="affil-chart-bar-group">';
        html += '<div class="affil-chart-value">' + displayAmount + '</div>';
        html += '<div class="affil-chart-bar" style="height:' + height + '%;"></div>';
        html += '<div class="affil-chart-label">' + months[n].label + '</div>';
        html += '</div>';
    }

    chartContainer.innerHTML = html;
    
    AffiliationPage.shareWhatsApp = function() {
    var code = App.profile.affiliate_code || 'AKO-XXXXX';
    var landingUrl = window.location.origin + '/' + CONFIG.LANDING_URL;
    var link = landingUrl + '?ref=' + code;
    var text = 'Decouvre AKOLABS, l\'arsenal digital premium ! Utilise mon code ' + code + ' pour avoir 10% de reduction. ' + link;
    var encoded = encodeURIComponent(text);
    window.open('https://wa.me/?text=' + encoded, '_blank');
};

AffiliationPage.shareTelegram = function() {
    var code = App.profile.affiliate_code || 'AKO-XXXXX';
    var landingUrl = window.location.origin + '/' + CONFIG.LANDING_URL;
    var link = landingUrl + '?ref=' + code;
    var text = 'Decouvre AKOLABS, l\'arsenal digital premium ! Utilise mon code ' + code + ' pour avoir 10% de reduction. ' + link;
    var encoded = encodeURIComponent(text);
    window.open('https://t.me/share/url?url=' + encoded, '_blank');
};

AffiliationPage.copyLink = function() {
    var code = App.profile.affiliate_code || 'AKO-XXXXX';
    var landingUrl = window.location.origin + '/' + CONFIG.LANDING_URL;
    var link = landingUrl + '?ref=' + code;
    Utils.copyToClipboard(link);
};
};