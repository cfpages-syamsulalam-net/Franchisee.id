// js/build-listing.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

// CONFIG
const TEMPLATE_PATH = path.join(__dirname, '../templates/peluang-usaha-tpl.html');
const OUTPUT_PATH = path.join(__dirname, '../peluang-usaha/index.html');
const TAB_FRANCHISOR = 'FRANCHISOR';
const TAB_UNCLAIMED = 'UNCLAIMED';

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

function normalizeText(value) {
    return (value || '').toString().replace(/\s+/g, ' ').trim();
}

function isUrlLike(text) {
    return /^(https?:\/\/|www\.)/i.test(text);
}

function isPhoneLike(text) {
    const raw = normalizeText(text);
    const digits = raw.replace(/\D/g, '');
    return digits.length >= 9 && digits.length <= 16 && (digits.length / Math.max(raw.length, 1)) > 0.6;
}

function isLikelyClaimBrandRow(item) {
    const brandName = normalizeText(item.brand_name);
    if (!brandName) return false;
    if (brandName.length < 2) return false;
    if (isUrlLike(brandName) || isPhoneLike(brandName)) return false;

    // Canonical UNCLAIMED rows generally carry one of these metadata fields.
    const hasEvidence =
        normalizeText(item.source_ignore) ||
        normalizeText(item.full_desc) ||
        normalizeText(item.company_name) ||
        normalizeText(item.phone) ||
        normalizeText(item.label);

    return Boolean(hasEvidence);
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

// HELPER: Load from CSV (Simple Parser)
function parseCSVRows(content) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;

    const input = (content || '').replace(/^\uFEFF/, '');

    for (let i = 0; i < input.length; i++) {
        const ch = input[i];
        const next = input[i + 1];

        if (ch === '"') {
            if (inQuotes && next === '"') {
                field += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }

        if (ch === ',' && !inQuotes) {
            row.push(field);
            field = '';
            continue;
        }

        if ((ch === '\n' || ch === '\r') && !inQuotes) {
            if (ch === '\r' && next === '\n') i++;
            row.push(field);
            field = '';
            if (row.some(cell => normalizeText(cell))) rows.push(row);
            row = [];
            continue;
        }

        field += ch;
    }

    if (field.length > 0 || row.length > 0) {
        row.push(field);
        if (row.some(cell => normalizeText(cell))) rows.push(row);
    }

    return rows;
}

function loadFromCSV(filePath) {
    if (!fs.existsSync(filePath)) return [];
    const content = fs.readFileSync(filePath, 'utf8');
    const rows = parseCSVRows(content);
    if (rows.length < 2) return [];

    const headers = rows[0].map(h => normalizeText(h));

    return rows.slice(1).map(values => {
        let obj = {};
        headers.forEach((h, i) => {
            obj[h] = normalizeText(values[i] || '');
        });
        return obj;
    }).filter(i => i.brand_name);
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
    const tier = (item.status || 'UNCLAIMED').toUpperCase();
    let badge = '';
    
    if (tier === 'VERIFIED') {
        badge = `<i class="fas fa-check-circle" style="color:#2980b9; margin-left:4px;" title="Verified"></i>`;
    } else if (tier === 'UNCLAIMED') {
        badge = `<span style="font-size: 10px; background: #eee; color: #777; padding: 1px 5px; border-radius: 3px; margin-left: 5px; font-weight: normal; vertical-align: middle;">Belum Diklaim</span>`;
    }

    const modal = formatRupiah(item.total_investment_value || item.min_capital);

    // HTML Structure (PERSIS ELEMENTOR)
    return `
    <div id="uc_post_grid_elementor_d0f4a5f_item${index}" class="uc_post_grid_style_one_item ue_post_grid_item ue-item ${tier.toLowerCase()}-tier">
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
                        <div class="uc_btn_inner"><div class="uc_btn_txt">${tier === 'UNCLAIMED' ? 'Klaim Brand' : 'Info Franchise'}</div></div>
                    </a>
                </div>
            </div>
        </div>
    </div>`;
}

// MAIN BUILDER
async function build() {
    console.log('🚀 Building Hybrid Franchise Listing (SSG)...');
    let dataFranchisor = [];
    let dataUnclaimed = [];

    try {
        const privateKey = (process.env.G_PRIVATE_KEY || '').replace(/\\n/g, '\n');
        const auth = new google.auth.JWT(process.env.G_CLIENT_EMAIL, null, privateKey, ['https://www.googleapis.com/auth/spreadsheets.readonly']);
        const sheets = google.sheets({ version: 'v4', auth });

        // 1. Fetch FRANCHISOR
        const resFranchisor = await sheets.spreadsheets.values.get({ 
            spreadsheetId: process.env.G_SHEET_ID, 
            range: `${TAB_FRANCHISOR}!A1:ZZ1000` 
        });
        if (resFranchisor.data.values) {
            const headers = resFranchisor.data.values[0].map(h => h.trim());
            dataFranchisor = resFranchisor.data.values.slice(1).map(row => {
                let obj = {}; headers.forEach((h, i) => obj[h] = row[i] || ''); return obj;
            }).filter(i => i.brand_name);
        }

        // 2. Fetch UNCLAIMED
        const resUnclaimed = await sheets.spreadsheets.values.get({ 
            spreadsheetId: process.env.G_SHEET_ID, 
            range: `${TAB_UNCLAIMED}!A1:ZZ1000` 
        });
        if (resUnclaimed.data.values) {
            const headers = resUnclaimed.data.values[0].map(h => h.trim());
            dataUnclaimed = resUnclaimed.data.values.slice(1).map(row => {
                let obj = {}; headers.forEach((h, i) => obj[h] = row[i] || ''); return obj;
            }).filter(i => i.brand_name);
        }

    } catch (e) {
        console.warn('⚠️ Google Sheets API Failed. Attempting local CSV fallback...');
        dataFranchisor = loadFromCSV(path.join(__dirname, '../franchisors.csv'));
        dataUnclaimed = loadFromCSV(path.join(__dirname, '../unclaimed.csv'));
        console.log(`✅ Loaded from CSV: ${dataFranchisor.length} franchisors, ${dataUnclaimed.length} unclaimed.`);
    }

    // Normalize Unclaimed status
    dataUnclaimed.forEach(item => {
        item.status = 'UNCLAIMED';
        if (!item.short_desc && item.full_desc) {
            item.short_desc = item.full_desc.replace(/<[^>]*>?/gm, '').substring(0, 100).trim() + '...';
        }
    });

    // --- NEW: Generate Autocomplete JSON for Unclaimed ---
    const seenClaimBrands = new Set();
    const autocompleteData = dataUnclaimed
        .filter(isLikelyClaimBrandRow)
        .map(i => ({
            id: i.id || slugify(i.brand_name),
            brand_name: normalizeText(i.brand_name),
            category: normalizeText(i.category),
            min_capital: normalizeText(i.min_capital)
        }))
        .filter(i => {
            const key = i.brand_name.toLowerCase();
            if (seenClaimBrands.has(key)) return false;
            seenClaimBrands.add(key);
            return true;
        });
    const DATA_DIR = path.join(__dirname, '../data');
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(path.join(DATA_DIR, 'unclaimed-brands.json'), JSON.stringify(autocompleteData));
    console.log(`✅ Generated data/unclaimed-brands.json (${autocompleteData.length} brands).`);

    // 3. Merge All
    const allData = [...dataFranchisor, ...dataUnclaimed];

    // 4. Sort Strategy
    const tierWeights = { 'VERIFIED': 3, 'FREE': 2, 'UNCLAIMED': 1 };
    allData.sort((a, b) => {
        const weightA = tierWeights[(a.status || 'UNCLAIMED').toUpperCase()] || 0;
        const weightB = tierWeights[(b.status || 'UNCLAIMED').toUpperCase()] || 0;
        if (weightB !== weightA) return weightB - weightA;
        return a.brand_name.localeCompare(b.brand_name);
    });

    const gridHtml = allData.map((item, i) => generateCard(item, i + 1)).join('');
    
    try {
        let tpl = fs.readFileSync(TEMPLATE_PATH, 'utf8');
        if (!tpl.includes('<!-- DYNAMIC_FRANCHISE_LISTING -->')) throw new Error('Placeholder not found');
        
        const outDir = path.dirname(OUTPUT_PATH);
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

        fs.writeFileSync(OUTPUT_PATH, tpl.replace('<!-- DYNAMIC_FRANCHISE_LISTING -->', gridHtml));
        console.log(`✅ Success! Generated ${allData.length} listings (Hybrid).`);
    } catch (err) {
        console.error('❌ Build Error:', err);
        process.exit(1);
    }
}

build();
