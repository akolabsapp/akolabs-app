// ============================================
// PARTNER CONFIG — Système Partenaire AKOLABS
// Remplacer toutes les valeurs XXXXXXXXXX
// ============================================

const CONFIG = {
    APP_VERSION: '1.0.0',
    APP_NAME: 'AKOLABS',
    TEST_MODE: false,

    // ── SUPABASE (Projet séparé du partenaire) ──
    // Créer sur https://supabase.com → New Project
    SUPABASE_URL: 'SUPABASE_URL_PARTENAIRE',
    SUPABASE_ANON_KEY: 'SUPABASE_ANON_KEY_PARTENAIRE',

    // ── EMAILJS (Même compte que AKOLABS principal) ──
    EMAILJS_PUBLIC_KEY: 'Mq1BDoeRayGXaxxlE',
    EMAILJS_SERVICE_ID: 'service_5pk5del',
    EMAILJS_TEMPLATE_WELCOME: 'template_cv1s60p',
    EMAILJS_TEMPLATE_RECEIPT: 'template_a9dv0cj',

    // ── FEEXPAY (Partenaire crée ses propres clés) ──
    FEEXPAY_TOKEN: 'FEEXPAY_TOKEN_PARTENAIRE',
    FEEXPAY_STORE: 'FEEXPAY_STORE_PARTENAIRE',
    FEEXPAY_CURRENCY: 'XOF',

    // ── CHARIOW — Liens de paiement par plan ──
    // Le partenaire crée ces liens et les envoie
    CHARIOW_LINKS: {
        starter: 'CHARIOW_LINK_STARTER_1000F',   // Remplacer
        pro:     'CHARIOW_LINK_PRO_1500F',        // Remplacer
        premium: 'CHARIOW_LINK_PREMIUM_3500F'     // Remplacer
    },

    // ── URL du site partenaire ──
    SITE_URL: 'https://partner.akolabs.store',
    LANDING_URL: '/app-store/',

    // ── CLOUDINARY (Même compte) ──
    CLOUDINARY_CLOUD: 'dtowyvewa',
    CLOUDINARY_PRESET: 'akolabs_uploads',

    // ── PRIX DES PLANS ──
    PLANS: {
        starter: { price: 1000, months: null,  label: 'Starter',  type: 'starter_access' },
        pro:     { price: 1500, months: 1,     label: 'Pro',      type: 'pro_access' },
        premium: { price: 3500, months: 3,     label: 'Premium',  type: 'premium_access' }
    },

    // ── WHATSAPP SUPPORT ──
    WHATSAPP_NUMBER: '2290155956693',

    // ── AFFILIATE ──
    AFFILIATE_COMMISSION_PERCENT: 10,

    // ── IDENTIFIANT PARTENAIRE (pour ton suivi admin) ──
    PARTNER_ID: 'partner_001',
    PARTNER_NAME: 'Partenaire AKOLABS'
};

// Initialiser Supabase
const { createClient } = supabase;

// Base du PARTENAIRE — utilisateurs, achats, accès
const db = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

// Base AKOLABS PRINCIPAL — contenu partagé (sections, screenshots, flash sales)
// Lecture seule — les sections sont gérées par AKOLABS principal
const dbContent = createClient(
    'https://cwjnjmawjcphtajfzlod.supabase.co',
    'sb_publishable_UJ_ykbUaJsnBqKzgvbSmoQ_scUnivc8'
);

// Initialiser EmailJS
if (typeof emailjs !== 'undefined') {
    emailjs.init(CONFIG.EMAILJS_PUBLIC_KEY);
}
