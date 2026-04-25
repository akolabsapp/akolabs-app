// ============================================
// AKOLABS - Page Notifications
// ============================================

var NotificationsPage = {
    notifications: [],
    unreadCount: 0
};

NotificationsPage.render = async function() {
    var h = '';

    h += '<div class="notif-header">';
    h += '<div class="notif-header-left">';
    h += '<div class="notif-header-title">Notifications</div>';
    h += '<span class="notif-header-count" id="notif-count-badge" style="display:none;">0</span>';
    h += '</div>';
    h += '<button class="notif-mark-all" onclick="NotificationsPage.markAllRead()"><i class="fas fa-check-double"></i> Tout lire</button>';
    h += '</div>';

    h += '<div id="notif-list"></div>';

    h += '<div style="height:32px;"></div>';

    return h;
};

NotificationsPage.init = async function() {
    await NotificationsPage.loadNotifications();
    NotificationsPage.renderList();
};

NotificationsPage.loadNotifications = async function() {
    try {
        // Charger les notifications
        var result = await db
            .from('notifications')
            .select('*')
            .or('target.eq.all,target_user_id.eq.' + App.profile.id)
            .eq('is_active', true)
            .order('sent_at', { ascending: false })
            .limit(50);

        if (result.data) {
            NotificationsPage.notifications = result.data;
        }

        // Charger les lectures
        var readResult = await db
            .from('user_notifications')
            .select('notification_id')
            .eq('user_id', App.profile.id);

        var readIds = [];
        if (readResult.data) {
            for (var i = 0; i < readResult.data.length; i++) {
                readIds.push(readResult.data[i].notification_id);
            }
        }

        // Marquer les lues
        NotificationsPage.unreadCount = 0;
        for (var j = 0; j < NotificationsPage.notifications.length; j++) {
            NotificationsPage.notifications[j]._isRead = readIds.indexOf(NotificationsPage.notifications[j].id) !== -1;
            if (!NotificationsPage.notifications[j]._isRead) {
                NotificationsPage.unreadCount++;
            }
        }

        // Mettre a jour le badge header
        NotificationsPage.updateHeaderBadge();

    } catch (e) {
        console.log('[Notif] Erreur:', e);
    }
};

NotificationsPage.renderList = function() {
    var container = document.getElementById('notif-list');
    if (!container) return;

    // Badge count
    var badge = document.getElementById('notif-count-badge');
    if (badge) {
        if (NotificationsPage.unreadCount > 0) {
            badge.style.display = 'inline';
            badge.textContent = NotificationsPage.unreadCount;
        } else {
            badge.style.display = 'none';
        }
    }

    if (NotificationsPage.notifications.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:48px 16px;color:#6C6C7E;">'
            + '<i class="fas fa-bell-slash" style="font-size:40px;display:block;margin-bottom:16px;color:#4A4A5A;"></i>'
            + '<p style="font-size:14px;">Aucune notification</p>'
            + '</div>';
        return;
    }

    var icons = {
        system: 'fa-bell',
        purchase: 'fa-shopping-cart',
        promo: 'fa-tag',
        affiliate: 'fa-users',
        welcome: 'fa-hand-sparkles',
        update: 'fa-arrow-up'
    };

    var html = '';
    for (var i = 0; i < NotificationsPage.notifications.length; i++) {
        var n = NotificationsPage.notifications[i];
        var isRead = n._isRead;
        var type = n.type || 'system';
        var icon = icons[type] || 'fa-bell';

        html += '<div class="notif-card ' + (isRead ? '' : 'unread') + '" style="animation-delay:' + (i * 0.04) + 's;" onclick="NotificationsPage.markRead(\'' + n.id + '\', this)">';
        html += '<div class="notif-icon-box ' + type + '"><i class="fas ' + icon + '"></i></div>';
        html += '<div class="notif-content">';
        html += '<div class="notif-title">' + (n.title || 'Notification') + '</div>';
        html += '<div class="notif-message">' + (n.message || '') + '</div>';
        html += '<div class="notif-time">' + Utils.timeAgo(n.sent_at) + '</div>';
        html += '</div>';
        if (!isRead) {
            html += '<div class="notif-dot"></div>';
        }
        html += '</div>';
    }

    container.innerHTML = html;
};

NotificationsPage.markRead = async function(notifId, element) {
    try {
        await db.from('user_notifications').insert({
            user_id: App.profile.id,
            notification_id: notifId,
            is_read: true,
            read_at: new Date().toISOString()
        });

        if (element) {
            element.classList.remove('unread');
            var dot = element.querySelector('.notif-dot');
            if (dot) dot.remove();
        }

        NotificationsPage.unreadCount = Math.max(0, NotificationsPage.unreadCount - 1);
        NotificationsPage.updateHeaderBadge();

        var badge = document.getElementById('notif-count-badge');
        if (badge) {
            if (NotificationsPage.unreadCount > 0) {
                badge.textContent = NotificationsPage.unreadCount;
            } else {
                badge.style.display = 'none';
            }
        }
    } catch (e) {
        // Deja lu probablement
    }
};

NotificationsPage.markAllRead = async function() {
    try {
        var inserts = [];
        for (var i = 0; i < NotificationsPage.notifications.length; i++) {
            var n = NotificationsPage.notifications[i];
            if (!n._isRead) {
                inserts.push({
                    user_id: App.profile.id,
                    notification_id: n.id,
                    is_read: true,
                    read_at: new Date().toISOString()
                });
            }
        }

        if (inserts.length > 0) {
            await db.from('user_notifications').insert(inserts);
        }

        NotificationsPage.unreadCount = 0;
        NotificationsPage.updateHeaderBadge();

        // UI
        var cards = document.querySelectorAll('.notif-card.unread');
        for (var j = 0; j < cards.length; j++) {
            cards[j].classList.remove('unread');
            var dot = cards[j].querySelector('.notif-dot');
            if (dot) dot.remove();
        }

        var badge = document.getElementById('notif-count-badge');
        if (badge) badge.style.display = 'none';

        Utils.showToast('Tout marque comme lu', 'success');
    } catch (e) {
        console.log('[Notif] Erreur mark all:', e);
    }
};

NotificationsPage.updateHeaderBadge = function() {
    var headerBadge = document.getElementById('notif-badge');
    if (headerBadge) {
        if (NotificationsPage.unreadCount > 0) {
            headerBadge.style.display = 'flex';
            headerBadge.textContent = NotificationsPage.unreadCount;
        } else {
            headerBadge.style.display = 'none';
        }
    }
};