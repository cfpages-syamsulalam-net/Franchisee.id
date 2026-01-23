require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

// --- CONFIG ---
const TEMPLATE_PATH = path.join(__dirname, '../templates/detail-franchise-tpl.html');
const OUTPUT_BASE = path.join(__dirname, '../peluang-usaha');
const SHEET_TAB = 'FRANCHISOR';

// --- HELPER FUNCTIONS ---

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
    if (num >= 1000000000) return 'Rp ' + (num / 1000000000).toFixed(1) + ' Miliar';
    if (num >= 1000000) return 'Rp ' + (num / 1000000).toFixed(0) + ' Juta';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
}

function optimizeImg(url, width = 800) {
    if (!url || !url.includes('cloudinary.com')) return '/wp-content/uploads/2025/09/franchise-placeholder.jpg'; // Ganti dengan path placeholder defaultmu
    // Auto format f_auto (webp/avif) dan resize
    return url.replace('/upload/', `/upload/w_${width},c_limit,q_auto,f_auto/`);
}

// --- HTML GENERATORS (ELEMENTOR STRUCTURE) ---

// 1. Generate Tab Content: PROFIL
function getTabProfil(data) {
    const desc = data.full_desc || data.short_desc || 'Belum ada deskripsi lengkap.';
    // Convert newlines to <br>
    const formattedDesc = desc.replace(/\n/g, '<br>');
    
    // Gallery Logic (Ambil dari column gallery_urls, pisah koma)
    let galleryHtml = '';
    if(data.gallery_urls) {
        const images = data.gallery_urls.split(',').map(u => u.trim()).slice(0, 4); // Max 4 foto
        images.forEach(img => {
            galleryHtml += `<img decoding="async" src="${optimizeImg(img, 600)}" style="width:100%; margin-bottom:10px; border-radius:8px;">`;
        });
    }

    return `
    <div class="elementor-element elementor-widget elementor-widget-text-editor">
        <div class="elementor-widget-container">
            <p>${formattedDesc}</p>
            <div style="margin-top:20px;">${galleryHtml}</div>
        </div>
    </div>`;
}

// 2. Generate Tab Content: KONTAK (Logic Tiering Disini!)
function getTabKontak(data, isVerified) {
    if (!isVerified) {
        // TAMPILAN UNTUK FREE / UNCLAIMED MEMBER
        return `
        <div class="elementor-element elementor-widget elementor-widget-text-editor">
            <div class="elementor-widget-container" style="background:#fff3cd; padding:20px; border-radius:10px; border:1px solid #ffeeba; text-align:center;">
                <h4 style="color:#856404; margin-bottom:10px;">🔒 Kontak Dibatasi</h4>
                <p style="margin-bottom:15px;">Informasi kontak langsung pemilik franchise ini hanya tersedia untuk member terverifikasi. Silakan hubungi <strong>Admin Franchise.id</strong> untuk perantara.</p>
                <a href="/kontak-kami" class="elementor-button elementor-size-sm" style="background:#d35400; color:#fff; text-decoration:none; padding:10px 20px; border-radius:5px;">
                    Hubungi Admin
                </a>
            </div>
        </div>`;
    }

    // TAMPILAN UNTUK VERIFIED MEMBER (Data Asli)
    const phone = data.whatsapp || data.phone || '-';
    const email = data.email_contact || '-';
    const website = data.website_url || '-';
    
    // Helper function buat item kontak (biar kodingan rapi)
    const iconItem = (icon, title, value, link = null) => `
    <div class="elementor-element elementor-widget elementor-widget-icon-box" style="margin-bottom: 15px;">
        <div class="elementor-widget-container">
            <div class="elementor-icon-box-wrapper" style="display:flex; align-items:center;">
                <div class="elementor-icon-box-icon" style="margin-right:15px;">
                    <span class="elementor-icon" style="color:var(--ast-global-color-0); font-size:24px;">
                        <i class="${icon}"></i>
                    </span>
                </div>
                <div class="elementor-icon-box-content">
                    <h6 class="elementor-icon-box-title" style="margin:0; font-size:14px; color:#999;">${title}</h6>
                    <p class="elementor-icon-box-description" style="margin:0; font-weight:bold; color:#000;">
                        ${link ? `<a href="${link}" target="_blank" rel="nofollow">${value}</a>` : value}
                    </p>
                </div>
            </div>
        </div>
    </div>`;

    return `
    <div class="elementor-element elementor-widget">
        <div class="elementor-widget-container">
            <p>Silakan menghubungi pihak franchisor melalui kontak berikut:</p>
            ${iconItem('fas fa-building', 'Perusahaan', data.company_name || '-')}
            ${iconItem('fab fa-whatsapp', 'WhatsApp / Telepon', phone, `https://wa.me/${phone.replace(/[^0-9]/g, '')}`)}
            ${iconItem('fas fa-envelope', 'Email', email, `mailto:${email}`)}
            ${iconItem('fas fa-globe', 'Website', website, website)}
        </div>
    </div>`;
}

// 3. Generate HTML Full Tabs
function generateTabsHtml(data, isVerified) {
    const tabProfil = getTabProfil(data);
    const tabOutlet = `<div class="elementor-widget-container"><p>Lokasi outlet belum tersedia di peta.</p></div>`; // Placeholder Outlet
    const tabKontak = getTabKontak(data, isVerified);

    // Structure Elementor Nested Tabs (Simplified but compatible)
    return `
    <div class="e-n-tabs" data-widget-number="tabs-${data.id}" aria-label="Tabs">
        <div class="e-n-tabs-heading" role="tablist">
            <button id="tab-title-1" class="e-n-tab-title" aria-selected="true" data-tab-index="1" role="tab" onclick="openTab(event, 'tab-content-1')">
                <span class="e-n-tab-title-text">Profil Franchise</span>
            </button>
            <button id="tab-title-2" class="e-n-tab-title" aria-selected="false" data-tab-index="2" role="tab" onclick="openTab(event, 'tab-content-2')">
                <span class="e-n-tab-title-text">Kontak</span>
            </button>
        </div>
        <div class="e-n-tabs-content">
            <div id="tab-content-1" role="tabpanel" class="e-active elementor-element e-con" style="display:block;">
                ${tabProfil}
            </div>
            <div id="tab-content-2" role="tabpanel" class="elementor-element e-con" style="display:none;">
                ${tabKontak}
            </div>
        </div>
    </div>
    
    <!-- Script Kecil untuk Handle Klik Tab di halaman statis -->
    <script>
    function openTab(evt, tabName) {
        var i, tabcontent, tablinks;
        // Hide all contents
        var container = evt.currentTarget.closest('.e-n-tabs');
        var contents = container.querySelectorAll('[role="tabpanel"]');
        contents.forEach(el => el.style.display = "none");

        // Deactivate all buttons
        var buttons = container.querySelectorAll('.e-n-tab-title');
        buttons.forEach(el => {
            el.setAttribute('aria-selected', 'false');
            el.style.background = 'transparent'; // Reset style
        });

        // Show current
        document.getElementById(tabName).style.display = "block";
        evt.currentTarget.setAttribute('aria-selected', 'true');
        evt.currentTarget.style.background = '#fff'; // Active style
    }
    </script>
    <style>
        .e-n-tabs-heading { display: flex; gap: 10px; border-bottom: 1px solid #ddd; margin-bottom: 20px; }
        .e-n-tab-title { background: none; border: none; padding: 15px 20px; cursor: pointer; font-weight: bold; font-family: inherit; font-size: 16px; border-bottom: 3px solid transparent; }
        .e-n-tab-title[aria-selected="true"] { border-bottom-color: var(--ast-global-color-0); color: var(--ast-global-color-0); }
    </style>
    `;
}

// --- MAIN BUILDER ---
async function build() {
    console.log('🚀 [SSG] Starting Detail Page Generator...');

    try {
        // 1. Auth & Fetch Data
        const privateKey = process.env.G_PRIVATE_KEY.replace(/\\n/g, '\n');
        const auth = new google.auth.JWT(process.env.G_CLIENT_EMAIL, null, privateKey, ['https://www.googleapis.com/auth/spreadsheets.readonly']);
        const sheets = google.sheets({ version: 'v4', auth });
        
        const res = await sheets.spreadsheets.values.get({ spreadsheetId: process.env.G_SHEET_ID, range: `${SHEET_TAB}!A1:ZZ2000` });
        const headers = res.data.values[0].map(h => h.trim());
        const rawData = res.data.values.slice(1).map(row => {
            let obj = {}; headers.forEach((h, i) => obj[h] = row[i] || ''); return obj;
        }).filter(i => i.brand_name);

        // 2. Read Template
        if (!fs.existsSync(TEMPLATE_PATH)) throw new Error(`Template not found: ${TEMPLATE_PATH}`);
        const tpl = fs.readFileSync(TEMPLATE_PATH, 'utf8');

        // 3. Generate Loop
        let count = 0;
        for (const data of rawData) {
            const slug = slugify(data.brand_name);
            if (!slug) continue;
            
            const isVerified = (data.status || '').toUpperCase() === 'VERIFIED';
            
            // MAP DATA TO PLACEHOLDERS
            let content = tpl
                .replace(/{SEO_TITLE}/g, `${data.brand_name} - Peluang Usaha & Franchise`)
                .replace(/{SEO_DESCRIPTION}/g, (data.short_desc || '').substring(0, 150))
                .replace(/{SLUG}/g, slug)
                .replace(/{BRAND_NAME}/g, data.brand_name)
                .replace(/{CATEGORY}/g, data.category || 'Bisnis Umum')
                .replace(/{CATEGORY-SLUG}/g, slugify(data.category || 'umum'))
                .replace(/{COMPANY_NAME}/g, data.company_name || '-')
                .replace(/{MINIMUM_MODAL}/g, formatRupiah(data.total_investment_value || data.fee_capex))
                .replace(/{FRANCHISE_FEE}/g, formatRupiah(data.fee_license))
                .replace(/{ROYALTY_FEE}/g, data.royalty_percent ? data.royalty_percent + '%' : '-')
                .replace(/{ADVERTISING_FEE}/g, '-') // Default strip
                .replace(/{YEAR_ESTABLISHED}/g, data.year_established || '-')
                .replace(/{OUTLETS_NUMBER}/g, data.outlet_total || '-')
                .replace(/{BEP_PERIOD}/g, (data.estimated_bep_months || '?') + ' Bulan')
                .replace(/{LOGO_URL}/g, optimizeImg(data.logo_url, 400))
                .replace(/{HERO_IMAGE}/g, optimizeImg(data.cover_url, 1200))
                .replace(/{OG_IMAGE}/g, optimizeImg(data.cover_url, 800));

            // Logic Badge Verified
            const verifiedHtml = isVerified ? 
                `<i class="fas fa-check-circle" style="color:#3867d6; font-size:20px; margin-left:10px;" title="Verified Franchise"></i>` : '';
            content = content.replace(/{VERIFIED_ICON}/g, verifiedHtml);

            // Logic Disclaimer (Unclaimed)
            const disclaimerHtml = !isVerified ? `
                <div class="disclaimer-box" style="background:#fff3cd; color:#856404; padding:15px; margin-bottom:20px; border:1px solid #ffeeba; border-radius:5px;">
                    <i class="fas fa-exclamation-triangle"></i> <strong>Perhatian:</strong> 
                    Listing ini belum diverifikasi secara resmi oleh Franchise.id. Data disediakan oleh pemilik/publik. Hati-hati terhadap penipuan.
                    <a href="/pendaftaran?claim=${slug}" style="text-decoration:underline; font-weight:bold;">Apakah ini bisnis Anda? Klaim Disini.</a>
                </div>` : '';
            content = content.replace('<!-- DYNAMIC_DISCLAIMER_BOX -->', disclaimerHtml);

            // Logic Complex Tabs
            const tabsHtml = generateTabsHtml(data, isVerified);
            content = content.replace('{DYNAMIC_TABS_CONTENT}', tabsHtml);

            // Write File
            const outDir = path.join(OUTPUT_BASE, slug);
            if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
            fs.writeFileSync(path.join(outDir, 'index.html'), content);
            
            count++;
        }

        console.log(`✅ Detail Pages Built: ${count} pages created.`);

    } catch (e) {
        console.error('❌ Build Details Failed:', e);
        process.exit(1);
    }
}

build();