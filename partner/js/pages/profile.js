// ============================================
// AKOLABS - Page Profil
// ============================================

var ProfilePage = {};

ProfilePage.render = async function() {
    var p = App.profile;
    var name = p.full_name || 'Utilisateur';
    var email = p.email || '';
    var phone = p.phone || 'Non renseigne';
    var level = p.level || 'Bronze';
    var avatar = p.avatar_url || CONFIG.DEFAULT_AVATAR;
    var streak = p.login_streak || 0;
    var totalSpent = p.total_spent || 0;

    var levelIcons = { Bronze: 'fa-medal', Silver: 'fa-medal', Gold: 'fa-crown', Diamond: 'fa-gem' };
    var levelIcon = levelIcons[level] || 'fa-medal';

    var memberSince = p.created_at ? Utils.formatDate(p.created_at) : '-';

    var h = '';

    // Header
    h += '<div class="profile-page-header">';
    h += '<div class="profile-avatar-wrapper">';
    h += '<img src="' + avatar + '" class="profile-avatar-img" alt="" onerror="this.src=CONFIG.DEFAULT_AVATAR">';
    h += '<div class="profile-avatar-edit" onclick="ProfilePage.changeAvatar()"><i class="fas fa-camera"></i></div>';
    h += '</div>';
    h += '<div class="profile-name">' + name + '</div>';
    h += '<div class="profile-email">' + email + '</div>';
    h += '<div class="profile-level-badge"><i class="fas ' + levelIcon + '"></i> ' + level + '</div>';
    h += '</div>';

    // Stats
    h += '<div class="profile-stats-row">';
    h += '<div class="profile-stat"><div class="profile-stat-value">' + streak + '</div><div class="profile-stat-label">Jours streak</div></div>';
    h += '<div class="profile-stat"><div class="profile-stat-value">' + Utils.formatPrice(totalSpent) + '</div><div class="profile-stat-label">Total depense</div></div>';
    h += '<div class="profile-stat"><div class="profile-stat-value" id="profile-sections-count">-</div><div class="profile-stat-label">Sections</div></div>';
    h += '</div>';

    // Menu
    h += '<div class="profile-menu">';

    // Compte
    h += '<div class="profile-menu-section">';
    h += '<div class="profile-menu-section-title">Compte</div>';

    h += '<div class="profile-menu-item" onclick="ProfilePage.editName()">';
    h += '<div class="profile-menu-icon"><i class="fas fa-user"></i></div>';
    h += '<div class="profile-menu-text"><div class="profile-menu-label">Nom complet</div><div class="profile-menu-sub">' + name + '</div></div>';
    h += '<div class="profile-menu-arrow"><i class="fas fa-chevron-right"></i></div>';
    h += '</div>';

    h += '<div class="profile-menu-item" onclick="ProfilePage.editPhone()">';
    h += '<div class="profile-menu-icon"><i class="fas fa-phone"></i></div>';
    h += '<div class="profile-menu-text"><div class="profile-menu-label">Telephone</div><div class="profile-menu-sub">' + phone + '</div></div>';
    h += '<div class="profile-menu-arrow"><i class="fas fa-chevron-right"></i></div>';
    h += '</div>';

    h += '<div class="profile-menu-item" onclick="ProfilePage.changePassword()">';
    h += '<div class="profile-menu-icon"><i class="fas fa-lock"></i></div>';
    h += '<div class="profile-menu-text"><div class="profile-menu-label">Mot de passe</div><div class="profile-menu-sub">Modifier le mot de passe</div></div>';
    h += '<div class="profile-menu-arrow"><i class="fas fa-chevron-right"></i></div>';
    h += '</div>';

    h += '</div>';

    // Activite
    h += '<div class="profile-menu-section">';
    h += '<div class="profile-menu-section-title">Activite</div>';

    h += '<div class="profile-menu-item" onclick="ProfilePage.showPurchases()">';
    h += '<div class="profile-menu-icon"><i class="fas fa-receipt"></i></div>';
    h += '<div class="profile-menu-text"><div class="profile-menu-label">Historique d\'achats</div><div class="profile-menu-sub">Voir tous vos achats</div></div>';
    h += '<div class="profile-menu-arrow"><i class="fas fa-chevron-right"></i></div>';
    h += '</div>';

    h += '<div class="profile-menu-item" onclick="Router.navigate(\'/affiliation\')">';
    h += '<div class="profile-menu-icon"><i class="fas fa-users"></i></div>';
    h += '<div class="profile-menu-text"><div class="profile-menu-label">Affiliation</div><div class="profile-menu-sub">Code : ' + (p.affiliate_code || '-') + '</div></div>';
    h += '<div class="profile-menu-arrow"><i class="fas fa-chevron-right"></i></div>';
    h += '</div>';

    h += '</div>';

    // Infos
    h += '<div class="profile-menu-section">';
    h += '<div class="profile-menu-section-title">Informations</div>';

    h += '<div class="profile-menu-item">';
    h += '<div class="profile-menu-icon"><i class="fas fa-calendar"></i></div>';
    h += '<div class="profile-menu-text"><div class="profile-menu-label">Membre depuis</div><div class="profile-menu-sub">' + memberSince + '</div></div>';
    h += '</div>';

    h += '<div class="profile-menu-item">';
    h += '<div class="profile-menu-icon"><i class="fas fa-mobile-alt"></i></div>';
    h += '<div class="profile-menu-text"><div class="profile-menu-label">Appareil lie</div><div class="profile-menu-sub">Cet appareil</div></div>';
    h += '</div>';

    h += '</div>';

    // App - Afficher uniquement si pas encore installée
    var isStandalone = window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true;

    // Push status
    var pushStatus = (typeof Push !== 'undefined') ? Push.getStatus() : 'unsupported';
    var pushLabel = pushStatus === 'enabled' ? 'Notifications activées' : 'Activer les notifications';
    var pushSub = pushStatus === 'enabled' ? 'Vous recevez les alertes AKOLABS' : pushStatus === 'denied' ? 'Bloquées dans les paramètres' : 'Restez informé des offres';
    var pushIcon = pushStatus === 'enabled' ? 'fa-bell' : pushStatus === 'denied' ? 'fa-bell-slash' : 'fa-bell';
    var pushColor = pushStatus === 'enabled' ? '#2E9E5B' : pushStatus === 'denied' ? '#D93B3B' : '#4B0082';
    var pushAction = pushStatus === 'enabled' ? 'Push.unsubscribe().then(function(){Router.navigate(\'/profile\')})' : pushStatus === 'denied' ? '' : 'Push.requestPermission()';

    h += '<div class="profile-menu-section">';
    h += '<div class="profile-menu-section-title">Application</div>';

    if (pushStatus !== 'unsupported') {
        h += '<div class="profile-menu-item"' + (pushAction ? ' onclick="' + pushAction + '"' : '') + '>';
        h += '<div class="profile-menu-icon" style="background:rgba(75,0,130,0.08);"><i class="fas ' + pushIcon + '" style="color:' + pushColor + ';"></i></div>';
        h += '<div class="profile-menu-text"><div class="profile-menu-label">' + pushLabel + '</div><div class="profile-menu-sub">' + pushSub + '</div></div>';
        if (pushAction) h += '<div class="profile-menu-arrow"><i class="fas fa-chevron-right"></i></div>';
        h += '</div>';
    }

    if (!isStandalone) {
        h += '<div class="profile-menu-item" onclick="PWA.triggerFromProfile()">';
        h += '<div class="profile-menu-icon" style="background:rgba(75,0,130,0.08);"><i class="fas fa-download" style="color:#4B0082;"></i></div>';
        h += '<div class="profile-menu-text"><div class="profile-menu-label">Installer l\'application</div><div class="profile-menu-sub">Ajouter AKOLABS à l\'écran d\'accueil</div></div>';
        h += '<div class="profile-menu-arrow"><i class="fas fa-chevron-right"></i></div>';
        h += '</div>';
    }

    h += '</div>';

    // Support
    h += '<div class="profile-menu-section">';
    h += '<div class="profile-menu-section-title">Support</div>';

    h += '<div class="profile-menu-item" onclick="ProfilePage.openSupport()">';
    h += '<div class="profile-menu-icon" style="background:rgba(37,211,102,0.1);"><i class="fab fa-whatsapp" style="color:#25D366;font-size:18px;"></i></div>';
    h += '<div class="profile-menu-text"><div class="profile-menu-label">Contacter le support</div><div class="profile-menu-sub">Réponse rapide via WhatsApp</div></div>';
    h += '<div class="profile-menu-arrow"><i class="fas fa-chevron-right"></i></div>';
    h += '</div>';

    h += '</div>';

    // Danger zone
    h += '<div class="profile-menu-section">';
    h += '<div class="profile-menu-section-title">Session</div>';

    h += '<div class="profile-menu-item" onclick="ProfilePage.confirmLogout()">';
    h += '<div class="profile-menu-icon danger"><i class="fas fa-sign-out-alt"></i></div>';
    h += '<div class="profile-menu-text"><div class="profile-menu-label" style="color:#DC3545;">Se deconnecter</div><div class="profile-menu-sub">Fermer votre session</div></div>';
    h += '<div class="profile-menu-arrow"><i class="fas fa-chevron-right"></i></div>';
    h += '</div>';

    h += '</div>';

    // Version
    h += '<div class="profile-version">AKOLABS v' + CONFIG.APP_VERSION + '</div>';

    h += '<div style="height:32px;"></div>';

    return h;
};

ProfilePage.init = async function() {
    // Compter les sections debloquees
    try {
        var result = await db
            .from('user_sections')
            .select('id')
            .eq('user_id', App.profile.id)
            .eq('is_active', true);

        var el = document.getElementById('profile-sections-count');
        if (el && result.data) {
            el.textContent = result.data.length;
        }
    } catch (e) {}
};

ProfilePage.editName = function() {
    var current = App.profile.full_name || '';

    var h = '';
    h += '<div style="padding:8px 0;">';
    h += '<h3 style="font-family:Cinzel,serif;color:#D4AF37;margin-bottom:16px;">Modifier le nom</h3>';
    h += '<div class="input-group"><label class="input-label">Nom complet</label>';
    h += '<input type="text" class="input-field" id="edit-name" value="' + current + '" placeholder="Votre nom"></div>';
    h += '<button class="btn btn-primary btn-block" onclick="ProfilePage.saveName()"><i class="fas fa-check"></i> Enregistrer</button>';
    h += '</div>';

    Utils.openBottomSheet(h);
};

ProfilePage.saveName = async function() {
    var input = document.getElementById('edit-name');
    var name = input ? input.value.trim() : '';

    if (!name || name.length < 2) {
        Utils.showToast('Nom trop court', 'warning');
        return;
    }

    try {
        await db.from('users').update({ full_name: name }).eq('id', App.profile.id);
        App.profile.full_name = name;
        Utils.closeBottomSheet();
        Utils.showToast('Nom mis a jour !', 'success');
        Router.navigate('/profile');
    } catch (e) {
        Utils.showToast('Erreur', 'error');
    }
};

ProfilePage.editPhone = function() {
    var current = App.profile.phone || '';

    var h = '';
    h += '<div style="padding:8px 0;">';
    h += '<h3 style="font-family:Cinzel,serif;color:#D4AF37;margin-bottom:16px;">Modifier le telephone</h3>';
    h += '<div class="input-group"><label class="input-label">Numero</label>';
    h += '<input type="tel" class="input-field" id="edit-phone" value="' + current + '" placeholder="+229 XX XX XX XX"></div>';
    h += '<button class="btn btn-primary btn-block" onclick="ProfilePage.savePhone()"><i class="fas fa-check"></i> Enregistrer</button>';
    h += '</div>';

    Utils.openBottomSheet(h);
};

ProfilePage.savePhone = async function() {
    var input = document.getElementById('edit-phone');
    var phone = input ? input.value.trim() : '';

    if (!phone) {
        Utils.showToast('Numero requis', 'warning');
        return;
    }

    try {
        await db.from('users').update({ phone: phone }).eq('id', App.profile.id);
        App.profile.phone = phone;
        Utils.closeBottomSheet();
        Utils.showToast('Telephone mis a jour !', 'success');
        Router.navigate('/profile');
    } catch (e) {
        Utils.showToast('Erreur', 'error');
    }
};

ProfilePage.changePassword = function() {
    var h = '';
    h += '<div style="padding:8px 0;">';
    h += '<h3 style="font-family:Cinzel,serif;color:#D4AF37;margin-bottom:16px;">Changer le mot de passe</h3>';
    h += '<div class="input-group"><label class="input-label">Nouveau mot de passe</label>';
    h += '<input type="password" class="input-field" id="new-password" placeholder="Minimum 6 caracteres"></div>';
    h += '<div class="input-group"><label class="input-label">Confirmer</label>';
    h += '<input type="password" class="input-field" id="confirm-password" placeholder="Retapez le mot de passe"></div>';
    h += '<button class="btn btn-primary btn-block" onclick="ProfilePage.savePassword()"><i class="fas fa-check"></i> Changer</button>';
    h += '</div>';

    Utils.openBottomSheet(h);
};

ProfilePage.savePassword = async function() {
    var pwd1 = document.getElementById('new-password');
    var pwd2 = document.getElementById('confirm-password');
    var password = pwd1 ? pwd1.value : '';
    var confirm = pwd2 ? pwd2.value : '';

    if (password.length < 6) {
        Utils.showToast('Minimum 6 caracteres', 'warning');
        return;
    }

    if (password !== confirm) {
        Utils.showToast('Les mots de passe ne correspondent pas', 'error');
        return;
    }

    try {
        var result = await db.auth.updateUser({ password: password });
        if (result.error) throw result.error;

        Utils.closeBottomSheet();
        Utils.showToast('Mot de passe change !', 'success');
    } catch (e) {
        Utils.showToast('Erreur: ' + (e.message || 'Reessayez'), 'error');
    }
};

ProfilePage.showPurchases = async function() {
    try {
        var result = await db
            .from('purchases')
            .select('*')
            .eq('user_id', App.profile.id)
            .eq('status', 'confirmed')
            .order('created_at', { ascending: false });

        var items = result.data || [];

        var h = '';
        h += '<div style="padding:8px 0;">';
        h += '<h3 style="font-family:Cinzel,serif;color:#D4AF37;margin-bottom:16px;">Historique d\'achats</h3>';

        if (items.length === 0) {
            h += '<p style="color:#8E8E9E;text-align:center;padding:24px;">Aucun achat</p>';
        } else {
            for (var i = 0; i < items.length; i++) {
                var p = items[i];
                var typeLabel = p.purchase_type === 'app_access' ? 'Acces App' : 'Section';
                var icon = p.purchase_type === 'app_access' ? 'fa-mobile-alt' : 'fa-unlock';

                h += '<div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.05);">';
                h += '<div style="width:40px;height:40px;background:rgba(40,167,69,0.12);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#28A745;"><i class="fas ' + icon + '"></i></div>';
                h += '<div style="flex:1;"><div style="font-size:14px;font-weight:600;color:#F8F9FA;">' + typeLabel + '</div>';
                h += '<div style="font-size:11px;color:#6C6C7E;">' + Utils.formatDate(p.created_at) + '</div></div>';
                h += '<div style="font-size:14px;font-weight:700;color:#D4AF37;">' + Utils.formatPrice(p.amount) + '</div>';
                h += '</div>';
            }
        }

        h += '</div>';

        Utils.openBottomSheet(h);

    } catch (e) {
        Utils.showToast('Erreur de chargement', 'error');
    }
};

ProfilePage.changeAvatar = function() {
    // Creer un input file invisible
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async function(e) {
        var file = e.target.files[0];
        if (!file) return;

        Utils.showToast('Telechargement de l\'image...', 'info');
        
        // Mettre un effet de chargement sur l'avatar
        var avatarImg = document.querySelector('.profile-avatar-img');
        if (avatarImg) avatarImg.style.opacity = '0.5';

        try {
            // 1. Envoyer sur Cloudinary
            var imageUrl = await Utils.uploadToCloudinary(file);

            // 2. Sauvegarder dans Supabase
            await db.from('users').update({ avatar_url: imageUrl }).eq('id', App.profile.id);
            
            // 3. Mettre a jour l'interface
            App.profile.avatar_url = imageUrl;
            App.updateHeader();
            
            if (avatarImg) {
                avatarImg.src = imageUrl;
                avatarImg.style.opacity = '1';
            }
            
            Utils.showToast('Photo de profil mise a jour !', 'success');
        } catch (err) {
            if (avatarImg) avatarImg.style.opacity = '1';
            Utils.showToast('Erreur lors du telechargement', 'error');
        }
    };

    // Ouvrir la galerie
    input.click();
};
ProfilePage.confirmLogout = function() {
    var h = '';
    h += '<div style="text-align:center;padding:20px 0;">';
    h += '<div style="font-size:48px;margin-bottom:16px;">👋</div>';
    h += '<h3 style="font-family:Cinzel,serif;color:#DC3545;margin-bottom:8px;">Se deconnecter ?</h3>';
    h += '<p style="color:#AEAEBE;font-size:14px;margin-bottom:24px;">Vous devrez vous reconnecter pour acceder a AKOLABS.</p>';
    h += '<button class="btn btn-danger btn-block" onclick="Utils.closeBottomSheet(); App.logout();"><i class="fas fa-sign-out-alt"></i> Se deconnecter</button>';
    h += '<button class="btn btn-secondary btn-block" style="margin-top:8px;" onclick="Utils.closeBottomSheet();">Annuler</button>';
    h += '</div>';

    Utils.openBottomSheet(h);
};
ProfilePage.openSupport = function() {
    var p = App.profile || {};
    var name = p.full_name || '';

    // Étape 1 : explication avant le formulaire
    var h = '';
    h += '<div style="text-align:center;padding:8px 0 4px;">';
    h += '<div style="font-size:40px;margin-bottom:10px;">💬</div>';
    h += '<div style="font-family:Cinzel,serif;font-size:17px;font-weight:700;color:#4B0082;margin-bottom:6px;">Contacter le support</div>';
    h += '<p style="font-size:13px;color:#4A4767;line-height:1.6;margin-bottom:16px;">Remplis le formulaire ci-dessous. En cliquant sur <strong>Envoyer</strong>, WhatsApp va s\'ouvrir avec ton message déjà rédigé — il ne te restera qu\'à appuyer sur <strong style="color:#25D366;">Envoyer</strong> dans WhatsApp.</p>';
    h += '</div>';

    h += '<div style="background:rgba(37,211,102,0.07);border:1px solid rgba(37,211,102,0.2);border-radius:12px;padding:12px 14px;margin-bottom:16px;display:flex;align-items:center;gap:10px;">';
    h += '<i class="fab fa-whatsapp" style="color:#25D366;font-size:22px;flex-shrink:0;"></i>';
    h += '<div style="font-size:12px;color:#2E7D32;line-height:1.5;">Le message sera envoyé au numéro officiel du support AKOLABS. Vous recevrez une réponse dans les plus brefs délais.</div>';
    h += '</div>';

    h += '<div class="input-group" style="margin-bottom:10px;">';
    h += '<label class="input-label">Nom complet *</label>';
    h += '<input type="text" class="input-field" id="sup-name" value="' + name.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '" placeholder="Ex: Jean Dupont">';
    h += '</div>';

    h += '<div class="input-group" style="margin-bottom:10px;">';
    h += '<label class="input-label">Sujet *</label>';
    h += '<select class="input-field" id="sup-subject">';
    h += '<option value="">-- Choisir un sujet --</option>';
    h += '<option value="Problème de connexion">Problème de connexion</option>';
    h += '<option value="Problème de paiement">Problème de paiement</option>';
    h += '<option value="Accès à une section">Accès à une section</option>';
    h += '<option value="Affiliation / parrainage">Affiliation / parrainage</option>';
    h += '<option value="Problème technique">Problème technique</option>';
    h += '<option value="Autre demande">Autre demande</option>';
    h += '</select>';
    h += '</div>';

    h += '<div class="input-group" style="margin-bottom:16px;">';
    h += '<label class="input-label">Votre message *</label>';
    h += '<textarea class="input-field" id="sup-message" rows="4" placeholder="Décrivez votre problème ou votre question en détail..." style="resize:none;min-height:100px;"></textarea>';
    h += '</div>';

    h += '<button class="btn btn-primary btn-block" onclick="ProfilePage.sendSupport()" style="background:linear-gradient(135deg,#25D366,#1DA851);border:none;">';
    h += '<i class="fab fa-whatsapp"></i> Ouvrir WhatsApp et envoyer';
    h += '</button>';
    h += '<button class="btn btn-secondary btn-block" style="margin-top:8px;" onclick="Utils.closeBottomSheet()">Annuler</button>';

    Utils.openBottomSheet(h);
};

ProfilePage.sendSupport = function() {
    var name = (document.getElementById('sup-name') || {}).value || '';
    var subject = (document.getElementById('sup-subject') || {}).value || '';
    var message = (document.getElementById('sup-message') || {}).value || '';

    name = name.trim();
    subject = subject.trim();
    message = message.trim();

    if (!name) { Utils.showToast('Veuillez indiquer votre nom', 'warning'); return; }
    if (!subject) { Utils.showToast('Veuillez choisir un sujet', 'warning'); return; }
    if (!message) { Utils.showToast('Veuillez écrire votre message', 'warning'); return; }

    var p = App.profile || {};
    var userId = p.id ? ('ID: ' + p.id.slice(0, 8) + '...') : '';
    var email = p.email || App.user && App.user.email || '';

    var text = '🟣 *SUPPORT AKOLABS*\n\n';
    text += '👤 *Nom :* ' + name + '\n';
    if (email) text += '📧 *Email :* ' + email + '\n';
    if (userId) text += '🔑 *' + userId + '*\n';
    text += '📌 *Sujet :* ' + subject + '\n\n';
    text += '💬 *Message :*\n' + message;

    var encoded = encodeURIComponent(text);
    var url = 'https://wa.me/2290155956693?text=' + encoded;

    Utils.closeBottomSheet();
    window.open(url, '_blank');
};
