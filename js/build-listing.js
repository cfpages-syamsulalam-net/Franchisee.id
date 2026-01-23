// js/build-listing.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

// CONFIG
const TEMPLATE_PATH = path.join(__dirname, '../templates/peluang-usaha-tpl.html');
const OUTPUT_PATH = path.join(__dirname, '../peluang-usaha/index.html');
const SHEET_TAB = 'FRANCHISOR';

// HELPER: Slugify
function slugify(text) {
    if (!text) return '';
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

// HELPER: Format Rupiah (Juta/Miliar)
function formatRupiah(angka) {
    if (!angka) return 'Tanya Admin';
    let num = parseFloat(angka.toString().replace(/[^0-9]/g, ''));
    if (isNaN(num) || num === 0) return 'Tanya Admin';
    if (num >= 1000000000) return (num / 1000000000).toFixed(1) + ' Miliar';
    if (num >= 1000000) return (num / 1000000).toFixed(0) + ' Juta';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
}

// HELPER: Cloudinary Thumbnail (Biar ringan)
function getThumb(url) {
    if (!url || !url.includes('cloudinary.com')) return '/wp-content/uploads/woocommerce-placeholder.png'; // Fallback
    return url.replace('/upload/', '/upload/w_400,h_200,c_fill,q_auto,f_auto/');
}

// GENERATOR: HTML Card
function generateCard(item, index) {
    const slug = slugify(item.brand_name);
    const link = `/peluang-usaha/${slug}`;
    const imgUrl = getThumb(item.cover_url || item.logo_url);
    const kategori = item.category || 'Bisnis Umum';
    
    // Deskripsi pendek (max 90 chars)
    let desc = item.short_desc || `Peluang usaha franchise ${item.brand_name}.`;
    if (desc.length > 90) desc = desc.substring(0, 90) + '...';

    // Tiering Logic
    const isVerified = (item.status || '').toUpperCase() === 'VERIFIED';
    const badge = isVerified ? `<i class="fas fa-check-circle" style="color:#2980b9; margin-left:4px;" title="Verified"></i>` : '';
    const modal = formatRupiah(item.total_investment_value || item.fee_capex);

    // HTML Structure (PERSIS ELEMENTOR)
    return `
    <div id="uc_post_grid_elementor_d0f4a5f_item${index}" class="uc_post_grid_style_one_item ue_post_grid_item ue-item">
        <a class="uc_post_grid_style_one_image" href="${link}">
            <div class="uc_post_image">
                <img loading="lazy" src="${imgUrl}" alt="${item.brand_name}" width="300" height="150">
                <div class="uc_post_image_overlay"></div>
            </div>
        </a>
        <div class="uc_content">
            <div class="uc_content_inner">
                <div class="uc_content-info-wrapper">
                    <div class="uc_post_title">
                        <a href="${link}" class="ue_p_title" style="display:flex; align-items:center;">
                            ${item.brand_name} ${badge}
                        </a>
                    </div>
                    <div class="ue-meta-data">
                        <span class="ue-grid-item-category">
                            <a href="/kategori/${slugify(kategori)}">${kategori}</a>
                        </span>
                        <span style="font-size:11px; color:#666; display:block; width:100%; margin-top:5px;">
                            Modal: <b>${modal}</b>
                        </span>
                    </div>
                    <div class="uc_post_text">${desc}</div>
                </div>
                <div class="uc_post_button">
                    <a class="uc_more_btn" href="${link}">
                        <div class="uc_btn_inner"><div class="uc_btn_txt">Info Franchise</div></div>
                    </a>
                </div>
            </div>
        </div>
    </div>`;
}

// MAIN BUILDER
async function build() {
    console.log('🚀 Building Franchise Listing...');
    try {
        const privateKey = process.env.G_PRIVATE_KEY.replace(/\\n/g, '\n');
        const auth = new google.auth.JWT(process.env.G_CLIENT_EMAIL, null, privateKey, ['https://www.googleapis.com/auth/spreadsheets.readonly']);
        const sheets = google.sheets({ version: 'v4', auth });

        const res = await sheets.spreadsheets.values.get({ spreadsheetId: process.env.G_SHEET_ID, range: `${SHEET_TAB}!A1:ZZ1000` });
        if (!res.data.values) throw new Error('No data found');

        const headers = res.data.values[0].map(h => h.trim());
        const data = res.data.values.slice(1).map(row => {
            let obj = {}; headers.forEach((h, i) => obj[h] = row[i] || ''); return obj;
        }).filter(i => i.brand_name); // Filter kosong

        // Sort: Verified First
        data.sort((a, b) => (b.status === 'VERIFIED') - (a.status === 'VERIFIED'));

        const gridHtml = data.map((item, i) => generateCard(item, i + 1)).join('');
        
        let tpl = fs.readFileSync(TEMPLATE_PATH, 'utf8');
        if (!tpl.includes('<!-- DYNAMIC_FRANCHISE_LISTING -->')) throw new Error('Placeholder not found');
        
        // Output Directory Check
        const outDir = path.dirname(OUTPUT_PATH);
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

        fs.writeFileSync(OUTPUT_PATH, tpl.replace('<!-- DYNAMIC_FRANCHISE_LISTING -->', gridHtml));
        console.log(`✅ Success! Generated ${data.length} listings.`);

    } catch (e) {
        console.error('❌ Build Failed:', e);
        process.exit(1);
    }
}

build();