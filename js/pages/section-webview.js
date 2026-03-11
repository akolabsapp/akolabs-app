// ============================================
// AKOLABS - WebView 100% Automatique
// Direct → Proxy Render → Navigateur externe
// Tout est invisible pour l'utilisateur
// ============================================

var SectionWebview = {
    section: null,
    iframe: null,
    loadTimeout: null,
    iframeLoaded: false,
    usingProxy: false,
    _downloadCheckInterval: null,
    PROXY_URL: 'https://akolabs-proxy.onrender.com/proxy?url='
};

SectionWebview.render = async function(params) {
    var sectionId = params.id;

    try {
        var result = await db
            .from('sections')
            .select('*')
            .eq('id', sectionId)
            .single();

        if (result.error || !result.data) return SectionWebview.renderError('Section introuvable');
        SectionWebview.section = result.data;
    } catch (e) {
        return SectionWebview.renderError('Erreur de chargement');
    }

    var s = SectionWebview.section;

    if (!s.is_free) {
        try {
            var accessResult = await db
                .from('user_sections')
                .select('id')
                .eq('user_id', App.profile.id)
                .eq('section_id', sectionId)
                .eq('is_active', true)
                .maybeSingle();
            if (!accessResult.data) return SectionWebview.renderNoAccess(s);
        } catch (e) {
            return SectionWebview.renderNoAccess(s);
        }
    }

    if (!s.site_url) return SectionWebview.renderError('Aucun site configure pour cette section');

    var logoSrc = s.custom_logo_url || 'assets/images/logo.png';
    var displayName = s.custom_name || s.title;

    var h = '';
    h += '<div class="webview-page" id="webview-page">';

    // Header simplifie - plus de bouton proxy
    h += '<div class="webview-header">';
    h += '<button class="webview-back-btn" onclick="SectionWebview.goBack()"><i class="fas fa-arrow-left"></i></button>';
    h += '<img src="' + logoSrc + '" class="webview-logo" alt="" onerror="this.style.display=\'none\'">';
    h += '<div class="webview-title-area">';
    h += '<div class="webview-title">' + displayName + '</div>';
    h += '<div class="webview-subtitle" id="webview-subtitle">AKOLABS Universe</div>';
    h += '</div>';
    h += '<div class="webview-actions">';
    h += '<button class="webview-action-btn" onclick="SectionWebview.refreshPage()"><i class="fas fa-redo"></i></button>';
    h += '<button class="webview-action-btn" onclick="SectionWebview.openExternal()"><i class="fas fa-external-link-alt"></i></button>';
    h += '<button class="webview-action-btn" onclick="SectionWebview.goHome()"><i class="fas fa-home"></i></button>';
    h += '</div>';
    h += '</div>';

    // Barre de telechargement (cachee par defaut)
    h += '<div class="webview-download-bar" id="webview-download-bar" style="display:none;">';
    h += '<div class="webview-download-info"><i class="fas fa-download" style="color:#D4AF37;margin-right:8px;"></i>';
    h += '<span id="webview-download-filename">Telechargement...</span></div>';
    h += '<div class="webview-download-progress-wrap">';
    h += '<div class="webview-download-progress-bar"><div class="webview-download-progress-fill" id="webview-download-fill" style="width:0%"></div></div>';
    h += '<span class="webview-download-percent" id="webview-download-percent">0%</span>';
    h += '</div></div>';

    // Iframe container
    h += '<div class="webview-iframe-container" id="webview-container">';
    h += '<div class="webview-loader" id="webview-loader">';
    h += '<div class="spinner"></div>';
    h += '<div class="webview-loader-text" id="webview-loader-text">Chargement de ' + displayName + '...</div>';
    h += '</div>';
    h += '<iframe class="webview-iframe" id="webview-iframe" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads" loading="lazy"></iframe>';
    h += '<div id="webview-error-container" style="display:none;"></div>';
    h += '</div>';
    h += '</div>';

    return h;
};

SectionWebview.init = async function(params) {
    var s = SectionWebview.section;
    if (!s || !s.site_url) return;

    SectionWebview.iframeLoaded = false;
    SectionWebview.usingProxy = false;

    var webviewPage = document.getElementById('webview-page');
    if (webviewPage && webviewPage.parentElement) document.body.appendChild(webviewPage);

    var appHeader = document.getElementById('app-header');
    var bottomNav = document.getElementById('bottom-nav');
    if (appHeader) appHeader.style.display = 'none';
    if (bottomNav) bottomNav.style.display = 'none';

    var iframe = document.getElementById('webview-iframe');
    if (!iframe) return;
    SectionWebview.iframe = iframe;

    // Si open_in_browser est coche dans l'admin → ouvrir directement dans le navigateur
    if (s.open_in_browser) {
        if (SectionWebview.loadTimeout) clearTimeout(SectionWebview.loadTimeout);
        var loader = document.getElementById('webview-loader');
        if (loader) loader.classList.add('hidden');
        window.open(s.site_url, '_blank');
        SectionWebview.cleanup();
        Router.navigate('/home');
        return;
    }

    // Etape 1 : essayer en direct dans l'iframe
    SectionWebview.tryDirect(s);

    window.addEventListener('message', SectionWebview.handleMessage);
    document.addEventListener('contextmenu', SectionWebview.blockContextMenu);

    try {
        await db.from('app_analytics').insert({
            event_type: 'webview_open',
            user_id: App.profile.id,
            section_id: s.id,
            metadata: { title: s.title }
        });
    } catch (e) {}
};

// ============================================
// ETAPE 1 : CHARGEMENT DIRECT
// ============================================

SectionWebview.tryDirect = function(s) {
    SectionWebview.usingProxy = false;
    SectionWebview.iframeLoaded = false;

    var iframe = document.getElementById('webview-iframe');
    var loader = document.getElementById('webview-loader');
    var loaderText = document.getElementById('webview-loader-text');
    var errorContainer = document.getElementById('webview-error-container');
    var subtitle = document.getElementById('webview-subtitle');

    if (errorContainer) errorContainer.style.display = 'none';
    if (iframe) iframe.style.display = 'block';
    if (loader) loader.classList.remove('hidden');
    if (loaderText) loaderText.textContent = 'Chargement...';
    if (subtitle) subtitle.textContent = 'AKOLABS Universe';
    if (SectionWebview.loadTimeout) clearTimeout(SectionWebview.loadTimeout);

    iframe.onload = function() {
        SectionWebview.iframeLoaded = true;
        if (loader) loader.classList.add('hidden');
        try {
            SectionWebview.injectCustomizations(iframe, s);
            SectionWebview.injectDownloadInterceptor(iframe);
        } catch(e) {
            SectionWebview.watchNavigation(iframe, s);
        }
    };

    iframe.onerror = function() {
        SectionWebview.tryProxy(s);
    };

    SectionWebview.loadTimeout = setTimeout(function() {
        if (!SectionWebview.iframeLoaded) {
            SectionWebview.tryProxy(s);
        }
    }, 8000);

    iframe.src = s.site_url;
};

// ============================================
// ETAPE 2 : PROXY RENDER (automatique)
// ============================================

SectionWebview.tryProxy = function(s) {
    SectionWebview.usingProxy = true;
    SectionWebview.iframeLoaded = false;

    var iframe = document.getElementById('webview-iframe');
    var loader = document.getElementById('webview-loader');
    var loaderText = document.getElementById('webview-loader-text');
    var errorContainer = document.getElementById('webview-error-container');
    var subtitle = document.getElementById('webview-subtitle');

    if (errorContainer) errorContainer.style.display = 'none';
    if (iframe) iframe.style.display = 'block';
    if (loader) loader.classList.remove('hidden');
    if (loaderText) loaderText.textContent = 'Chargement...';
    if (subtitle) subtitle.textContent = 'AKOLABS Universe';
    if (SectionWebview.loadTimeout) clearTimeout(SectionWebview.loadTimeout);
    if (SectionWebview._errorCheckTimeout) clearTimeout(SectionWebview._errorCheckTimeout);
    if (SectionWebview._downloadCheckInterval) {
        clearInterval(SectionWebview._downloadCheckInterval);
        SectionWebview._downloadCheckInterval = null;
    }

    var proxyUrl = SectionWebview.PROXY_URL + encodeURIComponent(s.site_url);

    iframe.onload = function() {
        SectionWebview.iframeLoaded = true;
        console.log('[WebView][PROXY] onload declenche');
        try {
            var iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            var bodyHTML = iframeDoc && iframeDoc.body ? iframeDoc.body.innerHTML.trim() : '';
            var pageTitle = iframeDoc ? iframeDoc.title : '';
            console.log('[WebView][PROXY] title:', pageTitle);
            console.log('[WebView][PROXY] body length:', bodyHTML.length);
            console.log('[WebView][PROXY] body preview:', bodyHTML.substring(0, 300));

            var isErrorPage = bodyHTML.length < 10
                || bodyHTML.indexOf("n'autorise pas") !== -1
                || bodyHTML.indexOf('ERR_') !== -1
                || bodyHTML.indexOf('refused to connect') !== -1
                || bodyHTML.indexOf('blocked') !== -1
                || (pageTitle && (
                    pageTitle.indexOf('ERR_') !== -1
                    || pageTitle.indexOf("n'autorise pas") !== -1
                ));

            console.log('[WebView][PROXY] isErrorPage:', isErrorPage);

            if (isErrorPage) {
                console.log('[WebView][PROXY] Echec → navigateur externe');
                SectionWebview.openExternal();
                return;
            }
            console.log('[WebView][PROXY] Succes !');
            if (loader) loader.classList.add('hidden');
            try { SectionWebview.injectCustomizations(iframe, s); } catch(e) {}
        } catch (e) {
            // Cross-origin via proxy : verifier l'URL finale
            console.log('[WebView][PROXY] Cross-origin catch:', e.message);
            try {
                var finalUrl = iframe.contentWindow.location.href;
                console.log('[WebView][PROXY] URL finale:', finalUrl);
                if (!finalUrl || finalUrl === 'about:blank') {
                    console.log('[WebView][PROXY] URL vide → navigateur externe');
                    SectionWebview.openExternal();
                    return;
                }
                // Via proxy l'URL sera celle du proxy - c'est normal = OK
                console.log('[WebView][PROXY] Cross-origin OK');
                if (loader) loader.classList.add('hidden');
            } catch (ex2) {
                console.log('[WebView][PROXY] URL inaccessible → navigateur externe');
                SectionWebview.openExternal();
            }
        }
    };

    iframe.onerror = function() {
        console.log('[WebView][PROXY] onerror → navigateur externe');
        SectionWebview.openExternal();
    };

    // 15 secondes pour le proxy (Render peut dormir)
    SectionWebview.loadTimeout = setTimeout(function() {
        if (!SectionWebview.iframeLoaded) {
            SectionWebview.openExternal();
        }
    }, 15000);

    iframe.src = proxyUrl;
};

// ============================================
// ETAPE 3 : NAVIGATEUR EXTERNE (automatique)
// Ouverture directe, sans message intermediaire
// ============================================

SectionWebview.openExternal = function() {
    var s = SectionWebview.section;
    if (!s || !s.site_url) return;

    if (SectionWebview.loadTimeout) clearTimeout(SectionWebview.loadTimeout);

    // Ouvrir directement dans le navigateur
    window.open(s.site_url, '_blank');

    // Revenir a l'accueil apres ouverture
    SectionWebview.cleanup();
    Router.navigate('/home');

    try {
        db.from('app_analytics').insert({
            event_type: 'webview_external',
            user_id: App.profile.id,
            section_id: s.id,
            metadata: { title: s.title }
        });
    } catch (e) {}
};

// ============================================
// MESSAGES DEPUIS L'IFRAME
// ============================================

SectionWebview.handleMessage = function(event) {
    if (!event.data) return;

    if (event.data.type === 'akolabs-download') {
        SectionWebview.startDownload(
            event.data.url || '',
            event.data.filename || '',
            SectionWebview.section
        );
        return;
    }

    if (event.data.type === 'akolabs-navigate') {
        var url = event.data.url;
        if (!url) return;
        var iframe = document.getElementById('webview-iframe');
        var loader = document.getElementById('webview-loader');
        if (loader) loader.classList.remove('hidden');
        if (iframe) {
            SectionWebview.iframeLoaded = false;
            iframe.src = SectionWebview.usingProxy
                ? SectionWebview.PROXY_URL + encodeURIComponent(url)
                : url;
        }
    }
};

// ============================================
// TELECHARGEMENT
// ============================================

SectionWebview.injectDownloadInterceptor = function(iframe) {
    try {
        var iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        if (!iframeDoc) return;
        var script = iframeDoc.createElement('script');
        script.textContent = [
            '(function(){',
            '  document.addEventListener("click",function(e){',
            '    var a=e.target.closest?e.target.closest("a"):null;',
            '    if(!a||!a.href)return;',
            '    var dl=a.getAttribute("download");',
            '    var isFile=/\\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|mp4|mp3|avi|mov|jpg|jpeg|png|gif|webp|apk|exe|dmg|7z)(\\?.*)?$/i.test(a.href);',
            '    if(dl!==null||isFile){',
            '      e.preventDefault();',
            '      window.parent.postMessage({type:"akolabs-download",url:a.href,filename:dl||""},"*");',
            '    }',
            '  },true);',
            '})();'
        ].join('\n');
        iframeDoc.head.appendChild(script);
    } catch (e) {}
};

SectionWebview.watchNavigation = function(iframe, s) {
    var last = '';
    SectionWebview._downloadCheckInterval = setInterval(function() {
        try {
            var href = iframe.contentWindow.location.href;
            if (href && href !== last && href !== 'about:blank') {
                last = href;
                var isFile = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|mp4|mp3|avi|mov|jpg|jpeg|png|gif|webp|apk|exe|dmg|7z)(\?.*)?$/i.test(href);
                if (isFile) SectionWebview.startDownload(href, '', s);
            }
        } catch (e) {}
    }, 600);
};

SectionWebview.startDownload = async function(url, suggestedName, s) {
    if (!url) return;
    var fileName = suggestedName;
    if (!fileName) {
        try {
            fileName = decodeURIComponent(new URL(url).pathname.split('/').pop()) || ('fichier_' + Date.now());
        } catch (e) { fileName = 'fichier_' + Date.now(); }
    }
    if (!fileName.includes('.')) fileName += '.pdf';

    SectionWebview.showDownloadBar(fileName);
    Utils.showToast('Telechargement de ' + fileName + '...', 'info', 2000);

    // Essayer d'abord en fetch direct, puis via proxy si CORS bloque
    var tryFetch = async function(fetchUrl) {
        var response = await fetch(fetchUrl, { mode: 'cors' });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response;
    };

    var doSave = async function(response) {
        var total = parseInt(response.headers.get('content-length') || '0', 10);
        var loaded = 0, chunks = [];
        var reader = response.body.getReader();
        while (true) {
            var part = await reader.read();
            if (part.done) break;
            chunks.push(part.value);
            loaded += part.value.length;
            SectionWebview.updateDownloadProgress(total > 0 ? Math.round((loaded / total) * 100) : -1);
        }
        var blob = new Blob(chunks);
        await FileStorage.saveFile({
            userId: App.profile.id,
            fileName: fileName,
            fileType: FileStorage.getFileCategory(fileName),
            fileSize: blob.size,
            mimeType: response.headers.get('content-type') || 'application/octet-stream',
            blob: blob,
            sectionId: s ? s.id : null,
            sectionTitle: s ? (s.custom_name || s.title) : ''
        });
        SectionWebview.hideDownloadBar();
        Utils.vibrate([50, 30, 50]);
        Utils.showToast('\u2705 ' + fileName + ' sauvegard\u00e9 dans Mes Fichiers !', 'success', 4000);
    };

    try {
        // Tentative 1 : fetch direct
        var resp = await tryFetch(url);
        await doSave(resp);
    } catch (err) {
        try {
            // Tentative 2 : via proxy Render pour contourner le CORS
            var proxyUrl = 'https://akolabs-proxy.onrender.com/proxy?url=' + encodeURIComponent(url);
            var resp2 = await tryFetch(proxyUrl);
            await doSave(resp2);
        } catch (err2) {
            // Échec total : ouvrir dans le navigateur
            SectionWebview.hideDownloadBar();
            Utils.showToast('Ouverture dans le navigateur...', 'info', 2000);
            window.open(url, '_blank');
        }
    }
};

SectionWebview.showDownloadBar = function(fileName) {
    var bar = document.getElementById('webview-download-bar');
    var nameEl = document.getElementById('webview-download-filename');
    var fillEl = document.getElementById('webview-download-fill');
    var pctEl = document.getElementById('webview-download-percent');
    if (nameEl) nameEl.textContent = fileName;
    if (fillEl) { fillEl.style.width = '0%'; fillEl.style.opacity = '1'; }
    if (pctEl) pctEl.textContent = '0%';
    if (bar) bar.style.display = 'flex';
};

SectionWebview.updateDownloadProgress = function(percent) {
    var fillEl = document.getElementById('webview-download-fill');
    var pctEl = document.getElementById('webview-download-percent');
    if (percent === -1) {
        if (fillEl) { fillEl.style.width = '65%'; fillEl.style.opacity = '0.7'; }
        if (pctEl) pctEl.textContent = '...';
    } else {
        if (fillEl) { fillEl.style.width = percent + '%'; fillEl.style.opacity = '1'; }
        if (pctEl) pctEl.textContent = percent + '%';
    }
};

SectionWebview.hideDownloadBar = function() {
    var bar = document.getElementById('webview-download-bar');
    if (!bar) return;
    bar.style.opacity = '0';
    setTimeout(function() { bar.style.display = 'none'; bar.style.opacity = '1'; }, 400);
};

// ============================================
// UTILITAIRES
// ============================================

SectionWebview.injectCustomizations = function(iframe, s) {
    try {
        var iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        if (!iframeDoc) return;
        var cssToInject = '';
        if (s.hidden_selectors && s.hidden_selectors.length > 0) {
            for (var i = 0; i < s.hidden_selectors.length; i++) cssToInject += s.hidden_selectors[i] + ' { display: none !important; } ';
        }
        if (s.css_overrides) cssToInject += s.css_overrides;
        if (cssToInject) {
            var style = iframeDoc.createElement('style');
            style.textContent = cssToInject;
            iframeDoc.head.appendChild(style);
        }
        if (s.js_overrides) {
            var script = iframeDoc.createElement('script');
            script.textContent = s.js_overrides;
            iframeDoc.body.appendChild(script);
        }
    } catch (e) {}
};

SectionWebview.refreshPage = function() {
    var s = SectionWebview.section;
    if (!s) return;
    SectionWebview.iframeLoaded = false;
    var errorContainer = document.getElementById('webview-error-container');
    if (errorContainer) errorContainer.style.display = 'none';
    Utils.vibrate(30);
    if (SectionWebview.usingProxy) {
        SectionWebview.tryProxy(s);
    } else {
        SectionWebview.tryDirect(s);
    }
};

SectionWebview.goBack = function() { SectionWebview.cleanup(); Router.navigate('/home'); };
SectionWebview.goHome = function() { SectionWebview.cleanup(); Router.navigate('/home'); };
SectionWebview.openFullscreen = SectionWebview.openExternal;

SectionWebview.cleanup = function() {
    if (SectionWebview.loadTimeout) clearTimeout(SectionWebview.loadTimeout);
    if (SectionWebview._errorCheckTimeout) clearTimeout(SectionWebview._errorCheckTimeout);
    if (SectionWebview._downloadCheckInterval) {
        clearInterval(SectionWebview._downloadCheckInterval);
        SectionWebview._downloadCheckInterval = null;
    }
    document.removeEventListener('contextmenu', SectionWebview.blockContextMenu);
    window.removeEventListener('message', SectionWebview.handleMessage);
    var iframe = document.getElementById('webview-iframe');
    if (iframe) iframe.src = 'about:blank';
    var page = document.getElementById('webview-page');
    if (page) page.remove();
    var appHeader = document.getElementById('app-header');
    var bottomNav = document.getElementById('bottom-nav');
    if (appHeader) appHeader.style.display = 'flex';
    if (bottomNav) bottomNav.style.display = 'flex';
};

SectionWebview.blockContextMenu = function(e) { e.preventDefault(); return false; };

SectionWebview.renderNoAccess = function(s) {
    return '<div style="text-align:center;padding:60px 20px;">'
        + '<div style="font-size:48px;color:#D4AF37;margin-bottom:16px;"><i class="fas fa-lock"></i></div>'
        + '<h2 style="font-family:Cinzel,serif;color:#D4AF37;font-size:20px;margin-bottom:8px;">Acc\u00e8s requis</h2>'
        + '<p style="color:#8E8E9E;font-size:14px;margin-bottom:24px;">D\u00e9bloquez cette section pour y acc\u00e9der.</p>'
        + '<button class="btn btn-primary btn-lg" onclick="Router.navigate(\'/section/' + s.id + '\')"><i class="fas fa-crown"></i> D\u00e9bloquer</button>'
        + '<button class="btn btn-secondary" style="margin-top:8px;" onclick="Router.navigate(\'/home\')"><i class="fas fa-home"></i> Retour</button></div>';
};

SectionWebview.renderError = function(msg) {
    return '<div style="text-align:center;padding:60px 20px;">'
        + '<div style="font-size:48px;color:#DC3545;margin-bottom:16px;"><i class="fas fa-exclamation-triangle"></i></div>'
        + '<h2 style="color:#F8F9FA;font-size:18px;margin-bottom:8px;">Erreur</h2>'
        + '<p style="color:#8E8E9E;font-size:14px;margin-bottom:24px;">' + msg + '</p>'
        + '<button class="btn btn-primary" onclick="Router.navigate(\'/home\')"><i class="fas fa-home"></i> Retour</button></div>';
};
