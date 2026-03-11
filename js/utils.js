// ============================================
// AKOLABS - Utilitaires
// ============================================

const Utils = {

    // ---- DEVICE FINGERPRINT ----
    async getDeviceId() {
        // Verifier si un ID est deja stocke
        var storedId = localStorage.getItem('akolabs_device_id');
        if (storedId) {
            return storedId;
        }

        // Generer un nouvel ID unique pour cet appareil
        var components = [];

        try {
            components.push(navigator.userAgent || '');
            components.push(screen.width + 'x' + screen.height);
            components.push(navigator.language || '');
            components.push(navigator.platform || '');
            components.push(new Date().getTimezoneOffset().toString());
        } catch(e) {}

        var raw = components.join('|||') + '|||' + Date.now() + '|||' + Math.random();

        // Simple hash
        var hash = 0;
        for (var i = 0; i < raw.length; i++) {
            var char = raw.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }

        var deviceId = 'DEV-' + Math.abs(hash).toString(36).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();

        // Stocker pour toujours sur cet appareil
        localStorage.setItem('akolabs_device_id', deviceId);

        return deviceId;
    },
    // ---- TOAST NOTIFICATIONS ----
    showToast(message, type = 'info', duration = 3500) {
        // Supprimer les toasts existants
        document.querySelectorAll('.toast').forEach(t => t.remove());

        const icons = {
            success: 'fa-check-circle',
            error: 'fa-times-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas ${icons[type] || icons.info}"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(toast);

        // Force reflow then animate
        toast.offsetHeight;
        requestAnimationFrame(() => toast.classList.add('show'));

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, duration);
    },

    // ---- FORMATAGE ----
    formatPrice(amount) {
        if (amount === 0) return 'Gratuit';
        return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
    },

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    },

    formatDateTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    },

    timeAgo(dateString) {
        const now = new Date();
        const date = new Date(dateString);
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return 'À l\'instant';
        if (seconds < 3600) return Math.floor(seconds / 60) + ' min';
        if (seconds < 86400) return Math.floor(seconds / 3600) + ' h';
        if (seconds < 604800) return Math.floor(seconds / 86400) + ' j';
        return this.formatDate(dateString);
    },

    // ---- VALIDATION ----
    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },

    isValidPhone(phone) {
        return /^[\+]?[0-9]{8,15}$/.test(phone.replace(/[\s\-]/g, ''));
    },

    // ---- CODE GÉNÉRATION ----
    generateAffiliateCode(userId) {
        const prefix = 'AKO';
        const short = userId.replace(/-/g, '').substring(0, 6).toUpperCase();
        return `${prefix}-${short}`;
    },

    generateRandomCode(length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },

    // ---- DEBOUNCE & THROTTLE ----
    debounce(func, wait = 300) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    },

    throttle(func, limit = 300) {
        let inThrottle;
        return function (...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // ---- TEXT ----
    truncate(text, maxLength = 100) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    },

    slugify(text) {
        return text.toLowerCase()
            .replace(/[àáâãäå]/g, 'a')
            .replace(/[èéêë]/g, 'e')
            .replace(/[ìíîï]/g, 'i')
            .replace(/[òóôõö]/g, 'o')
            .replace(/[ùúûü]/g, 'u')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    },

    // ---- HAPTIC FEEDBACK ----
    vibrate(pattern = 50) {
        if ('vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    },

    // ---- CONFETTI ----
    showConfetti() {
        const container = document.createElement('div');
        container.className = 'confetti-container';
        document.body.appendChild(container);

        const colors = ['#D4AF37', '#4B0082', '#F8F9FA', '#E0C868', '#6A1B9A'];

        for (let i = 0; i < 60; i++) {
            const piece = document.createElement('div');
            piece.className = 'confetti-piece';
            piece.style.left = Math.random() * 100 + '%';
            piece.style.animationDelay = Math.random() * 2 + 's';
            piece.style.animationDuration = (Math.random() * 2 + 2) + 's';
            piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
            piece.style.width = (Math.random() * 8 + 6) + 'px';
            piece.style.height = (Math.random() * 8 + 6) + 'px';
            container.appendChild(piece);
        }

        setTimeout(() => container.remove(), 4000);
    },

    // ---- BOTTOM SHEET ----
    openBottomSheet(contentHTML) {
        // Supprimer si déjà ouvert
        this.closeBottomSheet();

        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop';
        backdrop.id = 'modal-backdrop';
        backdrop.onclick = () => this.closeBottomSheet();

        const sheet = document.createElement('div');
        sheet.className = 'bottom-sheet';
        sheet.id = 'bottom-sheet';
        sheet.innerHTML = `
            <div class="bottom-sheet-handle"></div>
            <div class="bottom-sheet-content">${contentHTML}</div>
        `;

        document.body.appendChild(backdrop);
        document.body.appendChild(sheet);

        // Animate in
        requestAnimationFrame(() => {
            backdrop.classList.add('active');
            sheet.classList.add('active');
        });
    },

    closeBottomSheet() {
        const backdrop = document.getElementById('modal-backdrop');
        const sheet = document.getElementById('bottom-sheet');
        if (backdrop) {
            backdrop.classList.remove('active');
            setTimeout(() => backdrop.remove(), 300);
        }
        if (sheet) {
            sheet.classList.remove('active');
            setTimeout(() => sheet.remove(), 400);
        }
    },

    // ---- COUNTDOWN ----
    startCountdown(targetDate, elementId) {
        const update = () => {
            const el = document.getElementById(elementId);
            if (!el) return;

            const now = new Date().getTime();
            const target = new Date(targetDate).getTime();
            const diff = target - now;

            if (diff <= 0) {
                el.innerHTML = '<span class="text-error">Promo expirée</span>';
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const secs = Math.floor((diff % (1000 * 60)) / 1000);

            el.innerHTML = `
                <i class="fas fa-clock"></i>
                <div class="countdown-block">
                    <span class="countdown-value">${String(days).padStart(2, '0')}</span>
                    <span class="countdown-label">Jours</span>
                </div>
                <span class="countdown-sep">:</span>
                <div class="countdown-block">
                    <span class="countdown-value">${String(hours).padStart(2, '0')}</span>
                    <span class="countdown-label">Heures</span>
                </div>
                <span class="countdown-sep">:</span>
                <div class="countdown-block">
                    <span class="countdown-value">${String(mins).padStart(2, '0')}</span>
                    <span class="countdown-label">Min</span>
                </div>
                <span class="countdown-sep">:</span>
                <div class="countdown-block">
                    <span class="countdown-value">${String(secs).padStart(2, '0')}</span>
                    <span class="countdown-label">Sec</span>
                </div>
            `;

            requestAnimationFrame(() => setTimeout(update, 1000));
        };

        update();
    },

    // ---- SKELETON LOADING ----
    skeleton(type = 'card') {
        const templates = {
            card: `
                <div class="card" style="padding: var(--space-base);">
                    <div class="skeleton skeleton-image"></div>
                    <div class="skeleton skeleton-title"></div>
                    <div class="skeleton skeleton-text"></div>
                    <div class="skeleton skeleton-text short"></div>
                </div>
            `,
            list: `
                <div style="display:flex;gap:12px;align-items:center;padding:12px 0;">
                    <div class="skeleton skeleton-avatar"></div>
                    <div style="flex:1;">
                        <div class="skeleton skeleton-text" style="width:70%;"></div>
                        <div class="skeleton skeleton-text short" style="margin-bottom:0;"></div>
                    </div>
                </div>
            `,
            formation: `
                <div class="formation-card">
                    <div class="skeleton" style="width:90px;height:90px;border-radius:var(--radius-md);"></div>
                    <div style="flex:1;">
                        <div class="skeleton skeleton-text" style="width:80%;"></div>
                        <div class="skeleton skeleton-text short"></div>
                        <div class="skeleton skeleton-button" style="margin-top:8px;"></div>
                    </div>
                </div>
            `
        };
        return templates[type] || templates.card;
    },

    // ---- COPIER DANS LE PRESSE-PAPIERS ----
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showToast('Copié !', 'success', 2000);
            this.vibrate(50);
            return true;
        } catch (e) {
            // Fallback
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            textarea.remove();
            this.showToast('Copié !', 'success', 2000);
            return true;
        }
    },

    // ---- PARTAGE ----
    share(title, text, url) {
        if (navigator.share) {
            navigator.share({ title, text, url }).catch(() => { });
        } else {
            this.copyToClipboard(url);
        }
    },

        shareOnWhatsApp: function(text) {
        var decoded = decodeURIComponent(text);
        var encoded = encodeURIComponent(decoded);
        window.open('https://wa.me/?text=' + encoded, '_blank');
    },

        shareOnTelegram: function(text) {
        var decoded = decodeURIComponent(text);
        var encoded = encodeURIComponent(decoded);
        window.open('https://t.me/share/url?url=' + encoded, '_blank');
    }, // <----- LA VIRGULE EST TRÈS IMPORTANTE ICI !

    // ---- UPLOAD CLOUDINARY ----
    // ---- CLOUDINARY : URL optimisée auto (f_auto, q_auto) ----
    // Transforme n'importe quelle URL Cloudinary en version optimisée + lazy
    cloudinaryOptimize: function(url, opts) {
        if (!url || url.indexOf('res.cloudinary.com') === -1) return url;
        opts = opts || {};
        var w = opts.w ? ',w_' + opts.w : '';
        var h = opts.h ? ',h_' + opts.h : '';
        var crop = (opts.w || opts.h) ? ',c_fill' : '';
        var transforms = 'f_auto,q_auto' + w + h + crop;
        // Insérer les transforms avant /upload/
        return url.replace('/upload/', '/upload/' + transforms + '/');
    },

    uploadToCloudinary: async function(file) {
        return new Promise(async function(resolve, reject) {
            if (!file) {
                reject('Aucun fichier selectionne');
                return;
            }

            var formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', CONFIG.CLOUDINARY_UPLOAD_PRESET);

            var resourceType = file.type.indexOf('video/') === 0 ? 'video' : 'image';
            var url = 'https://api.cloudinary.com/v1_1/' + CONFIG.CLOUDINARY_CLOUD_NAME + '/' + resourceType + '/upload';

            try {
                var response = await fetch(url, {
                    method: 'POST',
                    body: formData
                });
                var data = await response.json();

                if (data.secure_url) {
                    resolve(data.secure_url);
                } else {
                    reject(data.error ? data.error.message : 'Erreur d\'upload');
                }
            } catch (e) {
                console.error('[Cloudinary] Erreur:', e);
                reject(e);
            }
        });
    },
    
        // ---- ENVOI D'EMAILS (EMAILJS) ----
    sendEmail: async function(templateId, templateParams) {
        return new Promise(function(resolve, reject) {
            if (typeof emailjs === 'undefined') {
                console.error('[EmailJS] Librairie non chargee');
                reject('EmailJS non charge');
                return;
            }

            emailjs.send(
                CONFIG.EMAILJS_SERVICE_ID,
                templateId,
                templateParams,
                CONFIG.EMAILJS_PUBLIC_KEY
            ).then(function(response) {
                console.log('[EmailJS] Email envoye avec succes!', response.status, response.text);
                resolve(response);
            }, function(error) {
                console.error('[EmailJS] Erreur d\'envoi:', error);
                reject(error);
            });
        });
    }
}; // <----- FIN DU FICHIER