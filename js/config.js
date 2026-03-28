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

    // ---- FEDAPAY ----
    FEDAPAY_PUBLIC_KEY: 'pk_live_8ED9T2BTMV6yBgEc2X8K9YqS',
    FEDAPAY_ENV: 'live',
    FEDAPAY_CURRENCY: 'XOF',
    
        // ---- EMAILJS (Emails automatiques) ----
    EMAILJS_PUBLIC_KEY: 'Mq1BDoeRayGXaxxlE',
    EMAILJS_SERVICE_ID: 'service_5pk5del',
    EMAILJS_TEMPLATE_WELCOME: 'template_cv1s60p', // On va le créer juste après
    EMAILJS_TEMPLATE_RECEIPT: 'template_a9dv0cj', // On va le créer juste après

    // ---- MODE TEST ----
    TEST_MODE: true,

    // ---- APP ----
    APP_NAME: 'AKOLABS',
    APP_VERSION: '1.0.0',
    APP_DESCRIPTION: 'Votre arsenal digital premium',

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
    APP_PRICE: 5000,

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
