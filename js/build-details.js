require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

// --- CONFIG ---
const TEMPLATE_PATH = path.join(__dirname, '../templates/detail-franchise-tpl.html');
const OUTPUT_DIR = path.join(__dirname, '../peluang-usaha');
const TAB_FRANCHISOR = 'FRANCHISOR';
const TAB_UNCLAIMED = 'UNCLAIMED';

// --- HELPERS ---
function slugify(text) {
    if (!text) return '';
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

function formatRupiah(angka) {
    if (!angka) return 'Tanya Admin';
    let num = parseFloat(angka.toString().replace(/[^0-9]/g, ''));
    if (isNaN(num) || num === 0) return 'Tanya Admin';
    if (num >= 1000000000) return (num / 1000000000).toFixed(1) + ' Miliar';
    if (num >= 1000000) return (num / 1000000).toFixed(0) + ' Juta';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
}

// --- PHASE 4 HELPERS ---

function generateJSONLD(item, slug) {
    const schema = {
        "@context": "https://schema.org",
        "@type": "Brand",
        "name": item.brand_name,
        "description": item.short_desc || `Peluang bisnis franchise ${item.brand_name}`,
        "url": `https://franchisee.id/peluang-usaha/${slug}`,
        "logo": item.logo_url || "https://franchisee.id/wp-content/uploads/2025/09/franchise.id-favicon-logo.png",
        "category": item.category || "Franchise"
    };
    return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
}

function generateBreadcrumbs(item) {
    const category = item.category || 'Bisnis';
    const catSlug = slugify(category);
    return `
    <nav class="ast-breadcrumbs" aria-label="Breadcrumbs">
        <div class="ast-breadcrumbs-wrapper">
            <span class="trail-browse">Anda di sini:</span>
            <ul class="trail-items">
                <li class="trail-item"><a href="/">Home</a></li>
                <li class="trail-item"><a href="/peluang-usaha">Peluang Usaha</a></li>
                <li class="trail-item"><a href="/category/${catSlug}">${category}</a></li>
                <li class="trail-item"><span>${item.brand_name}</span></li>
            </ul>
        </div>
    </nav>
    <style>
        .ast-breadcrumbs { margin-bottom: 20px; font-size: 13px; color: #777; }
        .ast-breadcrumbs a { color: #2980b9; }
        .trail-items { display: inline; list-style: none; padding: 0; }
        .trail-item { display: inline; }
        .trail-item:after { content: " » "; margin: 0 5px; color: #ccc; }
        .trail-item:last-child:after { content: ""; }
    </style>`;
}

function generateStickyBar(item, slug, tier) {
    if (tier !== 'UNCLAIMED') return '';
    return `
    <div id="claim-sticky-bar" style="position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 2px solid #ffc107; padding: 15px; z-index: 9999; box-shadow: 0 -5px 15px rgba(0,0,0,0.1); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <div style="flex: 1; min-width: 250px;">
            <strong style="display: block; color: #333;">Apakah ini Bisnis Anda?</strong>
            <span style="font-size: 13px; color: #666;">Klaim brand <strong>${item.brand_name}</strong> secara GRATIS untuk mengelola halaman ini.</span>
        </div>
        <a href="/daftar?claim=${slug}" style="background: #ffc107; color: #000; padding: 10px 25px; border-radius: 50px; font-weight: bold; text-decoration: none; box-shadow: 0 4px 10px rgba(255,193,7,0.3); transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">KLAIM SEKARANG</a>
    </div>
    <style>
        body { padding-bottom: 80px !important; }
        @media (max-width: 600px) {
            #claim-sticky-bar { text-align: center; justify-content: center; }
            #claim-sticky-bar div { text-align: center; }
        }
    </style>`;
}

// --- MAIN BUILDER ---
async function build() {
    console.log('🚀 Building Detail Pages (Hybrid)...');
    try {
        const privateKey = (process.env.G_PRIVATE_KEY || '').replace(/\\n/g, '\n');
        const auth = new google.auth.JWT(process.env.G_CLIENT_EMAIL, null, privateKey, ['https://www.googleapis.com/auth/spreadsheets.readonly']);
        const sheets = google.sheets({ version: 'v4', auth });

        // 1. Fetch Data
        const resFranchisor = await sheets.spreadsheets.values.get({ spreadsheetId: process.env.G_SHEET_ID, range: `${TAB_FRANCHISOR}!A1:ZZ1000` });
        const resUnclaimed = await sheets.spreadsheets.values.get({ spreadsheetId: process.env.G_SHEET_ID, range: `${TAB_UNCLAIMED}!A1:ZZ1000` });

        const headersF = resFranchisor.data.values[0].map(h => h.trim());
        const dataF = resFranchisor.data.values.slice(1).map(row => {
            let obj = {}; headersF.forEach((h, i) => obj[h] = row[i] || ''); return obj;
        }).filter(i => i.brand_name);

        const headersU = resUnclaimed.data.values[0].map(h => h.trim());
        const dataU = resUnclaimed.data.values.slice(1).map(row => {
            let obj = {}; headersU.forEach((h, i) => obj[h] = row[i] || ''); return obj;
        }).filter(i => i.brand_name);

        // Merge All
        const allData = [...dataF.map(i => ({...i, _tier: i.status || 'FREE'})), ...dataU.map(i => ({...i, _tier: 'UNCLAIMED'}))];

        const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
        let total = 0;

        for (const item of allData) {
            const slug = slugify(item.brand_name);
            const tier = item._tier.toUpperCase();
            
            let html = template;
            
            // Replacements
            const replacements = {
                '{BRAND_NAME}': item.brand_name,
                '{SLUG}': slug,
                '{CATEGORY}': item.category || 'Bisnis Umum',
                '{CATEGORY-SLUG}': slugify(item.category || 'Bisnis Umum'),
                '{COMPANY_NAME}': item.company_name || 'Hubungi Admin',
                '{MINIMUM_MODAL}': formatRupiah(item.total_investment_value || item.min_capital),
                '{FRANCHISE_FEE}': item.fee_license ? formatRupiah(item.fee_license) : 'Tanya Admin',
                '{ROYALTY_FEE}': item.royalty_percent ? `${item.royalty_percent}%` : 'Tanya Admin',
                '{YEAR_ESTABLISHED}': item.year_established || '-',
                '{OUTLETS_NUMBER}': item.total_outlets || '-',
                '{BEP_PERIOD}': item.bep_period || 'Tanya Admin',
                '{ADVERTISING_FEE}': item.fee_marketing || 'Tanya Admin',
                '{LONG_DESCRIPTION}': item.full_desc || `Peluang usaha franchise ${item.brand_name}.`,
                '{LOGO_URL}': item.logo_url || '/wp-content/uploads/woocommerce-placeholder.png',
                '{HERO_IMAGE}': item.cover_url || item.logo_url || '',
                '{OG_IMAGE}': item.logo_url || '',
                '{SEO_TITLE}': `Franchise ${item.brand_name} - Info Modal & Peluang Usaha 2026`,
                '{SEO_DESCRIPTION}': `Cek modal dan biaya franchise ${item.brand_name}. Dapatkan profil lengkap, syarat jadi mitra, dan kontak resmi franchisor ${item.brand_name} di Franchise.id.`,
                '{VERIFIED_ICON}': tier === 'VERIFIED' ? '<i class="fas fa-check-circle franchise-verified-badge" title="Verified Brand"></i>' : '',
                '{JSON_LD}': generateJSONLD(item, slug),
                '{BREADCRUMBS}': generateBreadcrumbs(item),
                '{CLAIM_STICKY_BAR}': generateStickyBar(item, slug, tier)
            };

            // Dynamic Disclaimer
            let disclaimer = '';
            if (tier === 'UNCLAIMED') {
                disclaimer = `
                <div class="disclaimer-box">
                    <i class="fas fa-info-circle me-2"></i>
                    <strong>Halaman Belum Diklaim:</strong> Informasi ini dikumpulkan dari sumber publik. Jika Anda pemilik brand ini, silakan <a href="/daftar?claim=${slug}">klaim halaman ini</a> untuk memperbarui data.
                </div>`;
            }
            html = html.replace('<!-- DYNAMIC_DISCLAIMER_BOX -->', disclaimer);

            // Dynamic Tabs Logic
            let tabsHtml = `
            <div class="e-n-tabs" data-widget-number="26009074">
                <div class="e-n-tabs-heading" role="tablist">
                    <button class="e-n-tab-title" aria-selected="true" data-tab-index="1" role="tab">Profil</button>
                    <button class="e-n-tab-title" aria-selected="false" data-tab-index="2" role="tab">Kontak</button>
                </div>
                <div class="e-n-tabs-content">
                    <div class="e-n-tab-content e-active" data-tab-index="1">
                        <div class="elementor-widget-container">${item.full_desc || 'Deskripsi segera diperbarui.'}</div>
                    </div>
                    <div class="e-n-tab-content" data-tab-index="2">
                        <div class="elementor-widget-container">
                            ${tier === 'UNCLAIMED' ? '<p>Kontak belum tersedia. Silakan gunakan tombol Klaim untuk memverifikasi kepemilikan.</p>' : `<p>Silakan hubungi tim acquisition untuk informasi lebih lanjut.</p>`}
                        </div>
                    </div>
                </div>
            </div>`;
            html = html.replace('{DYNAMIC_TABS_CONTENT}', tabsHtml);

            // Run replacements
            Object.keys(replacements).forEach(key => {
                const regex = new RegExp(key, 'g');
                html = html.replace(regex, replacements[key]);
            });

            // Write File
            const itemDir = path.join(OUTPUT_DIR, slug);
            if (!fs.existsSync(itemDir)) fs.mkdirSync(itemDir, { recursive: true });
            fs.writeFileSync(path.join(itemDir, 'index.html'), html);
            total++;
        }

        console.log(`✅ TOTAL BUILT: ${total} detail pages generated.`);

    } catch (e) {
        console.error('❌ Error:', e);
        process.exit(1);
    }
}

build();