// ============================================
// AKOLABS - MODULE PUSH NOTIFICATIONS
// ============================================

var Push = {
    _swRegistration: null,
    _subscription: null,
    // Clé publique VAPID - à remplacer par ta vraie clé
    VAPID_PUBLIC_KEY: 'BFA6bR4SQOuOvgBnkkzV6B9rAulQBtrZE65i1DYmfnnu-xCiOFOyCLIILaqi81oWibziTtuHN590FUy--vXoFGA'
};

// Convertir clé VAPID base64 en Uint8Array
Push._urlBase64ToUint8Array = function(base64String) {
    var padding = '='.repeat((4 - base64String.length % 4) % 4);
    var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    var rawData = window.atob(base64);
    var outputArray = new Uint8Array(rawData.length);
    for (var i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
};

// Vérifier si les push sont supportés
Push.isSupported = function() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
};

// Initialiser — appeler au démarrage de l'app
Push.init = async function() {
    if (!Push.isSupported()) {
        console.log('[Push] Non supporté sur cet appareil');
        return;
    }

    try {
        // Récupérer le SW enregistré
        Push._swRegistration = await navigator.serviceWorker.ready;
        console.log('[Push] SW prêt');

        // Vérifier si déjà souscrit
        Push._subscription = await Push._swRegistration.pushManager.getSubscription();

        if (Push._subscription) {
            console.log('[Push] Déjà souscrit, sync avec Supabase...');
            await Push._saveSubscription(Push._subscription);
        } else {
            // Demander permission après 5 secondes si pas encore accordée
            var perm = Notification.permission;
            if (perm === 'default') {
                setTimeout(Push.requestPermission, 5000);
            } else if (perm === 'granted') {
                await Push.subscribe();
            }
        }

        // Mettre à jour last_seen_at
        Push._updateLastSeen();

    } catch(e) {
        console.error('[Push] Erreur init:', e);
    }
};

// Demander la permission à l'utilisateur
Push.requestPermission = async function() {
    if (!Push.isSupported()) return false;

    try {
        var perm = await Notification.requestPermission();
        console.log('[Push] Permission:', perm);

        if (perm === 'granted') {
            await Push.subscribe();
            return true;
        }
        return false;
    } catch(e) {
        console.error('[Push] Erreur permission:', e);
        return false;
    }
};

// S'abonner aux push
Push.subscribe = async function() {
    if (!Push._swRegistration) {
        Push._swRegistration = await navigator.serviceWorker.ready;
    }

    try {
        Push._subscription = await Push._swRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: Push._urlBase64ToUint8Array(Push.VAPID_PUBLIC_KEY)
        });

        console.log('[Push] Souscription créée');
        await Push._saveSubscription(Push._subscription);
        return true;
    } catch(e) {
        console.error('[Push] Erreur subscribe:', e);
        return false;
    }
};

// Se désabonner
Push.unsubscribe = async function() {
    if (!Push._subscription) return;
    try {
        await Push._subscription.unsubscribe();
        // Supprimer de Supabase
        await db.from('push_subscriptions')
            .update({ is_active: false })
            .eq('endpoint', Push._subscription.endpoint);
        Push._subscription = null;
        console.log('[Push] Désabonné');
    } catch(e) {
        console.error('[Push] Erreur unsubscribe:', e);
    }
};

// Sauvegarder la subscription dans Supabase
Push._saveSubscription = async function(subscription) {
    try {
        var userId = App.user && App.user.id ? App.user.id : null;
        if (!userId) return;

        var keys = subscription.toJSON().keys || {};

        await db.from('push_subscriptions').upsert({
            user_id: userId,
            endpoint: subscription.endpoint,
            p256dh: keys.p256dh || '',
            auth: keys.auth || '',
            device_info: navigator.userAgent.substring(0, 100),
            is_active: true,
            updated_at: new Date().toISOString()
        }, { onConflict: 'endpoint' });

        // Marquer push_enabled sur le profil
        await db.from('users')
            .update({ push_enabled: true })
            .eq('id', userId);

        console.log('[Push] Subscription sauvegardée');
    } catch(e) {
        console.error('[Push] Erreur save subscription:', e);
    }
};

// Mettre à jour last_seen_at
Push._updateLastSeen = async function() {
    try {
        if (App.user && App.user.id) {
            await db.from('users')
                .update({ last_seen_at: new Date().toISOString() })
                .eq('id', App.user.id);
        }
    } catch(e) {}
};

// État actuel (pour affichage dans le profil)
Push.getStatus = function() {
    if (!Push.isSupported()) return 'unsupported';
    var perm = Notification.permission;
    if (perm === 'denied') return 'denied';
    if (perm === 'granted' && Push._subscription) return 'enabled';
    return 'disabled';
};
