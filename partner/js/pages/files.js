// ============================================
// AKOLABS - Page Fichiers
// ============================================

var FilesPage = {
    files: [],
    currentFilter: 'all'
};

FilesPage.render = async function() {
    var h = '';

    // Header
    h += '<div class="files-header">';
    h += '<div class="files-header-icon"><i class="fas fa-folder-open"></i></div>';
    h += '<div class="files-header-title">Mes Fichiers</div>';
    h += '<div class="files-header-desc">Fichiers telecharges dans l\'app (disponibles hors ligne)</div>';
    h += '</div>';

    // Storage bar
    h += '<div class="files-storage-bar">';
    h += '<div class="files-storage-info">';
    h += '<span>Espace utilise</span>';
    h += '<strong id="files-storage-used">Calcul...</strong>';
    h += '</div>';
    h += '<div class="progress-bar"><div class="progress-fill" id="files-storage-fill" style="width:0%"></div></div>';
    h += '</div>';

    // Filter tabs
    h += '<div class="files-filter-tabs">';
    h += '<button class="files-filter-tab active" data-filter="all" onclick="FilesPage.setFilter(\'all\', this)"><i class="fas fa-th"></i> Tous</button>';
    h += '<button class="files-filter-tab" data-filter="pdf" onclick="FilesPage.setFilter(\'pdf\', this)"><i class="fas fa-file-pdf"></i> PDF</button>';
    h += '<button class="files-filter-tab" data-filter="doc" onclick="FilesPage.setFilter(\'doc\', this)"><i class="fas fa-file-word"></i> Docs</button>';
    h += '<button class="files-filter-tab" data-filter="video" onclick="FilesPage.setFilter(\'video\', this)"><i class="fas fa-file-video"></i> Videos</button>';
    h += '<button class="files-filter-tab" data-filter="image" onclick="FilesPage.setFilter(\'image\', this)"><i class="fas fa-file-image"></i> Images</button>';
    h += '<button class="files-filter-tab" data-filter="apk" onclick="FilesPage.setFilter(\'apk\', this)"><i class="fab fa-android"></i> APK</button>';
    h += '</div>';

    // Files list
    h += '<div id="files-list"></div>';

    h += '<div style="height:32px;"></div>';

    return h;
};

FilesPage.init = async function() {
    await FilesPage.loadFiles();
    FilesPage.renderFiles();
    FilesPage.updateStorageInfo();

    try {
        await db.from('app_analytics').insert({
            event_type: 'page_view',
            user_id: App.profile.id,
            metadata: { page: 'files' }
        });
    } catch (e) {}
};

FilesPage.loadFiles = async function() {
    try {
        FilesPage.files = await FileStorage.getAllFiles(App.profile.id);
        // Trier par date (plus recent en premier)
        FilesPage.files.sort(function(a, b) {
            return new Date(b.savedAt) - new Date(a.savedAt);
        });
    } catch (e) {
        console.log('[Files] Erreur chargement:', e);
        FilesPage.files = [];
    }
};

FilesPage.renderFiles = function() {
    var container = document.getElementById('files-list');
    if (!container) return;

    var filtered = FilesPage.files;
    if (FilesPage.currentFilter !== 'all') {
        filtered = [];
        for (var i = 0; i < FilesPage.files.length; i++) {
            if (FilesPage.files[i].fileType === FilesPage.currentFilter) {
                filtered.push(FilesPage.files[i]);
            }
        }
    }

    if (filtered.length === 0) {
        var msg = FilesPage.currentFilter === 'all'
            ? 'Aucun fichier telecharge.<br>Les fichiers telecharges depuis les sections seront stockes ici.'
            : 'Aucun fichier de ce type.';

        container.innerHTML = '<div style="text-align:center;padding:48px 16px;color:#6C6C7E;">'
            + '<i class="fas fa-folder-open" style="font-size:40px;display:block;margin-bottom:16px;color:#4A4A5A;"></i>'
            + '<p style="font-size:14px;line-height:1.6;">' + msg + '</p>'
            + '</div>';
        return;
    }

    var html = '';
    for (var j = 0; j < filtered.length; j++) {
        var f = filtered[j];
        var cat = f.fileType || 'other';
        var icon = FileStorage.getFileIcon(cat);
        var size = FileStorage.formatSize(f.fileSize || 0);
        var date = Utils.timeAgo(f.savedAt);

        html += '<div class="file-card" style="animation-delay:' + (j * 0.05) + 's;">';
        html += '<div class="file-icon ' + cat + '"><i class="fas ' + icon + '"></i></div>';
        html += '<div class="file-info">';
        html += '<div class="file-name">' + (f.fileName || 'Fichier') + '</div>';
        html += '<div class="file-meta">';
        html += '<span>' + size + '</span>';
        html += '<span>' + date + '</span>';
        if (f.sectionTitle) {
            html += '<span>' + f.sectionTitle + '</span>';
        }
        html += '</div>';
        html += '</div>';
        html += '<div class="file-actions">';
        html += '<button class="file-action-btn view" onclick="FilesPage.viewFile(\'' + f.id + '\')" title="Voir"><i class="fas fa-eye"></i></button>';
        html += '<button class="file-action-btn delete" onclick="FilesPage.confirmDelete(\'' + f.id + '\')" title="Supprimer"><i class="fas fa-trash"></i></button>';
        html += '</div>';
        html += '</div>';
    }

    container.innerHTML = html;
};

FilesPage.setFilter = function(filter, btn) {
    FilesPage.currentFilter = filter;

    // UI des tabs
    var tabs = document.querySelectorAll('.files-filter-tab');
    for (var i = 0; i < tabs.length; i++) {
        tabs[i].classList.remove('active');
    }
    if (btn) btn.classList.add('active');

    FilesPage.renderFiles();
    Utils.vibrate(20);
};

FilesPage.updateStorageInfo = async function() {
    try {
        var totalSize = await FileStorage.getTotalSize(App.profile.id);
        var maxSize = 500 * 1024 * 1024; // 500 Mo
        var percent = Math.min(100, Math.round((totalSize / maxSize) * 100));

        var usedEl = document.getElementById('files-storage-used');
        var fillEl = document.getElementById('files-storage-fill');

        if (usedEl) usedEl.textContent = FileStorage.formatSize(totalSize) + ' / 500 Mo';
        if (fillEl) {
            setTimeout(function() { fillEl.style.width = percent + '%'; }, 300);
        }
    } catch (e) {}
};

FilesPage.viewFile = async function(fileId) {
    try {
        var file = await FileStorage.getFile(fileId);
        if (!file || !file.blob) {
            Utils.showToast('Fichier introuvable', 'error');
            return;
        }

        var url = URL.createObjectURL(file.blob);
        var cat = file.fileType || 'other';

        var contentHTML = '';

        if (cat === 'image') {
            contentHTML = '<img src="' + url + '" alt="' + file.fileName + '">';
        } else if (cat === 'video') {
            contentHTML = '<video src="' + url + '" controls autoplay style="max-width:100%;max-height:100%;border-radius:10px;"></video>';
        } else if (cat === 'pdf') {
            contentHTML = '<iframe src="' + url + '" style="width:100%;height:100%;border:none;border-radius:10px;"></iframe>';
        } else {
            contentHTML = '<div style="text-align:center;color:#8E8E9E;">'
                + '<i class="fas fa-file" style="font-size:64px;color:#D4AF37;margin-bottom:16px;display:block;"></i>'
                + '<p>' + file.fileName + '</p>'
                + '<p style="font-size:12px;margin-top:8px;">' + FileStorage.formatSize(file.fileSize) + '</p>'
                + '</div>';
        }

        // Creer le viewer
        var viewer = document.createElement('div');
        viewer.className = 'file-viewer';
        viewer.id = 'file-viewer';

        viewer.innerHTML = ''
            + '<div class="file-viewer-header">'
            + '<button class="file-viewer-close" onclick="FilesPage.closeViewer()"><i class="fas fa-arrow-left"></i></button>'
            + '<div class="file-viewer-title">' + file.fileName + '</div>'
            + '<button class="file-viewer-close" onclick="FilesPage.closeViewer()"><i class="fas fa-times"></i></button>'
            + '</div>'
            + '<div class="file-viewer-content">' + contentHTML + '</div>';

        document.body.appendChild(viewer);

    } catch (e) {
        console.log('[Files] Erreur viewer:', e);
        Utils.showToast('Impossible d\'ouvrir le fichier', 'error');
    }
};

FilesPage.closeViewer = function() {
    var viewer = document.getElementById('file-viewer');
    if (viewer) viewer.remove();

    // Revoquer les URLs blob
    var blobs = document.querySelectorAll('[src^="blob:"]');
    for (var i = 0; i < blobs.length; i++) {
        URL.revokeObjectURL(blobs[i].src);
    }
};

FilesPage.confirmDelete = function(fileId) {
    var h = '';
    h += '<div style="text-align:center;padding:20px 0;">';
    h += '<div style="font-size:48px;margin-bottom:16px;">🗑️</div>';
    h += '<h3 style="font-family:Cinzel,serif;color:#DC3545;margin-bottom:8px;">Supprimer ce fichier ?</h3>';
    h += '<p style="color:#AEAEBE;font-size:14px;margin-bottom:24px;">Cette action est irreversible.</p>';
    h += '<button class="btn btn-danger btn-block" onclick="FilesPage.deleteFile(\'' + fileId + '\'); Utils.closeBottomSheet();">';
    h += '<i class="fas fa-trash"></i> Supprimer</button>';
    h += '<button class="btn btn-secondary btn-block" style="margin-top:8px;" onclick="Utils.closeBottomSheet();">Annuler</button>';
    h += '</div>';

    Utils.openBottomSheet(h);
};

FilesPage.deleteFile = async function(fileId) {
    try {
        await FileStorage.deleteFile(fileId);
        Utils.showToast('Fichier supprime', 'success');
        Utils.vibrate(50);

        // Recharger
        await FilesPage.loadFiles();
        FilesPage.renderFiles();
        FilesPage.updateStorageInfo();
    } catch (e) {
        Utils.showToast('Erreur de suppression', 'error');
    }
};