// ============================================
// AKOLABS - Configuration
// ============================================

var CONFIG = {
    // ---- SUPABASE ----
    SUPABASE_URL: 'https://cwjnjmawjcphtajfzlod.supabase.co',
    SUPABASE_ANON_KEY: 'sb_publishable_UJ_ykbUaJsnBqKzgvbSmoQ_scUnivc8',

    // ---- CLOUDINARY ----
    CLOUDINARY_CLOUD_NAME: 'dtowyvewa',
    CLOUDINARY_UPLOAD_PRESET: 'akolabs_uploads',

    // ---- PAIEMENT — 100% via Supabase Edge Functions --------
    // ⚠️  NE JAMAIS mettre de clés secrètes ici !
    // Toutes les clés sont dans Supabase → Edge Functions → Secrets :
    //   FEEXPAY_TOKEN, FEEXPAY_STORE, GP_SECRET_KEY, GP_API_BASE,
    //   RESEND_API_KEY, EMAIL_FROM, SUPABASE_SERVICE_KEY
    PAYMENT_EDGE_FN:  'https://cwjnjmawjcphtajfzlod.supabase.co/functions/v1/create-payment',
    EMAIL_EDGE_FN:    'https://cwjnjmawjcphtajfzlod.supabase.co/functions/v1/send-email',
    FEEXPAY_CALLBACK_URL: 'https://akolabs.store/',
    FEEXPAY_CURRENCY: 'XOF',

    // ---- Pays routés vers FeexPay (les autres → GeniusPay) ----
    FEEXPAY_COUNTRIES: ['BJ', 'CI', 'TG', 'SN'],

    // ---- Indicatifs téléphoniques par pays ----
    COUNTRY_DIAL_CODES: {
        'BJ': { name: 'Bénin',          flag: '🇧🇯', dial: '+229' },
        'CI': { name: "Côte d'Ivoire",  flag: '🇨🇮', dial: '+225' },
        'TG': { name: 'Togo',           flag: '🇹🇬', dial: '+228' },
        'SN': { name: 'Sénégal',        flag: '🇸🇳', dial: '+221' },
        'CM': { name: 'Cameroun',       flag: '🇨🇲', dial: '+237' },
        'BF': { name: 'Burkina Faso',   flag: '🇧🇫', dial: '+226' },
        'ML': { name: 'Mali',           flag: '🇲🇱', dial: '+223' },
        'NE': { name: 'Niger',          flag: '🇳🇪', dial: '+227' },
        'GN': { name: 'Guinée',         flag: '🇬🇳', dial: '+224' },
        'CD': { name: 'RDC',            flag: '🇨🇩', dial: '+243' },
        'CG': { name: 'Congo',          flag: '🇨🇬', dial: '+242' },
        'GA': { name: 'Gabon',          flag: '🇬🇦', dial: '+241' },
        'MA': { name: 'Maroc',          flag: '🇲🇦', dial: '+212' },
        'DZ': { name: 'Algérie',        flag: '🇩🇿', dial: '+213' },
        'TN': { name: 'Tunisie',        flag: '🇹🇳', dial: '+216' },
        'MG': { name: 'Madagascar',     flag: '🇲🇬', dial: '+261' },
        'RW': { name: 'Rwanda',         flag: '🇷🇼', dial: '+250' },
        'MR': { name: 'Mauritanie',     flag: '🇲🇷', dial: '+222' },
        'TD': { name: 'Tchad',          flag: '🇹🇩', dial: '+235' }
    },

    // ---- EMAILJS ----
    EMAILJS_PUBLIC_KEY: 'Mq1BDoeRayGXaxxlE',
    EMAILJS_SERVICE_ID: 'service_5pk5del',
    EMAILJS_TEMPLATE_WELCOME: 'template_cv1s60p',
    EMAILJS_TEMPLATE_RECEIPT: 'template_a9dv0cj',

    // ---- MODE TEST ----
    TEST_MODE: false,

    // ---- APP ----
    APP_NAME: 'AKOLABS',
    APP_VERSION: '1.0.0',
    APP_DESCRIPTION: 'Votre arsenal digital premium',

    // ---- PLANS D'ABONNEMENT ----
    PLANS: {
        free_trial: {
            id: 'free_trial',
            name: 'Essai Gratuit',
            price: 0,
            durationDays: 30,
            fullAccess: false
        },
        monthly: {
            id: 'monthly',
            name: 'Mensuel',
            price: 3500,
            durationMonths: 1,
            fullAccess: true
        },
        quarterly: {
            id: 'quarterly',
            name: 'Trimestriel',
            price: 7500,
            durationMonths: 3,
            fullAccess: true
        }
    },

    // ---- Plans LEGACY (anciens membres — ne pas modifier) ----
    LEGACY_PLANS: ['lifetime', 'starter', 'pro', 'premium'],

    // ---- SECTIONS ----
    UNIVERSE_TITLE: 'AKOLABS Universe',
    UNIVERSE_SUBTITLE: 'Accedez a des outils digitaux premium exclusifs',
    LEARNING_TITLE: 'AKOLABS Learning',
    LEARNING_SUBTITLE: 'Formations completes pour maitriser le digital',

    // ---- AFFILIATION ----
    AFFILIATE_COMMISSION_PERCENT: 10,
    AFFILIATE_DISCOUNT_PERCENT: 10,

    // ---- AVATAR PAR DEFAUT ----
    DEFAULT_AVATAR: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#6A1B9A"/><circle cx="50" cy="38" r="16" fill="#D4AF37"/><ellipse cx="50" cy="78" rx="28" ry="22" fill="#D4AF37"/></svg>'),

    // ---- LANDING PAGE ----
    LANDING_URL: '/app-store/',
    APP_PRICE: 3500,

    // ---- LIMITES ----
    MAX_LOGIN_ATTEMPTS: 5,
    SESSION_CHECK_INTERVAL: 60000
};

// ---- Initialisation Supabase ----
var db;
try {
    db = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    console.log('[CONFIG] Supabase initialise');
} catch (e) {
    console.error('[CONFIG] Erreur Supabase:', e);
}

// ---- Helper : détecter si un plan est legacy ----
function isLegacyPlan(plan) {
    if (!plan) return false;
    return CONFIG.LEGACY_PLANS.indexOf(plan) !== -1 || plan.indexOf('expired_') === 0;
}

// ---- Helper : détecter si un plan donne accès complet ----
function planHasFullAccess(plan) {
    if (!plan) return false;
    // Anciens membres : toujours accès complet
    if (isLegacyPlan(plan)) return true;
    // Nouveaux plans
    var p = CONFIG.PLANS[plan];
    return p ? p.fullAccess : false;
}
