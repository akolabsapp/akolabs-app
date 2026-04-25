// ============================================
// AKOLABS - Page Formation (Drive)
// ============================================

var FormationDetail = {
    section: null
};

FormationDetail.render = async function(params) {
    var sectionId = params.id;

    try {
        var result = await db
            .from('sections')
            .select('*')
            .eq('id', sectionId)
            .single();

        if (result.error || !result.data) {
            return FormationDetail.renderError('Formation introuvable');
        }

        FormationDetail.section = result.data;
    } catch (e) {
        return FormationDetail.renderError('Erreur de chargement');
    }

    var s = FormationDetail.section;

    // Verifier l'acces
    if (!s.is_free) {
        try {
            var accessResult = await db
                .from('user_sections')
                .select('id')
                .eq('user_id', App.profile.id)
                .eq('section_id', sectionId)
                .eq('is_active', true)
                .maybeSingle();

            if (!accessResult.data) {
                return FormationDetail.renderNoAccess(s);
            }
        } catch (e) {
            return FormationDetail.renderNoAccess(s);
        }
    }

    return FormationDetail.buildPage(s);
};

FormationDetail.buildPage = function(s) {
    var h = '';

    // Back header
    h += '<div class="detail-back-header">';
    h += '<button class="detail-back-btn" onclick="Router.navigate(\'/home\')">';
    h += '<i class="fas fa-arrow-left"></i>';
    h += '</button>';
    h += '<div class="detail-back-title">' + s.title + '</div>';
    h += '</div>';

    // Banner
    h += '<div class="detail-banner" style="margin-left:0;margin-top:0;width:100%;border-radius:14px;overflow:hidden;">';
    if (s.banner_url) {
        h += '<img src="' + s.banner_url + '" alt="">';
    } else {
        h += '<span class="detail-banner-placeholder">📚</span>';
    }
    h += '<div class="detail-banner-overlay"></div>';
    h += '</div>';

    // Title
    h += '<h1 class="detail-title">' + s.title + '</h1>';

    // Meta
    h += '<div class="detail-meta">';
    h += '<span class="detail-meta-item"><i class="fas fa-graduation-cap"></i> AKOLABS Learning</span>';
    if (s.duration_estimate) {
        h += '<span class="detail-meta-item"><i class="fas fa-clock"></i> ' + s.duration_estimate + '</span>';
    }
    if (s.total_users > 0) {
        h += '<span class="detail-meta-item"><i class="fas fa-users"></i> ' + s.total_users + '</span>';
    }
    h += '<span class="detail-meta-item"><i class="fas fa-check-circle" style="color:#28A745;"></i> Acces valide</span>';
    h += '</div>';

    // Description
    h += '<div class="detail-description">' + (s.long_description || s.description || '') + '</div>';

    // Advantages
    if (s.advantages && s.advantages.length > 0) {
        h += '<div class="detail-section">';
        h += '<div class="detail-section-title"><i class="fas fa-check-double"></i> Contenu de la formation</div>';
        for (var j = 0; j < s.advantages.length; j++) {
            h += '<div class="advantage-item">';
            h += '<div class="advantage-icon"><i class="fas fa-check"></i></div>';
            h += '<div class="advantage-text">' + s.advantages[j] + '</div>';
            h += '</div>';
        }
        h += '</div>';
    }

    // Access box
    h += '<div class="access-granted-box">';
    h += '<div class="access-granted-icon"><i class="fas fa-folder-open"></i></div>';
    h += '<div class="access-granted-title">Formation accessible</div>';
    h += '<div class="access-granted-desc">Cliquez sur le bouton ci-dessous pour acceder au contenu de la formation.</div>';

    if (s.drive_url) {
        h += '<button class="btn btn-primary btn-lg btn-block" onclick="FormationDetail.openDrive()">';
        h += '<i class="fab fa-google-drive"></i> Acceder a la formation';
        h += '</button>';
    } else {
        h += '<p style="color:#DC3545;font-size:14px;">Lien de formation non configure. Contactez le support.</p>';
    }

    h += '<p style="color:#6C6C7E;font-size:11px;margin-top:12px;">';
    h += '<i class="fas fa-info-circle"></i> La formation s\'ouvrira dans votre navigateur via Google Drive';
    h += '</p>';
    h += '</div>';

    // Retour
    h += '<button class="btn btn-secondary btn-block" style="margin-top:16px;" onclick="Router.navigate(\'/home\')">';
    h += '<i class="fas fa-home"></i> Retour a l\'accueil';
    h += '</button>';

    h += '<div style="height:32px;"></div>';

    return h;
};

FormationDetail.init = async function(params) {
    var s = FormationDetail.section;
    if (!s) return;

    // Tracker
    try {
        await db.from('app_analytics').insert({
            event_type: 'formation_open',
            user_id: App.profile.id,
            section_id: s.id,
            metadata: { title: s.title }
        });
    } catch (e) {}
};

FormationDetail.openDrive = function() {
    var s = FormationDetail.section;
    if (!s || !s.drive_url) {
        Utils.showToast('Lien non disponible', 'error');
        return;
    }

    // Tracker le clic
    try {
        db.from('app_analytics').insert({
            event_type: 'drive_open',
            user_id: App.profile.id,
            section_id: s.id,
            metadata: { title: s.title }
        });
    } catch (e) {}

    window.open(s.drive_url, '_blank');
    Utils.vibrate(50);
};

FormationDetail.renderNoAccess = function(s) {
    var h = '';
    h += '<div style="text-align:center;padding:60px 20px;">';
    h += '<div style="font-size:48px;color:#D4AF37;margin-bottom:16px;"><i class="fas fa-lock"></i></div>';
    h += '<h2 style="font-family:Cinzel,serif;color:#D4AF37;font-size:20px;margin-bottom:8px;">Acces requis</h2>';
    h += '<p style="color:#8E8E9E;font-size:14px;margin-bottom:24px;">Debloquez cette formation pour y acceder.</p>';
    h += '<button class="btn btn-primary btn-lg" onclick="Router.navigate(\'/section/' + s.id + '\')">';
    h += '<i class="fas fa-crown"></i> Debloquer</button>';
    h += '<button class="btn btn-secondary" style="margin-top:8px;" onclick="Router.navigate(\'/home\')">';
    h += '<i class="fas fa-home"></i> Retour</button>';
    h += '</div>';
    return h;
};

FormationDetail.renderError = function(msg) {
    var h = '';
    h += '<div style="text-align:center;padding:60px 20px;">';
    h += '<div style="font-size:48px;color:#DC3545;margin-bottom:16px;"><i class="fas fa-exclamation-triangle"></i></div>';
    h += '<h2 style="color:#F8F9FA;font-size:18px;margin-bottom:8px;">Erreur</h2>';
    h += '<p style="color:#8E8E9E;font-size:14px;margin-bottom:24px;">' + msg + '</p>';
    h += '<button class="btn btn-primary" onclick="Router.navigate(\'/home\')"><i class="fas fa-home"></i> Retour</button>';
    h += '</div>';
    return h;
};